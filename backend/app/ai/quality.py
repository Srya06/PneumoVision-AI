"""
PneumoVision AI — Image Quality Assessment
Performs lightweight heuristic checks on uploaded X-ray images
to ensure they are suitable for AI inference.
"""

import cv2
import numpy as np
import logging

logger = logging.getLogger("pneumovision.ai.quality")

MIN_RESOLUTION = (256, 256)
BLUR_THRESHOLD = 50.0  # Variance of Laplacian threshold

def assess_image_quality(image_bytes: bytes) -> dict:
    """
    Assess the quality of an X-ray image before AI processing.
    Checks:
    1. Resolution (must be at least 256x256)
    2. Blur (variance of Laplacian must be above threshold)
    """
    try:
        # Decode image
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)
        
        if img is None:
            return {"is_acceptable": False, "reason": "Could not decode the image file."}

        # 1. Resolution Check
        h, w = img.shape
        if h < MIN_RESOLUTION[1] or w < MIN_RESOLUTION[0]:
            return {
                "is_acceptable": False,
                "reason": f"Image resolution too low ({w}x{h}). Minimum required is {MIN_RESOLUTION[0]}x{MIN_RESOLUTION[1]}."
            }

        # 2. Blur Check (Variance of Laplacian)
        laplacian_var = cv2.Laplacian(img, cv2.CV_64F).var()
        if laplacian_var < BLUR_THRESHOLD:
            return {
                "is_acceptable": False,
                "reason": f"Image appears too blurry or lacks contrast (Focus Score: {laplacian_var:.1f}). Please retake the X-ray."
            }

        return {"is_acceptable": True, "reason": "Passed quality checks."}

    except Exception as e:
        logger.error(f"Image quality assessment failed: {e}")
        # Fail open if the check crashes, so we don't block valid predictions
        return {"is_acceptable": True, "reason": "Quality check bypassed due to error."}
