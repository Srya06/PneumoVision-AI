"""
PneumoVision AI — Application Configuration
Reads all settings from the .env file using pydantic-settings.
"""

from functools import lru_cache
from pathlib import Path
import os
import secrets
import logging

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]

# Find .env file in root or parent
env_path = BACKEND_DIR / ".env"
if not env_path.exists():
    env_path = BACKEND_DIR.parent / ".env"
if not env_path.exists():
    env_path = Path.cwd() / ".env"


class Settings(BaseSettings):
    """Central configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(env_path),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=('settings_',),
    )

    # ── Application ──────────────────────────────────────────────────────────
    app_name: str = "PneumoVision AI"
    app_version: str = "1.0.0"
    debug: bool = False
    enable_docs: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # ── MongoDB ───────────────────────────────────────────────────────────────
    mongodb_uri: str = "mongodb://localhost:27017/pneumovision"
    mongodb_db_name: str = "pneumovision"

    # ── JWT ───────────────────────────────────────────────────────────────────
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    @field_validator("secret_key", mode="before")
    @classmethod
    def validate_secret_key(cls, v: object) -> str:
        val = str(v).strip() if v else ""
        if not val or val == "replace-with-secure-secret-key-in-env":
            temp_key = secrets.token_hex(32)
            logging.getLogger("pneumovision.config").warning(
                "SECURITY WARNING: SECRET_KEY is not configured in .env! Generated an ephemeral key for this session."
            )
            return temp_key
        return val

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    # ── Model ─────────────────────────────────────────────────────────────────
    model_path: str = "../pneumovision_vgg16_final.keras"
    model_version: str = "VGG16 Fine-Tuned v1.0"
    image_size: int = 224

    # ── File Storage ──────────────────────────────────────────────────────────
    max_upload_size_mb: int = 10
    upload_dir: str = str(BACKEND_DIR / "uploads")
    heatmap_dir: str = str(BACKEND_DIR / "heatmaps")
    report_dir: str = str(BACKEND_DIR / "reports")

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    # ── Model Evaluation Metrics (from evaluation_metrics.csv) ────────────────
    model_accuracy: float = 0.9038
    model_precision: float = 0.9125
    model_recall: float = 0.9359
    model_f1: float = 0.9241
    model_roc_auc: float = 0.9595


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()
