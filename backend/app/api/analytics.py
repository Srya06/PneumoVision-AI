from fastapi import APIRouter, Depends, HTTPException
import logging
from app.core.security import get_current_user
from app.database.connection import get_db

logger = logging.getLogger("pneumovision.api.analytics")
router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=dict)
async def get_dashboard_analytics(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    role = current_user.get("role", "")
    user_id = current_user.get("sub", "")
    hospital_id = current_user.get("hospital_id")

    # Determine query scope based on RBAC
    patient_query = {}
    prediction_query = {}

    if role == "super_admin":
        pass  # sees everything
    elif role in ["hospital_admin", "state_admin"] and hospital_id:
        patient_query["hospital_id"] = hospital_id
        prediction_query["hospital_id"] = hospital_id
    elif role in ["doctor", "radiologist"]:
        patient_query["doctor_id"] = user_id
        prediction_query["doctor_id"] = user_id
    else:
        # Fallback for generic staff
        if hospital_id:
            patient_query["hospital_id"] = hospital_id
            prediction_query["hospital_id"] = hospital_id

    # Execute Aggregations
    total_patients = await db["patients"].count_documents(patient_query)
    total_predictions = await db["predictions"].count_documents(prediction_query)
    
    pending_review_query = prediction_query.copy()
    pending_review_query["status"] = "PENDING_REVIEW"
    pending_reviews = await db["predictions"].count_documents(pending_review_query)

    # Class distribution (Normal vs Pneumonia)
    pipeline = [
        {"$match": prediction_query},
        {"$group": {"_id": "$prediction", "count": {"$sum": 1}}}
    ]
    cursor = db["predictions"].aggregate(pipeline)
    distribution = await cursor.to_list(length=10)
    
    distribution_data = []
    for item in distribution:
        distribution_data.append({"name": item["_id"], "value": item["count"]})

    # Recent Predictions (limit 5)
    recent_cursor = db["predictions"].find(prediction_query).sort("created_at", -1).limit(5)
    recent_docs = await recent_cursor.to_list(length=5)
    recent_predictions = []
    for d in recent_docs:
        recent_predictions.append({
            "id": str(d["_id"]),
            "patient_id": d["patient_id"],
            "prediction": d["prediction"],
            "confidence": round(d["confidence"] * 100, 2) if d["confidence"] <= 1.0 else d["confidence"],
            "severity": d["severity"],
            "created_at": d.get("created_at", "").isoformat() if hasattr(d.get("created_at"), "isoformat") else d.get("created_at")
        })

    return {
        "metrics": {
            "total_patients": total_patients,
            "total_predictions": total_predictions,
            "pending_reviews": pending_reviews,
            "system_health": "Optimal"
        },
        "distribution": distribution_data,
        "recent_predictions": recent_predictions
    }
