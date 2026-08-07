"""
PneumoVision AI — Prediction API
POST /predict  — Upload chest X-ray, run AI pipeline, save result to MongoDB
GET  /predict/history  — List all predictions
GET  /predict/{id}     — Get a single prediction result
"""

import io
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Request

from app.ai.predict import run_prediction_pipeline
from app.ai.utils import build_heatmap_url, build_image_url
from app.core.config import get_settings
from app.core.security import get_current_user, sanitize_text
from app.core.limiter import limiter
from app.database.connection import get_db
from app.database.models import AuditLogDocument, PredictionDocument, to_id_query
from app.schemas.schemas import PredictionResponse, PredictionReviewRequest
from app.ai.quality import assess_image_quality

logger = logging.getLogger("pneumovision.api.predict")
router = APIRouter(prefix="/predict", tags=["AI Prediction"])
settings = get_settings()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


def _validate_upload(file: UploadFile) -> None:
    """Validate uploaded file type and size."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, WebP.",
        )


@router.post("", response_model=PredictionResponse)
@limiter.limit("10/minute")
async def predict(
    request: Request,
    file: UploadFile = File(..., description="Chest X-Ray image (JPEG/PNG/WebP)"),
    patient_id: str = Form(..., description="Patient ID (e.g. PAT0001)"),
    doctor_notes: str = Form(default="", description="Optional doctor notes"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Run AI pneumonia detection on an uploaded chest X-ray image.

    Returns prediction label, confidence, severity, Grad-CAM heatmap path,
    clinical recommendations, and inference timing.
    """
    _validate_upload(file)

    # Verify patient exists and user has authorization
    patient_query = {"patient_id": patient_id, "is_deleted": {"$ne": True}}
    role = current_user.get("role", "doctor")
    hospital_id = current_user.get("hospital_id")
    if role != "super_admin":
        if hospital_id:
            patient_query["hospital_id"] = hospital_id
        else:
            patient_query["doctor_id"] = current_user["sub"]

    patient = await db["patients"].find_one(patient_query)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found or unauthorized.")

    doctor_notes = sanitize_text(doctor_notes) or ""

    # Read file bytes and check size
    image_bytes = await file.read()
    if len(image_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed: {settings.max_upload_size_mb} MB.",
        )

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # ── Phase 4: Assess Image Quality ──────────────────────────────────────────
    quality_result = assess_image_quality(image_bytes)
    if not quality_result["is_acceptable"]:
        raise HTTPException(
            status_code=422,
            detail=f"Image Quality Check Failed: {quality_result['reason']}"
        )

    # ── Run AI pipeline ────────────────────────────────────────────────────────
    try:
        result = await run_prediction_pipeline(
            image_bytes=image_bytes,
            patient_id=patient_id,
        )
    except ValueError as exc:
        logger.error("Preprocessing error: %s", exc)
        raise HTTPException(status_code=422, detail=f"Image processing failed: {exc}") from exc
    except Exception as exc:
        logger.exception("Prediction pipeline failed: %s", exc)
        raise HTTPException(status_code=500, detail="AI prediction failed. Please try again.") from exc

    # ── Save to MongoDB ────────────────────────────────────────────────────────
    # Phase 6: Confidence Threshold Logic
    status = "PENDING_REVIEW"
    if result["confidence"] > 0.90:
        status = "APPROVED"
    elif result["confidence"] < 0.70:
        status = "UNCERTAIN_REVIEW"

    pred_doc = PredictionDocument.create(
        patient_id=patient_id,
        prediction=result["prediction"],
        confidence=result["confidence"],
        severity=result["severity"],
        recommendations=result["recommendations"],
        heatmap_path=result["heatmap_path"],
        image_path=result["image_path"],
        inference_time=result["inference_time"],
        model_version=result["model_version"],
        doctor_id=current_user["sub"],
        doctor_notes=doctor_notes,
        hospital_id=current_user.get("hospital_id"),
    )
    pred_doc["status"] = status
    await db["predictions"].insert_one(pred_doc)

    # Audit
    await db[AuditLogDocument.collection].insert_one(
        AuditLogDocument.create(
            user_id=current_user["sub"],
            action="PREDICT",
            resource="prediction",
            resource_id=str(pred_doc["_id"]),
            details={"patient_id": patient_id, "result": result["prediction"]},
        )
    )

    logger.info(
        "Prediction saved: %s → %s (%.2f%%) | id=%s",
        patient_id,
        result["prediction"],
        result["confidence"] * 100,
        pred_doc["_id"],
    )

    return PredictionResponse(
        patient_id=patient_id,
        prediction=result["prediction"],
        confidence=round(result["confidence"] * 100, 2),
        severity=result["severity"],
        heatmap=build_heatmap_url(result["heatmap_path"]),
        recommendation=result["recommendations"],
        model=result["model_version"],
        inference_time=result["inference_time"],
        prediction_id=str(pred_doc["_id"]),
        status=status,
        created_at=datetime.utcnow().isoformat(),
    )


@router.get("/history", response_model=list)
async def prediction_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Return the 50 most recent predictions (isolated by hospital/doctor)."""
    query = {}
    role = current_user.get("role", "doctor")
    hospital_id = current_user.get("hospital_id")

    if role == "super_admin":
        pass
    elif role in ["state_admin", "hospital_admin", "admin"]:
        if hospital_id:
            query["hospital_id"] = hospital_id
    else:
        query["doctor_id"] = current_user["sub"]

    query["is_deleted"] = {"$ne": True}

    cursor = db["predictions"].find(query).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    for d in docs:
        d["_id"] = str(d["_id"])
        if "created_at" in d:
            d["created_at"] = d["created_at"].isoformat()
        d["heatmap_url"] = build_heatmap_url(d.get("heatmap_path", ""))
        d["image_url"] = build_image_url(d.get("image_path", ""))
    return docs


@router.get("/{prediction_id}", response_model=dict)
async def get_prediction(
    prediction_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a single prediction result by its ID with RBAC isolation."""
    query = to_id_query(prediction_id)
    query["is_deleted"] = {"$ne": True}
    role = current_user.get("role", "doctor")
    hospital_id = current_user.get("hospital_id")

    if role != "super_admin":
        if hospital_id:
            query["hospital_id"] = hospital_id
        else:
            query["doctor_id"] = current_user["sub"]

    doc = await db["predictions"].find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Prediction not found or unauthorized.")

    doc["_id"] = str(doc["_id"])
    if "created_at" in doc:
        doc["created_at"] = doc["created_at"].isoformat()
    doc["heatmap_url"] = build_heatmap_url(doc.get("heatmap_path", ""))
    doc["image_url"] = build_image_url(doc.get("image_path", ""))
    return doc


@router.put("/{prediction_id}/review", response_model=dict)
async def review_prediction(
    prediction_id: str,
    payload: PredictionReviewRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Review and approve/reject a prediction (restricted to radiologists/doctors with hospital isolation)."""
    role = current_user.get("role", "")
    if role not in ["radiologist", "doctor", "hospital_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to review predictions.")

    query = to_id_query(prediction_id)
    query["is_deleted"] = {"$ne": True}
    hospital_id = current_user.get("hospital_id")

    if role != "super_admin" and hospital_id:
        query["hospital_id"] = hospital_id

    doc = await db["predictions"].find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Prediction not found or unauthorized.")

    updates = {
        "status": payload.status,
        "reviewer_id": current_user["sub"],
        "review_notes": payload.review_notes,
        "manual_diagnosis": payload.manual_diagnosis,
        "updated_at": datetime.utcnow()
    }
    await db["predictions"].update_one(query, {"$set": updates})

    # Audit
    await db[AuditLogDocument.collection].insert_one(
        AuditLogDocument.create(
            user_id=current_user["sub"],
            action="REVIEW_PREDICTION",
            resource="prediction",
            resource_id=prediction_id,
            details={"status": payload.status}
        )
    )

    doc.update(updates)
    doc["_id"] = str(doc["_id"])
    if "created_at" in doc:
        doc["created_at"] = doc["created_at"].isoformat()
    if "updated_at" in doc:
        doc["updated_at"] = doc["updated_at"].isoformat()
    doc["heatmap_url"] = build_heatmap_url(doc.get("heatmap_path", ""))
    doc["image_url"] = build_image_url(doc.get("image_path", ""))
    return doc
