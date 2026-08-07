"""
PneumoVision AI — TensorFlow Model Loader (Singleton)
Loads the VGG16 keras model exactly once at startup.
All prediction requests share the same in-memory model instance.

IMPORTANT: This model was saved with tf.keras (legacy Keras 2).
TF_USE_LEGACY_KERAS=1 must be set BEFORE importing TensorFlow.
This is handled via the os.environ call below.
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Optional

# ── MUST be set BEFORE importing tensorflow ────────────────────────────────
# TF_USE_LEGACY_KERAS=1 is required to load models saved with older tf.keras
# (legacy HDF5-format .keras files). tf_keras==2.17.0 must be installed.
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

import tensorflow as tf  # noqa: E402

from app.core.config import get_settings

logger = logging.getLogger("pneumovision.model")
settings = get_settings()


class ModelLoader:
    """
    Singleton class that loads and caches the TensorFlow/Keras model.
    The model was trained with tf.keras (legacy Keras 2 format) and saved
    as an HDF5 file with a .keras extension.
    TF_USE_LEGACY_KERAS=1 is required for correct loading.
    """

    _model: Optional[tf.keras.Model] = None
    _model_path: Optional[str] = None
    _load_time: Optional[float] = None

    @classmethod
    def load(cls) -> None:
        """
        Load the keras model from disk.
        Safe to call multiple times — only loads once.
        """
        if cls._model is not None:
            logger.info("Model already loaded — skipping reload.")
            return

        # Resolve model path — search multiple locations
        # __file__ = backend/app/ai/model_loader.py
        # parents[3] = PneumoVision-AI (project root)
        current_file = Path(__file__).resolve()
        project_root = current_file.parents[3]

        possible_paths = [
            project_root / "pneumovision_vgg16_final.keras",
            project_root.parent / "pneumovision_vgg16_final.keras",
            Path.cwd() / "pneumovision_vgg16_final.keras",
            Path.cwd().parent / "pneumovision_vgg16_final.keras",
            Path(settings.model_path),
        ]

        model_path = None
        for p in possible_paths:
            resolved = p.resolve()
            if resolved.exists() and resolved.is_file():
                model_path = resolved
                break

        if not model_path:
            searched = [str(p) for p in possible_paths]
            raise FileNotFoundError(
                f"Model file 'pneumovision_vgg16_final.keras' not found.\n"
                f"Searched: {searched}"
            )

        logger.info("Loading TensorFlow model from: %s", model_path)
        logger.info("tf.keras version: %s", tf.__version__)
        t0 = time.perf_counter()

        # Load model using tf.keras (legacy Keras 2 format via tf_keras)
        cls._model = tf.keras.models.load_model(str(model_path), compile=False)
        cls._model_path = str(model_path)
        cls._load_time = time.perf_counter() - t0

        # Warm up with a dummy batch to force graph compilation
        dummy = tf.zeros((1, settings.image_size, settings.image_size, 3))
        cls._model(dummy, training=False)

        logger.info(
            "✅ Model loaded in %.2f s | Input shape: %s | Output shape: %s",
            cls._load_time,
            cls._model.input_shape,
            cls._model.output_shape,
        )

    @classmethod
    def get_model(cls) -> tf.keras.Model:
        if cls._model is None:
            raise RuntimeError(
                "Model not loaded. Ensure ModelLoader.load() is called at startup."
            )
        return cls._model

    @classmethod
    def model_info(cls) -> dict:
        if cls._model is None:
            return {"status": "not_loaded"}
        return {
            "status": "loaded",
            "version": settings.model_version,
            "path": cls._model_path,
            "load_time_sec": round(cls._load_time or 0, 3),
            "input_shape": str(cls._model.input_shape),
            "output_shape": str(cls._model.output_shape),
            "metrics": {
                "accuracy": settings.model_accuracy,
                "precision": settings.model_precision,
                "recall": settings.model_recall,
                "f1_score": settings.model_f1,
                "roc_auc": settings.model_roc_auc,
            },
        }
