from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import logging
import csv
import io
from app.core.security import get_current_user, escape_regex
from app.database.connection import get_db

logger = logging.getLogger("pneumovision.api.audit")
router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/logs", response_model=dict)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=50),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Retrieve system audit logs. Restricted to admins."""
    role = current_user.get("role", "")
    if role not in ["super_admin", "hospital_admin", "state_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs.")

    query = {}
    
    # Filter by hospital if not super admin
    if role != "super_admin":
        hospital_id = current_user.get("hospital_id")
        if not hospital_id:
            raise HTTPException(status_code=403, detail="Admin is not assigned to a hospital.")
        
        # We need to find users belonging to this hospital, and then filter logs by those user_ids
        users_cursor = db["users"].find({"hospital_id": hospital_id}, {"_id": 1})
        user_ids = [str(u["_id"]) for u in await users_cursor.to_list(length=None)]
        query["user_id"] = {"$in": user_ids}

    # Search filter
    if search:
        safe_search = escape_regex(search)
        query["$or"] = [
            {"action": {"$regex": safe_search, "$options": "i"}},
            {"resource": {"$regex": safe_search, "$options": "i"}},
            {"user_id": {"$regex": safe_search, "$options": "i"}}
        ]

    skip = (page - 1) * limit
    total_logs = await db["audit_logs"].count_documents(query)
    
    cursor = db["audit_logs"].find(query).sort("timestamp", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    # Format for response
    formatted_logs = []
    for log in logs:
        log["_id"] = str(log["_id"])
        if "timestamp" in log:
            log["timestamp"] = log["timestamp"].isoformat() if hasattr(log["timestamp"], "isoformat") else str(log["timestamp"])
        formatted_logs.append(log)

    return {
        "logs": formatted_logs,
        "total": total_logs,
        "page": page,
        "limit": limit
    }

@router.get("/export")
async def export_audit_logs(
    search: str = Query("", max_length=50),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Export system audit logs as CSV. Restricted to admins."""
    role = current_user.get("role", "")
    if role not in ["super_admin", "hospital_admin", "state_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to export audit logs.")

    query = {}
    
    # Filter by hospital if not super admin
    if role != "super_admin":
        hospital_id = current_user.get("hospital_id")
        if not hospital_id:
            raise HTTPException(status_code=403, detail="Admin is not assigned to a hospital.")
        
        users_cursor = db["users"].find({"hospital_id": hospital_id}, {"_id": 1})
        user_ids = [str(u["_id"]) for u in await users_cursor.to_list(length=None)]
        query["user_id"] = {"$in": user_ids}

    # Search filter
    if search:
        safe_search = escape_regex(search)
        query["$or"] = [
            {"action": {"$regex": safe_search, "$options": "i"}},
            {"resource": {"$regex": safe_search, "$options": "i"}},
            {"user_id": {"$regex": safe_search, "$options": "i"}}
        ]

    # Stream the data to a CSV
    async def iter_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        # Write headers
        writer.writerow(["Log ID", "Timestamp", "User ID", "Action", "Resource", "Details"])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        # Batch process to avoid memory issues (max 10000 limit)
        cursor = db["audit_logs"].find(query).sort("timestamp", -1).limit(10000)
        
        async for log in cursor:
            ts = log.get("timestamp")
            timestamp_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
            writer.writerow([
                str(log.get("_id", "")),
                timestamp_str,
                log.get("user_id", ""),
                log.get("action", ""),
                log.get("resource", ""),
                log.get("details", "")
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    response = StreamingResponse(iter_csv(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=audit_logs.csv"
    return response
