"""
PneumoVision AI — Patient Management API
POST   /patient/create           — Register a new patient
PUT    /patient/update/{id}      — Update patient details
DELETE /patient/delete/{id}      — Soft-delete a patient
GET    /patient/list             — Paginated patient list with search
GET    /patient/{id}             — Get single patient with full history
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user, escape_regex
from app.database.connection import get_db
from app.database.models import AuditLogDocument, PatientDocument
from app.schemas.schemas import (
    OKResponse,
    PatientCreate,
    PatientListResponse,
    PatientOut,
    PatientUpdate,
)

logger = logging.getLogger("pneumovision.api.patients")
router = APIRouter(prefix="/patient", tags=["Patient Management"])

_PAT_COUNTER_KEY = "patient_id_counter"


async def _next_patient_id(db) -> str:
    """Generate a sequential patient ID: PAT001, PAT002, …"""
    result = await db["counters"].find_one_and_update(
        {"_id": _PAT_COUNTER_KEY},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = result["seq"]
    return f"PAT{seq:04d}"


def _scoped_patient_query(patient_id: str, current_user: dict) -> dict:
    """Build access-controlled query for a single patient."""
    query: dict = {"patient_id": patient_id, "is_deleted": {"$ne": True}}
    role = current_user.get("role", "doctor")
    hospital_id = current_user.get("hospital_id")

    if role == "super_admin":
        return query
    if role in ["state_admin", "hospital_admin", "admin"]:
        if hospital_id:
            query["hospital_id"] = hospital_id
    else:
        if hospital_id:
            query["hospital_id"] = hospital_id
        else:
            query["doctor_id"] = current_user["sub"]
    return query


def _serialize(doc: dict) -> PatientOut:
    return PatientOut(
        id=str(doc["_id"]),
        patient_id=doc["patient_id"],
        full_name=doc["full_name"],
        age=doc["age"],
        gender=doc["gender"],
        phone=doc["phone"],
        email=doc["email"],
        address=doc.get("address", ""),
        medical_history=doc.get("medical_history", ""),
        symptoms=doc.get("symptoms", []),
        doctor_id=doc["doctor_id"],
        doctor_name=doc["doctor_name"],
        hospital_id=doc.get("hospital_id"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("/create", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
async def create_patient(
    payload: PatientCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Register a new patient. Auto-generates a sequential patient ID."""
    # Check for duplicate email
    if await db["patients"].find_one({"email": payload.email}):
        raise HTTPException(status_code=409, detail="A patient with this email already exists.")

    patient_id = await _next_patient_id(db)
    doc = PatientDocument.create(
        patient_id=patient_id,
        full_name=payload.full_name,
        age=payload.age,
        gender=payload.gender,
        phone=payload.phone,
        email=str(payload.email),
        doctor_id=current_user["sub"],
        doctor_name=current_user.get("full_name", current_user.get("username", "")),
        symptoms=payload.symptoms,
        address=payload.address,
        medical_history=payload.medical_history,
        hospital_id=current_user.get("hospital_id"),
    )
    await db["patients"].insert_one(doc)
    await db[AuditLogDocument.collection].insert_one(
        AuditLogDocument.create(
            user_id=current_user["sub"],
            action="CREATE",
            resource="patient",
            resource_id=patient_id,
        )
    )
    logger.info("Patient created: %s by %s", patient_id, current_user.get("username"))
    return _serialize(doc)


@router.put("/update/{patient_id}", response_model=PatientOut)
async def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Update an existing patient's details."""
    query = _scoped_patient_query(patient_id, current_user)
    patient = await db["patients"].find_one(query)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found or unauthorized.")

    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No update fields provided.")

    updates["updated_at"] = datetime.utcnow()
    await db["patients"].update_one(query, {"$set": updates})
    await db[AuditLogDocument.collection].insert_one(
        AuditLogDocument.create(
            user_id=current_user["sub"],
            action="UPDATE",
            resource="patient",
            resource_id=patient_id,
            details={"fields": list(updates.keys())},
        )
    )
    updated = await db["patients"].find_one(query)
    return _serialize(updated)


@router.delete("/delete/{patient_id}", response_model=OKResponse)
async def delete_patient(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a patient record (soft delete with authorization)."""
    role = current_user.get("role", "doctor")
    if role not in ["super_admin", "state_admin", "hospital_admin", "admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Permission denied to delete patient records.")

    query = _scoped_patient_query(patient_id, current_user)
    result = await db["patients"].update_one(
        query, 
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found or unauthorized.")
    await db[AuditLogDocument.collection].insert_one(
        AuditLogDocument.create(
            user_id=current_user["sub"],
            action="DELETE",
            resource="patient",
            resource_id=patient_id,
        )
    )
    logger.info("Patient deleted: %s", patient_id)
    return OKResponse(message=f"Patient {patient_id} deleted successfully.")


@router.get("/list", response_model=PatientListResponse)
async def list_patients(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Paginated list of patients with optional full-text search.
    Admins see all patients; doctors see only their own.
    """
    query: dict = {}

    role = current_user.get("role", "doctor")
    hospital_id = current_user.get("hospital_id")

    if role == "super_admin":
        pass  # Super admin sees all patients globally
    elif role in ["state_admin", "hospital_admin", "admin"]:
        if hospital_id:
            query["hospital_id"] = hospital_id
    else:
        # Clinical staff see only their own patients for now
        query["doctor_id"] = current_user["sub"]
        
    query["is_deleted"] = {"$ne": True}

    # Search across name, email, phone, patient_id (escaped to prevent ReDoS)
    if search:
        safe_search = escape_regex(search)
        query["$or"] = [
            {"full_name": {"$regex": safe_search, "$options": "i"}},
            {"email": {"$regex": safe_search, "$options": "i"}},
            {"phone": {"$regex": safe_search, "$options": "i"}},
            {"patient_id": {"$regex": safe_search, "$options": "i"}},
        ]

    total = await db["patients"].count_documents(query)
    skip = (page - 1) * limit
    cursor = db["patients"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return PatientListResponse(
        total=total,
        page=page,
        limit=limit,
        patients=[_serialize(d) for d in docs],
    )


@router.get("/{patient_id}", response_model=dict)
async def get_patient(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a single patient's full profile including prediction history."""
    query = _scoped_patient_query(patient_id, current_user)
    patient = await db["patients"].find_one(query)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found or unauthorized.")

    # Fetch prediction history
    pred_cursor = db["predictions"].find(
        {"patient_id": patient_id, "is_deleted": {"$ne": True}}
    ).sort("created_at", -1)
    predictions = await pred_cursor.to_list(length=50)

    for p in predictions:
        p["_id"] = str(p["_id"])
        if "created_at" in p:
            p["created_at"] = p["created_at"].isoformat()

    serialized = _serialize(patient).model_dump()
    serialized["predictions"] = predictions
    serialized["prediction_count"] = len(predictions)
    return serialized
