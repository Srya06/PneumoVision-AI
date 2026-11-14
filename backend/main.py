"""
PneumoVision AI — FastAPI Application Entry Point
Production-ready FastAPI app with lifespan management,
CORS, static files, and all API routers mounted.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

# ── CRITICAL: Must be set BEFORE any TensorFlow/Keras imports ─────────────────
# tf_keras==2.17.0 is installed. Setting TF_USE_LEGACY_KERAS=1 redirects
# tf.keras to the legacy implementation required to load the .keras model file.
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.ai.model_loader import ModelLoader
from app.api import admin, auth, dashboard, patients, predict, reports, hospitals, analytics, audit
from app.core.config import get_settings
from app.core.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.security import hash_password
from app.database.connection import DatabaseManager
from app.database.models import UserDocument

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pneumovision")
settings = get_settings()


async def _seed_default_users() -> None:
    """Seed initial Admin and Doctor accounts if database is empty."""
    db = DatabaseManager.get_db()
    user_count = await db["users"].count_documents({})
    if user_count == 0:
        logger.info("Seeding default Admin and Doctor accounts...")
        # Create Admin
        admin_doc = UserDocument.create(
            username="admin_head",
            email="admin@hospital.org",
            hashed_password=hash_password("Admin@123"),
            full_name="Hospital Administrator",
            role="admin",
            department="Hospital Operations",
        )
        # Create Doctor
        doctor_doc = UserDocument.create(
            username="dr_smith",
            email="smith@hospital.org",
            hashed_password=hash_password("Doctor@123"),
            full_name="Dr. John Smith",
            role="doctor",
            department="Pulmonology",
        )
        await db["users"].insert_many([admin_doc, doctor_doc])
        logger.info("✅ Default users created: 'admin_head' (Admin@123), 'dr_smith' (Doctor@123)")


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown lifecycle manager.
    - Startup: Connect to MongoDB, seed default users, load TensorFlow model, ensure directories.
    - Shutdown: Close MongoDB connection.
    """
    logger.info("=" * 60)
    logger.info("  PneumoVision AI — Starting Up")
    logger.info("=" * 60)

    # Ensure storage directories exist
    for dir_name in [settings.upload_dir, settings.heatmap_dir, settings.report_dir, "static"]:
        Path(dir_name).mkdir(parents=True, exist_ok=True)

    # Connect to MongoDB Atlas
    try:
        await DatabaseManager.connect()
        # Seed initial accounts
        await _seed_default_users()
    except Exception as exc:
        logger.error("⚠️ MongoDB connection failed during startup: %s", exc)
        logger.warning("Backend is running, but database routes will return 503 until a valid MONGODB_URI is set in .env.")

    # Load TensorFlow model (singleton — loads once)
    ModelLoader.load()

    logger.info("✅ PneumoVision AI is ready to serve requests.")
    logger.info("=" * 60)

    yield  # ← App runs here

    # Shutdown
    logger.info("Shutting down PneumoVision AI …")
    await DatabaseManager.disconnect()
    logger.info("Goodbye.")


# ── FastAPI App ───────────────────────────────────────────────────────────────
show_docs = settings.debug or settings.enable_docs
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Enterprise API for PneumoVision AI System",
    lifespan=lifespan,
    docs_url="/docs" if show_docs else None,
    redoc_url="/redoc" if show_docs else None,
    openapi_url="/openapi.json" if show_docs else None,
    debug=settings.debug,
)

# Initialize Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Security Headers Middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: blob:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self' http://localhost:8000 http://localhost:5173 http://localhost:3000; "
        "font-src 'self' data:; "
        "frame-ancestors 'none';"
    )
    # Remove Server header to prevent banner grabbing
    if "server" in response.headers:
        del response.headers["server"]
    return response

# ── CORS Configuration ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    max_age=600,
)

# ── Exception Handlers ────────────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return 422 with clean error messages."""
    errors = [
        {"field": " → ".join(str(e) for e in err["loc"]), "message": err["msg"]}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation failed", "errors": errors},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler — prevents stack traces leaking to clients in production."""
    logger.exception("Unhandled exception on %s %s: %s", request.method, request.url, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


# ── Static Files ──────────────────────────────────────────────────────────────
static_dir = Path(settings.upload_dir).parent / "static"
for d in [settings.upload_dir, settings.heatmap_dir, settings.report_dir, str(static_dir)]:
    Path(d).mkdir(parents=True, exist_ok=True)

app.mount("/uploads",  StaticFiles(directory=settings.upload_dir),  name="uploads")
app.mount("/heatmaps", StaticFiles(directory=settings.heatmap_dir), name="heatmaps")
app.mount("/static",   StaticFiles(directory=str(static_dir)),      name="static")
# NOTE: /reports is deliberately NOT mounted statically to protect patient health records.
# All PDF report downloads require authentication via GET /report/download/{id}.

# ── API Routers ───────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(patients.router)
app.include_router(predict.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(hospitals.router)
app.include_router(analytics.router)
app.include_router(audit.router)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Quick health check — verifies the app is running, model is loaded, and reports DB status."""
    db_status = "connected" if DatabaseManager._db is not None else "disconnected"
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "app": settings.app_name,
        "version": settings.app_version,
        "model": ModelLoader.model_info(),
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint — redirects to docs."""
    return {
        "message": "Welcome to PneumoVision AI API",
        "docs": "/docs",
        "health": "/health",
        "version": settings.app_version,
    }
