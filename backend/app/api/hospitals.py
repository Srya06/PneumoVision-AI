"""
PneumoVision AI — Hospitals API
Manage hospitals, departments, and wards (restricted to super_admin and state_admin).
"""

from __future__ import annotations

import logging
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_super_admin, require_state_admin, require_hospital_admin
from app.database.connection import get_db
from app.database.models import HospitalDocument, DepartmentDocument, WardDocument
from app.schemas.schemas import HospitalCreate, HospitalOut, DepartmentCreate, DepartmentOut, WardCreate, WardOut, OKResponse

logger = logging.getLogger("pneumovision.api.hospitals")
router = APIRouter(prefix="/hospitals", tags=["Hospitals"])

def _serialize_hospital(doc: dict) -> HospitalOut:
    return HospitalOut(
        id=str(doc["_id"]),
        name=doc["name"],
        address=doc["address"],
        contact_email=doc["contact_email"],
        contact_phone=doc["contact_phone"],
        is_active=doc.get("is_active", True),
        created_at=doc.get("created_at", datetime.utcnow()),
    )

def _serialize_department(doc: dict) -> DepartmentOut:
    return DepartmentOut(
        id=str(doc["_id"]),
        hospital_id=doc["hospital_id"],
        name=doc["name"],
        head_doctor_id=doc.get("head_doctor_id"),
        created_at=doc.get("created_at", datetime.utcnow()),
    )


@router.post("/", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
async def create_hospital(
    payload: HospitalCreate,
    current_admin: dict = Depends(require_super_admin),
    db=Depends(get_db),
):
    """Super Admin creates a new hospital."""
    doc = HospitalDocument.create(
        name=payload.name,
        address=payload.address,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
    )
    await db["hospitals"].insert_one(doc)
    logger.info("Admin %s created hospital: %s", current_admin.get("username"), payload.name)
    return _serialize_hospital(doc)


@router.get("/", response_model=list[HospitalOut])
async def list_hospitals(
    current_admin: dict = Depends(require_state_admin),
    db=Depends(get_db),
):
    """List all registered hospitals."""
    cursor = db["hospitals"].find().sort("created_at", -1)
    hospitals = await cursor.to_list(length=100)
    return [_serialize_hospital(h) for h in hospitals]


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
async def create_department(
    payload: DepartmentCreate,
    current_admin: dict = Depends(require_hospital_admin),
    db=Depends(get_db),
):
    """Admin creates a new department for a hospital."""
    role = current_admin.get("role")
    hosp_id = current_admin.get("hospital_id")
    if role == "hospital_admin" and (not hosp_id or payload.hospital_id != hosp_id):
        raise HTTPException(status_code=403, detail="Hospital Admin can only manage departments for their own hospital.")

    doc = DepartmentDocument.create(
        hospital_id=payload.hospital_id,
        name=payload.name,
        head_doctor_id=payload.head_doctor_id,
    )
    await db["departments"].insert_one(doc)
    return _serialize_department(doc)


@router.get("/{hospital_id}/departments", response_model=list[DepartmentOut])
async def list_departments(
    hospital_id: str,
    current_admin: dict = Depends(require_hospital_admin),
    db=Depends(get_db),
):
    """List all departments for a given hospital."""
    role = current_admin.get("role")
    hosp_id = current_admin.get("hospital_id")
    if role == "hospital_admin" and (not hosp_id or hospital_id != hosp_id):
        raise HTTPException(status_code=403, detail="Unauthorized access to hospital departments.")

    cursor = db["departments"].find({"hospital_id": hospital_id}).sort("created_at", -1)
    departments = await cursor.to_list(length=100)
    return [_serialize_department(d) for d in departments]


def _serialize_ward(doc: dict) -> WardOut:
    return WardOut(
        id=str(doc["_id"]),
        hospital_id=doc["hospital_id"],
        department_id=doc["department_id"],
        name=doc["name"],
        capacity=doc["capacity"],
        created_at=doc.get("created_at", datetime.utcnow()),
    )


@router.post("/wards", response_model=WardOut, status_code=status.HTTP_201_CREATED)
async def create_ward(
    payload: WardCreate,
    current_admin: dict = Depends(require_hospital_admin),
    db=Depends(get_db),
):
    """Admin creates a new ward for a department."""
    role = current_admin.get("role")
    hosp_id = current_admin.get("hospital_id")
    if role == "hospital_admin" and (not hosp_id or payload.hospital_id != hosp_id):
        raise HTTPException(status_code=403, detail="Hospital Admin can only manage wards for their own hospital.")

    doc = WardDocument.create(
        hospital_id=payload.hospital_id,
        department_id=payload.department_id,
        name=payload.name,
        capacity=payload.capacity,
    )
    await db["wards"].insert_one(doc)
    return _serialize_ward(doc)


@router.get("/{hospital_id}/wards", response_model=list[WardOut])
async def list_wards(
    hospital_id: str,
    current_admin: dict = Depends(require_hospital_admin),
    db=Depends(get_db),
):
    """List all wards for a given hospital."""
    role = current_admin.get("role")
    hosp_id = current_admin.get("hospital_id")
    if role == "hospital_admin" and (not hosp_id or hospital_id != hosp_id):
        raise HTTPException(status_code=403, detail="Unauthorized access to hospital wards.")

    cursor = db["wards"].find({"hospital_id": hospital_id}).sort("created_at", -1)
    wards = await cursor.to_list(length=100)
    return [_serialize_ward(w) for w in wards]
