"""
PneumoVision AI — MongoDB Atlas Connection
Async Motor client with connection pooling and health check.
"""

from __future__ import annotations

import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

logger = logging.getLogger("pneumovision.db")

settings = get_settings()


class DatabaseManager:
    """Manages a single MongoDB connection lifecycle."""

    _client: Optional[AsyncIOMotorClient] = None
    _db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls) -> None:
        """Open the connection pool. Called once at app startup."""
        if cls._client is not None:
            return
        logger.info("Connecting to MongoDB Atlas …")
        cls._client = AsyncIOMotorClient(
            settings.mongodb_uri,
            maxPoolSize=10,
            minPoolSize=1,
            serverSelectionTimeoutMS=10_000,
        )
        cls._db = cls._client[settings.mongodb_db_name]
        # Validate the connection
        await cls._client.admin.command("ping")
        logger.info("✅ MongoDB Atlas connected — DB: %s", settings.mongodb_db_name)
        await cls._ensure_indexes()

    @classmethod
    async def disconnect(cls) -> None:
        """Close the connection pool. Called at app shutdown."""
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._db = None
            logger.info("MongoDB connection closed.")

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        """Return the active database handle."""
        if cls._db is None:
            raise RuntimeError("Database not connected. Call DatabaseManager.connect() first.")
        return cls._db

    @classmethod
    async def _ensure_indexes(cls) -> None:
        """Create necessary indexes for performance."""
        db = cls._db
        # users
        await db["users"].create_index("email", unique=True)
        await db["users"].create_index("username", unique=True)
        # patients
        await db["patients"].create_index("patient_id", unique=True)
        await db["patients"].create_index("email")
        await db["patients"].create_index("doctor_id")
        # predictions
        await db["predictions"].create_index("patient_id")
        await db["predictions"].create_index("created_at")
        # reports
        await db["reports"].create_index("prediction_id", unique=True)
        # audit_logs
        await db["audit_logs"].create_index("timestamp")
        await db["audit_logs"].create_index("user_id")
        # hospital scoping
        await db["users"].create_index("hospital_id")
        await db["patients"].create_index("hospital_id")
        await db["predictions"].create_index("hospital_id")
        logger.info("✅ MongoDB indexes verified.")


async def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency — returns the active DB."""
    return DatabaseManager.get_db()
