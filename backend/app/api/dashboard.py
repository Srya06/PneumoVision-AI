"""
PneumoVision AI — Dashboard API
GET /dashboard  — Aggregated statistics for the dashboard UI
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends

from app.ai.model_loader import ModelLoader
from app.core.security import get_current_user
from app.database.connection import get_db
from app.schemas.schemas import DashboardStats

logger = logging.getLogger("pneumovision.api.dashboard")
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardStats)
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Return aggregated statistics for the dashboard.

    - Total patients (role-filtered)
    - Today's patients
    - Positive/Negative case counts
    - Pending reports
    - Average confidence
    - Weekly & monthly case data for charts
    - Recent 5 predictions
    """
    role = current_user.get("role", "doctor")
    hospital_id = current_user.get("hospital_id")
    user_filter = {"is_deleted": {"$ne": True}}
    pred_filter = {"is_deleted": {"$ne": True}}

    if role == "super_admin":
        pass
    elif role in ["state_admin", "hospital_admin", "admin"]:
        if hospital_id:
            user_filter["hospital_id"] = hospital_id
            pred_filter["hospital_id"] = hospital_id
    else:
        user_filter["doctor_id"] = current_user["sub"]
        pred_filter["doctor_id"] = current_user["sub"]

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # ── Basic counts ─────────────────────────────────────────────────────────
    total_patients = await db["patients"].count_documents(user_filter)
    today_patients = await db["patients"].count_documents(
        {**user_filter, "created_at": {"$gte": today_start}}
    )
    positive_cases = await db["predictions"].count_documents(
        {**pred_filter, "prediction": "PNEUMONIA"}
    )
    negative_cases = await db["predictions"].count_documents(
        {**pred_filter, "prediction": "NORMAL"}
    )
    pending_reports = await db["predictions"].count_documents(
        {**pred_filter, "report_generated": False}
    )

    # ── Average confidence ────────────────────────────────────────────────────
    agg = await db["predictions"].aggregate([
        {"$match": pred_filter},
        {"$group": {"_id": None, "avg_conf": {"$avg": "$confidence"}}},
    ]).to_list(length=1)
    avg_confidence = round((agg[0]["avg_conf"] * 100) if agg else 0.0, 2)

    # ── Weekly cases (last 7 days) ────────────────────────────────────────────
    weekly_cases = []
    for i in range(6, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count = await db["predictions"].count_documents(
            {**pred_filter, "created_at": {"$gte": day_start, "$lt": day_end}}
        )
        weekly_cases.append({
            "date": day_start.strftime("%a"),
            "cases": count,
            "full_date": day_start.strftime("%Y-%m-%d"),
        })

    # ── Monthly cases (last 6 months) ─────────────────────────────────────────
    monthly_cases = []
    for i in range(5, -1, -1):
        month_start = (today_start.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if i == 0:
            month_end = today_start + timedelta(days=1)
        else:
            next_month = month_start.replace(day=28) + timedelta(days=4)
            month_end = next_month.replace(day=1)
        count = await db["predictions"].count_documents(
            {**pred_filter, "created_at": {"$gte": month_start, "$lt": month_end}}
        )
        monthly_cases.append({
            "month": month_start.strftime("%b %Y"),
            "cases": count,
            "pneumonia": await db["predictions"].count_documents(
                {**pred_filter, "prediction": "PNEUMONIA",
                 "created_at": {"$gte": month_start, "$lt": month_end}}
            ),
            "normal": await db["predictions"].count_documents(
                {**pred_filter, "prediction": "NORMAL",
                 "created_at": {"$gte": month_start, "$lt": month_end}}
            ),
        })

    # ── Recent predictions ─────────────────────────────────────────────────────
    cursor = db["predictions"].find(pred_filter).sort("created_at", -1).limit(5)
    recent_raw = await cursor.to_list(length=5)
    recent_predictions = []
    for p in recent_raw:
        recent_predictions.append({
            "id": str(p["_id"]),
            "patient_id": p["patient_id"],
            "prediction": p["prediction"],
            "confidence": round(p["confidence"] * 100, 2),
            "severity": p["severity"],
            "status": p.get("status", "PENDING_REVIEW"),
            "created_at": p["created_at"].isoformat() if p.get("created_at") else None,
        })

    return DashboardStats(
        total_patients=total_patients,
        today_patients=today_patients,
        positive_cases=positive_cases,
        negative_cases=negative_cases,
        pending_reports=pending_reports,
        average_confidence=avg_confidence,
        weekly_cases=weekly_cases,
        monthly_cases=monthly_cases,
        recent_predictions=recent_predictions,
        model_metrics=ModelLoader.model_info(),
    )
