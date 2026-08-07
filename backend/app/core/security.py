"""
PneumoVision AI — Security Utilities
JWT token creation/verification, bcrypt password hashing, FastAPI OAuth2 dependency.
"""

from __future__ import annotations

import html
import logging
import re
from datetime import datetime, timedelta
from typing import Optional, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.database.connection import get_db
from app.database.models import to_id_query

logger = logging.getLogger("pneumovision.security")
settings = get_settings()

# ── Password hashing ─────────────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(plain: str) -> str:
    """Return bcrypt hash of a plain-text password."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the hashed password."""
    return _pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        data: Payload dict (must include 'sub' as user identifier).
        expires_delta: Custom expiry; defaults to settings value.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT token.

    Raises:
        HTTPException 401 if the token is invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("sub") is None:
            raise credentials_exception
        return payload
    except JWTError as exc:
        logger.warning("JWT decode failed: %s", exc)
        raise credentials_exception from exc


# ── FastAPI Dependencies ───────────────────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)) -> dict:
    """
    FastAPI dependency — validates JWT token and verifies user is active in DB.
    Returns the enriched user dict for authenticated requests.
    """
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: subject missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await db["users"].find_one(to_id_query(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True) or user.get("is_deleted", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated or disabled",
        )

    # Sync and enrich payload with latest role and hospital_id from DB
    payload["role"] = user.get("role", payload.get("role", "doctor"))
    payload["hospital_id"] = user.get("hospital_id", payload.get("hospital_id"))
    payload["username"] = user.get("username", payload.get("username"))
    payload["full_name"] = user.get("full_name", payload.get("full_name"))
    return payload


# ── Sanitization and XSS Mitigation ──────────────────────────────────────────

def sanitize_text(text: Optional[str]) -> Optional[str]:
    """Sanitize text input by stripping whitespace and escaping HTML characters to prevent XSS."""
    if text is None:
        return None
    if not isinstance(text, str):
        return str(text)
    return html.escape(text.strip())


def escape_regex(pattern: str) -> str:
    """Escape regex special characters to prevent ReDoS and regex injection in MongoDB queries."""
    if not pattern:
        return ""
    return re.escape(pattern.strip())


class RoleChecker:
    """Dependency class to check if current user has an allowed role."""
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

# Pre-defined role dependencies
require_super_admin = RoleChecker(["super_admin"])
require_state_admin = RoleChecker(["super_admin", "state_admin"])
require_hospital_admin = RoleChecker(["super_admin", "state_admin", "hospital_admin", "admin"])
require_admin = RoleChecker(["super_admin", "state_admin", "hospital_admin", "admin"])
require_radiologist = RoleChecker(["super_admin", "state_admin", "hospital_admin", "admin", "radiologist"])
require_doctor = RoleChecker(["super_admin", "state_admin", "hospital_admin", "admin", "radiologist", "doctor"])
require_technician = RoleChecker(["super_admin", "state_admin", "hospital_admin", "admin", "technician"])
require_receptionist = RoleChecker(["super_admin", "state_admin", "hospital_admin", "admin", "receptionist"])
require_clinical = RoleChecker(["super_admin", "state_admin", "hospital_admin", "admin", "radiologist", "doctor", "technician", "receptionist"])
