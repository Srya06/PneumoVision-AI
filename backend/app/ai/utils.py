"""
PneumoVision AI — AI Utilities
Severity mapping, clinical recommendations, file helpers.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.core.config import get_settings

logger = logging.getLogger("pneumovision.utils")
settings = get_settings()


# ── Severity Classification ───────────────────────────────────────────────────

def classify_severity(prediction: str, confidence: float) -> str:
    """
    Determine severity level from prediction label and confidence score.

    Rules
    -----
    NORMAL  → N/A  (regardless of confidence)
    PNEUMONIA:
        confidence ≥ 0.90 → High
        confidence ≥ 0.70 → Medium
        confidence  < 0.70 → Low

    Args:
        prediction: "NORMAL" or "PNEUMONIA"
        confidence: Float in [0, 1]

    Returns:
        Severity string: "N/A" | "Low" | "Medium" | "High"
    """
    if prediction == "NORMAL":
        return "N/A"
    if confidence >= 0.90:
        return "High"
    if confidence >= 0.70:
        return "Medium"
    return "Low"


# ── Clinical Recommendations ──────────────────────────────────────────────────

_PNEUMONIA_RECOMMENDATIONS: dict[str, list[str]] = {
    "High": [
        "Immediate pulmonologist consultation strongly recommended.",
        "High-confidence pneumonia detected — initiate treatment protocol.",
        "Consider hospital admission and antibiotic therapy.",
        "Monitor oxygen saturation and vital signs closely.",
        "Clinical correlation with patient symptoms and blood work advised.",
        "Repeat chest X-ray in 48–72 hours to assess progression.",
    ],
    "Medium": [
        "Pulmonologist consultation recommended.",
        "Moderate confidence — clinical correlation is advised.",
        "Consider sputum culture and sensitivity testing.",
        "Empirical antibiotic therapy may be initiated per clinical judgement.",
        "Follow-up chest X-ray in 1 week recommended.",
        "Monitor for symptom progression.",
    ],
    "Low": [
        "Radiological findings are suggestive — further evaluation advised.",
        "Low-confidence finding — clinical correlation essential.",
        "Consider additional imaging (CT chest) if clinically indicated.",
        "Lab investigations (CBC, CRP) may provide additional clarity.",
        "Reassess in 48–72 hours if symptoms persist.",
    ],
}

_NORMAL_RECOMMENDATIONS: list[str] = [
    "No evidence of pneumonia detected on this chest X-ray.",
    "Continue routine monitoring as clinically appropriate.",
    "Report should be correlated with clinical presentation.",
    "If symptoms persist, consider repeat imaging.",
]


def get_recommendations(prediction: str, severity: str) -> list[str]:
    """
    Return a list of clinical recommendation strings.

    Args:
        prediction: "NORMAL" or "PNEUMONIA"
        severity: "N/A" | "Low" | "Medium" | "High"

    Returns:
        List of clinical recommendation strings.
    """
    if prediction == "NORMAL":
        recs = list(_NORMAL_RECOMMENDATIONS)
    else:
        recs = list(_PNEUMONIA_RECOMMENDATIONS.get(severity, _PNEUMONIA_RECOMMENDATIONS["Low"]))
        
    # Phase 8: Clinical Decision Support Disclaimer
    recs.append("DISCLAIMER: AI-assisted clinical decision support only. Must be verified by a qualified radiologist.")
    return recs


# ── File Helpers ──────────────────────────────────────────────────────────────

def ensure_dirs() -> None:
    """Create all required storage directories if they don't exist."""
    for dir_name in [settings.upload_dir, settings.heatmap_dir, settings.report_dir]:
        Path(dir_name).mkdir(parents=True, exist_ok=True)
    logger.debug("Storage directories verified.")


def format_confidence(confidence: float) -> str:
    """Format confidence float to percentage string. E.g. 0.9783 → '97.83%'"""
    return f"{confidence * 100:.2f}%"


def format_inference_time(seconds: float) -> str:
    """Format inference time to human-readable string. E.g. 0.184 → '0.18 sec'"""
    return f"{seconds:.2f} sec"


def sanitize_patient_id(patient_id: str) -> str:
    """Strip non-alphanumeric characters from patient ID for use in filenames."""
    return "".join(c for c in patient_id if c.isalnum() or c in ("-", "_"))


def build_heatmap_url(heatmap_path: str) -> str:
    """Convert a relative heatmap path to a public URL path."""
    return f"/{heatmap_path}"


def build_image_url(image_path: str) -> str:
    """Convert a relative upload path to a public URL path."""
    return f"/{image_path}"
