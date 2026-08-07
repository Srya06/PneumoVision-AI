"""
PneumoVision AI — Prediction Engine
Full inference pipeline: preprocess → predict → severity → Grad-CAM → recommendations.
"""

from __future__ import annotations

import logging
import time
import uuid
from pathlib import Path

import numpy as np

from app.ai.gradcam import generate_gradcam
from app.ai.model_loader import ModelLoader
from app.ai.preprocess import preprocess_bytes
from app.ai.utils import (
    classify_severity,
    format_confidence,
    format_inference_time,
    get_recommendations,
    sanitize_patient_id,
)
from app.core.config import get_settings

logger = logging.getLogger("pneumovision.predict")
settings = get_settings()

# Class labels — index 0 = NORMAL, index 1 = PNEUMONIA
# Adjust if your model's output ordering differs.
CLASS_LABELS: list[str] = ["NORMAL", "PNEUMONIA"]


def _interpret_output(raw_output: np.ndarray) -> tuple[str, float, int]:
    """
    Interpret raw model output into a prediction label and confidence.

    Handles both:
        • Binary sigmoid output shape (1, 1) — value in [0, 1]
        • Softmax output shape (1, 2) — two class probabilities

    Args:
        raw_output: NumPy array from model(tensor).

    Returns:
        Tuple of (label, confidence_float, class_index)
    """
    if raw_output.shape[-1] == 1:
        # Binary sigmoid: output > 0.5 → PNEUMONIA
        prob = float(raw_output[0, 0])
        class_idx = 1 if prob > 0.5 else 0
        confidence = prob if class_idx == 1 else (1.0 - prob)
    else:
        # Softmax with 2 classes
        class_idx = int(np.argmax(raw_output[0]))
        confidence = float(raw_output[0, class_idx])

    label = CLASS_LABELS[class_idx]
    return label, confidence, class_idx


async def run_prediction_pipeline(
    image_bytes: bytes,
    patient_id: str,
    save_image: bool = True,
) -> dict:
    """
    Execute the full AI prediction pipeline.

    Steps
    -----
    1. Preprocess image bytes → tensor + PIL image
    2. Run TensorFlow inference
    3. Interpret output (label + confidence)
    4. Classify severity
    5. Generate Grad-CAM overlay
    6. Build clinical recommendations
    7. Save uploaded image to disk

    Args:
        image_bytes: Raw bytes of the uploaded chest X-ray image.
        patient_id: Patient identifier used for file naming.
        save_image: Whether to persist the original image to disk.

    Returns:
        Result dict with prediction, confidence, severity, paths, timing, etc.

    Raises:
        RuntimeError: If the model is not loaded.
        ValueError: If the image cannot be processed.
    """
    pid_safe = sanitize_patient_id(patient_id)
    logger.info("Running prediction pipeline for patient: %s", patient_id)

    # ── Step 1: Preprocess ────────────────────────────────────────────────────
    tensor, pil_image = preprocess_bytes(image_bytes)

    # ── Step 2: Inference ─────────────────────────────────────────────────────
    model = ModelLoader.get_model()
    t_start = time.perf_counter()
    raw_output = model(tensor, training=False).numpy()
    t_inference = time.perf_counter() - t_start

    logger.debug("Raw model output: %s | Inference: %.4f s", raw_output, t_inference)

    # ── Step 3: Interpret ─────────────────────────────────────────────────────
    label, confidence, class_idx = _interpret_output(raw_output)

    # ── Step 4: Severity ──────────────────────────────────────────────────────
    severity = classify_severity(label, confidence)

    # ── Step 5: Grad-CAM ──────────────────────────────────────────────────────
    heatmap_path = generate_gradcam(model, tensor, pil_image, pid_safe, class_idx)

    # ── Step 6: Recommendations ───────────────────────────────────────────────
    recommendations = get_recommendations(label, severity)

    # ── Step 7: Save original image ───────────────────────────────────────────
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    image_filename = f"{pid_safe}_{uuid.uuid4().hex[:8]}.png"
    image_path = upload_dir / image_filename
    if save_image:
        pil_image.save(str(image_path), format="PNG")

    result = {
        "patient_id": patient_id,
        "prediction": label,
        "confidence": round(confidence, 6),
        "confidence_pct": format_confidence(confidence),
        "severity": severity,
        "recommendations": recommendations,
        "heatmap_path": heatmap_path,
        "image_path": f"uploads/{image_filename}",
        "inference_time": format_inference_time(t_inference),
        "model_version": settings.model_version,
    }

    logger.info(
        "✅ Prediction complete | %s | %.2f%% confidence | %s severity",
        label,
        confidence * 100,
        severity,
    )
    return result
