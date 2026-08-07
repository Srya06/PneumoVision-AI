"""
PneumoVision AI — Database Document Models (Typed Dicts / dataclasses)
These define the shape of documents stored in MongoDB collections.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from bson import ObjectId


def new_object_id() -> ObjectId:
    """Return a new native MongoDB ObjectId."""
    return ObjectId()


def to_id_query(id_val: Any) -> dict[str, Any]:
    """
    Return a MongoDB query dict matching both BSON ObjectId and string representations.
    Ensures backwards compatibility and prevents ObjectId vs string mismatch bugs.
    """
    if isinstance(id_val, ObjectId):
        return {"$or": [{"_id": id_val}, {"_id": str(id_val)}]}
    try:
        oid = ObjectId(str(id_val))
        return {"$or": [{"_id": oid}, {"_id": str(id_val)}]}
    except Exception:
        return {"_id": str(id_val)}


def utcnow() -> datetime:
    return datetime.utcnow()


# ── Hospital / Department / Ward ──────────────────────────────────────────────

class HospitalDocument:
    """Represents a document in the `hospitals` collection."""
    collection = "hospitals"

    @staticmethod
    def create(
        name: str,
        address: str,
        contact_email: str,
        contact_phone: str,
    ) -> dict[str, Any]:
        return {
            "_id": new_object_id(),
            "name": name,
            "address": address,
            "contact_email": contact_email,
            "contact_phone": contact_phone,
            "is_active": True,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }


class DepartmentDocument:
    """Represents a document in the `departments` collection."""
    collection = "departments"

    @staticmethod
    def create(
        hospital_id: str,
        name: str,
        head_doctor_id: Optional[str] = None,
    ) -> dict[str, Any]:
        return {
            "_id": new_object_id(),
            "hospital_id": hospital_id,
            "name": name,
            "head_doctor_id": head_doctor_id,
            "created_at": utcnow(),
        }


class WardDocument:
    """Represents a document in the `wards` collection."""
    collection = "wards"

    @staticmethod
    def create(
        hospital_id: str,
        department_id: str,
        name: str,
        capacity: int,
    ) -> dict[str, Any]:
        return {
            "_id": new_object_id(),
            "hospital_id": hospital_id,
            "department_id": department_id,
            "name": name,
            "capacity": capacity,
            "created_at": utcnow(),
        }


# ── User ──────────────────────────────────────────────────────────────────────

class UserDocument:
    """Represents a document in the `users` collection."""
    collection = "users"

    @staticmethod
    def create(
        username: str,
        email: str,
        hashed_password: str,
        full_name: str,
        role: str = "doctor",
        department: str = "",
        phone: str = "",
        hospital_id: Optional[str] = None,
    ) -> dict[str, Any]:
        return {
            "_id": new_object_id(),
            "username": username,
            "email": email,
            "hashed_password": hashed_password,
            "full_name": full_name,
            "role": role,              # "super_admin" | "state_admin" | "hospital_admin" | "radiologist" | "doctor" | "technician" | "receptionist" | "admin"
            "department": department,
            "phone": phone,
            "hospital_id": hospital_id,
            "is_active": True,
            "is_deleted": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
            "last_login": None,
        }


# ── Patient ───────────────────────────────────────────────────────────────────

class PatientDocument:
    """Represents a document in the `patients` collection."""
    collection = "patients"

    @staticmethod
    def create(
        patient_id: str,
        full_name: str,
        age: int,
        gender: str,
        phone: str,
        email: str,
        doctor_id: str,
        doctor_name: str,
        symptoms: list[str],
        address: str = "",
        medical_history: str = "",
        hospital_id: Optional[str] = None,
    ) -> dict[str, Any]:
        return {
            "_id": new_object_id(),
            "patient_id": patient_id,
            "full_name": full_name,
            "age": age,
            "gender": gender,          # "Male" | "Female" | "Other"
            "phone": phone,
            "email": email,
            "address": address,
            "medical_history": medical_history,
            "symptoms": symptoms,
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "hospital_id": hospital_id,
            "is_deleted": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }


# ── Prediction ────────────────────────────────────────────────────────────────

class PredictionDocument:
    """Represents a document in the `predictions` collection."""
    collection = "predictions"

    @staticmethod
    def create(
        patient_id: str,
        prediction: str,
        confidence: float,
        severity: str,
        recommendations: list[str],
        heatmap_path: str,
        image_path: str,
        inference_time: str,
        model_version: str,
        doctor_id: str,
        doctor_notes: str = "",
        hospital_id: Optional[str] = None,
    ) -> dict[str, Any]:
        return {
            "_id": new_object_id(),
            "patient_id": patient_id,
            "prediction": prediction,          # "NORMAL" | "PNEUMONIA"
            "confidence": round(confidence, 4),
            "severity": severity,              # "Low" | "Medium" | "High" | "N/A"
            "recommendations": recommendations,
            "heatmap_path": heatmap_path,
            "image_path": image_path,
            "inference_time": inference_time,
            "model_version": model_version,
            "doctor_id": doctor_id,
            "doctor_notes": doctor_notes,
            "hospital_id": hospital_id,
            "status": "PENDING_REVIEW",        # "PENDING_REVIEW" | "APPROVED" | "REJECTED"
            "reviewer_id": None,
            "review_notes": None,
            "manual_diagnosis": None,
            "report_generated": False,
            "is_deleted": False,
            "created_at": utcnow(),
        }


# ── Report ────────────────────────────────────────────────────────────────────

class ReportDocument:
    """Represents a document in the `reports` collection."""
    collection = "reports"

    @staticmethod
    def create(
        prediction_id: str,
        patient_id: str,
        doctor_id: str,
        pdf_path: str,
    ) -> dict[str, Any]:
        return {
            "_id": new_object_id(),
            "prediction_id": prediction_id,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "pdf_path": pdf_path,
            "created_at": utcnow(),
        }


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLogDocument:
    """Represents a document in the `audit_logs` collection."""
    collection = "audit_logs"

    @staticmethod
    def create(
        user_id: str,
        action: str,
        resource: str,
        resource_id: str,
        ip_address: str = "",
        details: Optional[dict] = None,
    ) -> dict[str, Any]:
        return {
            "_id": new_object_id(),
            "user_id": user_id,
            "action": action,          # "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "PREDICT"
            "resource": resource,      # "patient" | "prediction" | "report"
            "resource_id": resource_id,
            "ip_address": ip_address,
            "details": details or {},
            "timestamp": utcnow(),
        }
