"""
PneumoVision AI — Authentication API
POST /auth/login  — Login and receive a JWT access token
GET  /auth/me     — Get current user profile

NOTE: Doctor registration is handled exclusively by Admins via /admin/doctors.
      There is no public self-registration.
"""

import logging
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import (
    create_access_token,
    get_current_user,
    verify_password,
)
from app.core.limiter import limiter
from app.database.connection import get_db
from app.database.models import AuditLogDocument, to_id_query
from app.schemas.schemas import TokenResponse, UserOut

logger = logging.getLogger("pneumovision.api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


def _serialize_user(doc: dict) -> UserOut:
    return UserOut(
        id=str(doc["_id"]),
        username=doc["username"],
        email=doc["email"],
        full_name=doc["full_name"],
        role=doc["role"],
        department=doc.get("department", ""),
        phone=doc.get("phone", ""),
        hospital_id=doc.get("hospital_id"),
        is_active=doc.get("is_active", True),
        created_at=doc.get("created_at", datetime.utcnow()),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    """
    Authenticate with username + password and receive a JWT access token.
    Use the token as: `Authorization: Bearer <token>` on protected routes.
    """
    user = await db["users"].find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact your administrator.")

    token_data = {
        "sub": str(user["_id"]),
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
        "hospital_id": user.get("hospital_id"),
    }
    token = create_access_token(data=token_data)

    # Update last_login timestamp
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}},
    )

    # Audit log
    await db[AuditLogDocument.collection].insert_one(
        AuditLogDocument.create(
            user_id=str(user["_id"]),
            action="LOGIN",
            resource="auth",
            resource_id=str(user["_id"]),
        )
    )

    logger.info("User logged in: %s (%s)", user["username"], user["role"])
    return TokenResponse(access_token=token, user=_serialize_user(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Return the profile of the currently authenticated user."""
    user = await db["users"].find_one(to_id_query(current_user["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if not user.get("is_active", True) or user.get("is_deleted", False):
        raise HTTPException(status_code=403, detail="Account is deactivated or deleted.")
    return _serialize_user(user)
