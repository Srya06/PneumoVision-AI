"""
PneumoVision AI — Pydantic Schemas
All request/response models for API validation and serialization.
"""

from __future__ import annotations

from datetime import datetime
import html
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


def _clean_str(v: Any) -> Any:
    if isinstance(v, str):
        return html.escape(v.strip())
    return v


# ── Helpers ───────────────────────────────────────────────────────────────────

class OKResponse(BaseModel):
    message: str
    data: Optional[Any] = None


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def clean_username(cls, v: Any) -> Any:
        return _clean_str(v)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_\.-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(default="doctor", pattern="^(super_admin|state_admin|hospital_admin|radiologist|doctor|technician|receptionist|admin)$")
    department: str = Field(default="", max_length=100)
    phone: str = Field(default="", max_length=20)
    hospital_id: Optional[str] = None

    @field_validator("username", "full_name", "department", "phone", mode="before")
    @classmethod
    def sanitize_fields(cls, v: Any) -> Any:
        return _clean_str(v)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    department: str
    phone: str
    hospital_id: Optional[str]
    is_active: bool
    created_at: datetime


# ── Patient ───────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=0, le=150)
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    phone: str = Field(..., min_length=7, max_length=20)
    email: EmailStr
    address: str = Field(default="", max_length=300)
    medical_history: str = Field(default="", max_length=2000)
    symptoms: List[str] = Field(default_factory=list)
    hospital_id: Optional[str] = None

    @field_validator("full_name", "phone", "address", "medical_history", mode="before")
    @classmethod
    def sanitize_patient_fields(cls, v: Any) -> Any:
        return _clean_str(v)

    @field_validator("symptoms", mode="before")
    @classmethod
    def sanitize_symptoms(cls, v: Any) -> Any:
        if isinstance(v, list):
            return [_clean_str(s) for s in v if s]
        return v


class PatientUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = Field(None, pattern="^(Male|Female|Other)$")
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = Field(None, max_length=300)
    medical_history: Optional[str] = Field(None, max_length=2000)
    symptoms: Optional[List[str]] = None

    @field_validator("full_name", "phone", "address", "medical_history", mode="before")
    @classmethod
    def sanitize_patient_update_fields(cls, v: Any) -> Any:
        return _clean_str(v)

    @field_validator("symptoms", mode="before")
    @classmethod
    def sanitize_symptoms(cls, v: Any) -> Any:
        if isinstance(v, list):
            return [_clean_str(s) for s in v if s]
        return v


class PatientOut(BaseModel):
    id: str
    patient_id: str
    full_name: str
    age: int
    gender: str
    phone: str
    email: str
    address: str
    medical_history: str
    symptoms: List[str]
    doctor_id: str
    doctor_name: str
    hospital_id: Optional[str]
    created_at: datetime
    updated_at: datetime


class PatientListResponse(BaseModel):
    total: int
    page: int
    limit: int
    patients: List[PatientOut]


# ── Prediction ────────────────────────────────────────────────────────────────

class PredictionOut(BaseModel):
    model_config = {"protected_namespaces": ()}
    id: str
    patient_id: str
    prediction: str                   # "NORMAL" | "PNEUMONIA"
    confidence: float
    confidence_pct: str               # "97.83%"
    severity: str                     # "Low" | "Medium" | "High" | "N/A"
    recommendations: List[str]
    heatmap_url: str
    image_url: str
    inference_time: str
    model_version: str
    doctor_notes: str
    created_at: datetime


class PredictionResponse(BaseModel):
    patient_id: str
    prediction: str
    confidence: float
    severity: str
    heatmap: str
    recommendation: list[str]
    model: str
    inference_time: str
    prediction_id: str
    status: str = "PENDING_REVIEW"
    reviewer_id: Optional[str] = None
    review_notes: Optional[str] = None
    manual_diagnosis: Optional[str] = None
    created_at: str

class PredictionReviewRequest(BaseModel):
    status: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    review_notes: Optional[str] = None
    manual_diagnosis: Optional[str] = None

    @field_validator("review_notes", "manual_diagnosis", mode="before")
    @classmethod
    def sanitize_review_fields(cls, v: Any) -> Any:
        return _clean_str(v)


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    model_config = {"protected_namespaces": ()}
    total_patients: int
    today_patients: int
    positive_cases: int
    negative_cases: int
    pending_reports: int
    average_confidence: float
    weekly_cases: List[dict]
    monthly_cases: List[dict]
    recent_predictions: List[dict]
    model_metrics: dict


# ── Report ────────────────────────────────────────────────────────────────────

class ReportOut(BaseModel):
    id: str
    prediction_id: str
    patient_id: str
    doctor_id: str
    pdf_path: str
    created_at: datetime


# ── Multi-Hospital ────────────────────────────────────────────────────────────

class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    address: str = Field(..., min_length=5, max_length=300)
    contact_email: EmailStr
    contact_phone: str = Field(..., max_length=20)

    @field_validator("name", "address", "contact_phone", mode="before")
    @classmethod
    def sanitize_hospital(cls, v: Any) -> Any:
        return _clean_str(v)


class HospitalOut(BaseModel):
    id: str
    name: str
    address: str
    contact_email: str
    contact_phone: str
    is_active: bool
    created_at: datetime


class DepartmentCreate(BaseModel):
    hospital_id: str
    name: str = Field(..., min_length=2, max_length=100)
    head_doctor_id: Optional[str] = None

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_department(cls, v: Any) -> Any:
        return _clean_str(v)


class DepartmentOut(BaseModel):
    id: str
    hospital_id: str
    name: str
    head_doctor_id: Optional[str]
    created_at: datetime


class WardCreate(BaseModel):
    hospital_id: str
    department_id: str
    name: str = Field(..., min_length=2, max_length=100)
    capacity: int = Field(..., ge=1, le=1000)

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_ward(cls, v: Any) -> Any:
        return _clean_str(v)


class WardOut(BaseModel):
    id: str
    hospital_id: str
    department_id: str
    name: str
    capacity: int
    created_at: datetime
