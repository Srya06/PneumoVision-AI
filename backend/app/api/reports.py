"""
PneumoVision AI — Reports API
POST /report/generate/{prediction_id}  — Generate a PDF report for a prediction
GET  /report/{report_id}               — Download a generated PDF report
GET  /report/list                      — List all reports
"""

from __future__ import annotations

import logging
from pathlib import Path

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.core.security import get_current_user
from app.database.connection import get_db
from app.database.models import AuditLogDocument, ReportDocument, to_id_query
from app.services.pdf_report import generate_pdf_report

logger = logging.getLogger("pneumovision.api.reports")
router = APIRouter(prefix="/report", tags=["Reports"])
settings = get_settings()


@router.post("/generate/{prediction_id}", response_model=dict)
async def generate_report(
    prediction_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Generate a professional PDF report for an existing prediction.
    Enforces RBAC and hospital scoping.
    """
    pred_query = to_id_query(prediction_id)
    pred_query["is_deleted"] = {"$ne": True}
    role = current_user.get("role", "doctor")
    hospital_id = current_user.get("hospital_id")

    if role != "super_admin":
        if hospital_id:
            pred_query["hospital_id"] = hospital_id
        else:
            pred_query["doctor_id"] = current_user["sub"]

    prediction = await db["predictions"].find_one(pred_query)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found or unauthorized.")

    if prediction.get("status") != "APPROVED":
        raise HTTPException(
            status_code=400, 
            detail="Cannot generate report for a prediction that is not APPROVED."
        )

    patient = await db["patients"].find_one({"patient_id": prediction["patient_id"]})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Generate PDF
    prediction["_id"] = str(prediction["_id"])
    patient["_id"] = str(patient["_id"])

    pdf_path = generate_pdf_report(patient=patient, prediction_data=prediction)

    # Save report record
    report_doc = ReportDocument.create(
        prediction_id=prediction_id,
        patient_id=prediction["patient_id"],
        doctor_id=current_user["sub"],
        pdf_path=pdf_path,
    )
    await db["reports"].insert_one(report_doc)

    # Mark prediction as report generated
    await db["predictions"].update_one(
        to_id_query(prediction_id), {"$set": {"report_generated": True}}
    )

    # Audit
    await db[AuditLogDocument.collection].insert_one(
        AuditLogDocument.create(
            user_id=current_user["sub"],
            action="GENERATE_REPORT",
            resource="report",
            resource_id=str(report_doc["_id"]),
        )
    )

    return {
        "report_id": str(report_doc["_id"]),
        "pdf_path": pdf_path,
        "download_url": f"/report/download/{report_doc['_id']}",
        "patient_id": prediction["patient_id"],
    }


@router.get("/download/{report_id}")
async def download_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Stream the PDF report file for download with strict path & RBAC validation."""
    query = to_id_query(report_id)
    role = current_user.get("role", "doctor")
    if role not in ["super_admin", "state_admin", "hospital_admin", "admin"]:
        query["doctor_id"] = current_user["sub"]

    report = await db["reports"].find_one(query)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or unauthorized.")

    report_base = Path(settings.report_dir).resolve()
    pdf_file = Path(report["pdf_path"]).resolve()

    # Prevent path traversal outside the report directory
    try:
        pdf_file.relative_to(report_base)
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid report path.")

    if not pdf_file.exists():
        raise HTTPException(status_code=404, detail="PDF file not found on disk.")

    return FileResponse(
        path=str(pdf_file),
        media_type="application/pdf",
        filename=pdf_file.name,
        headers={"Content-Disposition": f'attachment; filename="{pdf_file.name}"'},
    )


@router.get("/list", response_model=list)
async def list_reports(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """List all generated reports with RBAC isolation."""
    role = current_user.get("role", "doctor")
    if role in ["super_admin", "state_admin", "hospital_admin", "admin"]:
        query = {}
    else:
        query = {"doctor_id": current_user["sub"]}

    cursor = db["reports"].find(query).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    for d in docs:
        d["_id"] = str(d["_id"])
        if "created_at" in d:
            d["created_at"] = d["created_at"].isoformat()
        d["download_url"] = f"/report/download/{d['_id']}"
    return docs
