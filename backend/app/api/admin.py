"""
PneumoVision AI — Admin Management API
POST   /admin/doctors              — Admin adds a new doctor
GET    /admin/doctors              — Admin lists all registered doctors
DELETE /admin/doctors/{user_id}    — Admin deactivates a doctor account
PUT    /admin/doctors/{user_id}/reactivate — Admin reactivates a doctor account
GET    /admin/stats                — System-wide administrative stats
"""

from __future__ import annotations

import logging
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import hash_password, require_admin
from app.database.connection import get_db
from app.database.models import AuditLogDocument, UserDocument, to_id_query
from app.schemas.schemas import OKResponse, RegisterRequest, UserOut

logger = logging.getLogger("pneumovision.api.admin")
router = APIRouter(prefix="/admin", tags=["Admin Operations"])


def _serialize_user(doc: dict) -> UserOut:
    return UserOut(
        id=str(doc["_id"]),
        username=doc["username"],
        email=doc["email"],
        full_name=doc["full_name"],
        role=doc["role"],
        department=doc.get("department", ""),
        phone=doc.get("phone", ""),
        is_active=doc.get("is_active", True),
        created_at=doc.get("created_at", datetime.utcnow()),
    )


@router.post("/doctors", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def add_doctor(
    payload: RegisterRequest,
    current_admin: dict = Depends(require_admin),
    db=Depends(get_db),
):
    """Admin endpoint to add a new doctor account to the system."""
    if await db["users"].find_one({"email": payload.email}):
        raise HTTPException(status_code=409, detail="Email already registered.")
    if await db["users"].find_one({"username": payload.username}):
        raise HTTPException(status_code=409, detail="Username already taken.")

    creator_role = current_admin.get("role", "admin")
    if creator_role == "super_admin":
        allowed_roles = ["super_admin", "state_admin", "hospital_admin", "radiologist", "doctor", "technician", "receptionist", "admin"]
    elif creator_role == "state_admin":
        allowed_roles = ["hospital_admin", "radiologist", "doctor", "technician", "receptionist"]
    else:
        allowed_roles = ["radiologist", "doctor", "technician", "receptionist"]

    if payload.role not in allowed_roles:
        raise HTTPException(status_code=403, detail=f"Permission denied to create role: {payload.role}")
        
    creator_hospital_id = current_admin.get("hospital_id")
    hospital_id_to_assign = payload.hospital_id
    
    if creator_role == "hospital_admin":
        if not creator_hospital_id:
             raise HTTPException(status_code=400, detail="Hospital Admin has no associated hospital_id.")
        if payload.hospital_id and payload.hospital_id != creator_hospital_id:
             raise HTTPException(status_code=403, detail="Hospital Admin cannot assign a different hospital_id.")
        hospital_id_to_assign = creator_hospital_id

    doc = UserDocument.create(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        department=payload.department or "Radiology",
        phone=payload.phone,
        hospital_id=hospital_id_to_assign,
    )
    await db["users"].insert_one(doc)

    await db[AuditLogDocument.collection].insert_one(
        AuditLogDocument.create(
            user_id=current_admin["sub"],
            action="ADD_DOCTOR",
            resource="users",
            resource_id=str(doc["_id"]),
            details={"doctor_username": payload.username},
        )
    )

    logger.info("Admin %s created doctor account: %s", current_admin.get("username"), payload.username)
    return _serialize_user(doc)


@router.get("/doctors", response_model=list[UserOut])
async def list_doctors(
    current_admin: dict = Depends(require_admin),
    db=Depends(get_db),
):
    """Admin endpoint to view all registered users under their authority."""
    query = {"role": {"$ne": "super_admin"}}
    creator_role = current_admin.get("role", "admin")
    creator_hospital_id = current_admin.get("hospital_id")
    
    if creator_role == "hospital_admin":
        if not creator_hospital_id:
            return []
        query["hospital_id"] = creator_hospital_id
        
    query["is_deleted"] = {"$ne": True}
        
    cursor = db["users"].find(query).sort("created_at", -1)
    doctors = await cursor.to_list(length=200)
    return [_serialize_user(d) for d in doctors]


@router.delete("/doctors/{user_id}", response_model=OKResponse)
async def deactivate_doctor(
    user_id: str,
    current_admin: dict = Depends(require_admin),
    db=Depends(get_db),
):
    """Admin endpoint to deactivate a doctor account."""
    if user_id == current_admin.get("sub"):
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")

    query = to_id_query(user_id)
    query["role"] = {"$ne": "super_admin"}

    creator_role = current_admin.get("role", "admin")
    if creator_role == "hospital_admin":
        creator_hospital_id = current_admin.get("hospital_id")
        if not creator_hospital_id:
            raise HTTPException(status_code=403, detail="Hospital Admin has no associated hospital_id.")
        query["hospital_id"] = creator_hospital_id

    result = await db["users"].update_one(
        query,
        {"$set": {"is_active": False, "is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor user account not found or unauthorized.")

    await db[AuditLogDocument.collection].insert_one(
        AuditLogDocument.create(
            user_id=current_admin["sub"],
            action="DEACTIVATE_DOCTOR",
            resource="users",
            resource_id=user_id,
        )
    )
    logger.info("Admin %s deactivated doctor: %s", current_admin.get("username"), user_id)
    return OKResponse(message="Doctor account deactivated successfully.")


@router.put("/doctors/{user_id}/reactivate", response_model=OKResponse)
async def reactivate_doctor(
    user_id: str,
    current_admin: dict = Depends(require_admin),
    db=Depends(get_db),
):
    """Admin endpoint to reactivate a deactivated doctor account."""
    query = to_id_query(user_id)
    query["role"] = {"$ne": "super_admin"}

    creator_role = current_admin.get("role", "admin")
    if creator_role == "hospital_admin":
        creator_hospital_id = current_admin.get("hospital_id")
        if not creator_hospital_id:
            raise HTTPException(status_code=403, detail="Hospital Admin has no associated hospital_id.")
        query["hospital_id"] = creator_hospital_id

    result = await db["users"].update_one(
        query,
        {"$set": {"is_active": True, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor user account not found or unauthorized.")

    logger.info("Admin %s reactivated doctor: %s", current_admin.get("username"), user_id)
    return OKResponse(message="Doctor account reactivated successfully.")


@router.get("/stats")
async def admin_stats(
    current_admin: dict = Depends(require_admin),
    db=Depends(get_db),
):
    """System-wide administrative statistics."""
    total_doctors = await db["users"].count_documents({"role": "doctor"})
    active_doctors = await db["users"].count_documents({"role": "doctor", "is_active": True})
    total_patients = await db["patients"].count_documents({})
    total_predictions = await db["predictions"].count_documents({})
    pneumonia_cases = await db["predictions"].count_documents({"prediction": "PNEUMONIA"})
    normal_cases = await db["predictions"].count_documents({"prediction": "NORMAL"})

    return {
        "total_doctors": total_doctors,
        "active_doctors": active_doctors,
        "inactive_doctors": total_doctors - active_doctors,
        "total_patients": total_patients,
        "total_predictions": total_predictions,
        "pneumonia_cases": pneumonia_cases,
        "normal_cases": normal_cases,
    }
