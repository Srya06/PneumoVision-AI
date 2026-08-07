"""
PneumoVision AI — Image Preprocessing
Preprocessing pipeline must exactly match training-time preprocessing.

Training configuration:
    - Input size : 224 × 224 px
    - Color mode : RGB
    - Normalization: tf.keras.applications.vgg16.preprocess_input()
      (subtracts ImageNet mean, converts RGB → BGR, no scaling to [0,1])
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

import cv2
import pydicom
import numpy as np
import tensorflow as tf
from PIL import Image

from app.core.config import get_settings

logger = logging.getLogger("pneumovision.preprocess")
settings = get_settings()

TARGET_SIZE: int = settings.image_size  # 224


def load_image_from_bytes(data: bytes) -> Image.Image:
    """
    Load raw file bytes into a PIL Image in RGB mode. Supports DICOM.
    """
    try:
        if len(data) > 132 and data[128:132] == b"DICM":
            ds = pydicom.dcmread(io.BytesIO(data))
            arr = ds.pixel_array.astype(np.float32)
            min_val = float(np.min(arr))
            max_val = float(np.max(arr))
            if max_val > min_val:
                arr = (arr - min_val) / (max_val - min_val)
            else:
                arr = np.zeros_like(arr)
            arr = (arr * 255).astype(np.uint8)
            if len(arr.shape) == 2:
                arr = cv2.cvtColor(arr, cv2.COLOR_GRAY2RGB)
            return Image.fromarray(arr)
            
        img = Image.open(io.BytesIO(data)).convert("RGB")
        return img
    except Exception as exc:
        raise ValueError(f"Cannot open image: {exc}") from exc


def check_image_quality(img: Image.Image) -> float:
    """Check image for blurriness using Laplacian variance."""
    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    if variance < 50.0: # Threshold for blur
        raise ValueError(f"Image quality check failed. The image is too blurry (variance: {variance:.2f}). Please upload a clearer X-ray.")
    return variance


def load_image_from_path(path: str | Path) -> Image.Image:
    """Load a saved image file from disk in RGB mode."""
    try:
        img = Image.open(str(path)).convert("RGB")
        return img
    except Exception as exc:
        raise ValueError(f"Cannot open image at {path}: {exc}") from exc


def resize_image(img: Image.Image, size: int = TARGET_SIZE) -> Image.Image:
    """Resize a PIL Image to (size × size) using high-quality Lanczos resampling."""
    return img.resize((size, size), Image.Resampling.LANCZOS)


def pil_to_tensor(img: Image.Image) -> tf.Tensor:
    """
    Convert a PIL Image → NumPy array → VGG16-preprocessed TensorFlow tensor.

    Steps
    -----
    1. PIL Image → uint8 NumPy array (H, W, 3)
    2. Cast to float32
    3. Apply tf.keras.applications.vgg16.preprocess_input()
       • Subtracts ImageNet channel means [103.939, 116.779, 123.68]
       • Converts RGB → BGR channel order
    4. Add batch dimension → shape (1, 224, 224, 3)

    Returns:
        tf.Tensor of shape (1, 224, 224, 3) ready for model inference.
    """
    arr = np.array(img, dtype=np.float32)          # (224, 224, 3)
    arr = tf.keras.applications.vgg16.preprocess_input(arr)  # in-place channel shift
    tensor = tf.convert_to_tensor(arr)
    tensor = tf.expand_dims(tensor, axis=0)         # → (1, 224, 224, 3)
    return tensor


def preprocess_bytes(data: bytes) -> tuple[tf.Tensor, Image.Image]:
    """
    Full preprocessing pipeline for uploaded image bytes.

    Args:
        data: Raw bytes from an uploaded JPEG/PNG/DICOM file.

    Returns:
        Tuple of (tensor for inference, resized PIL image for Grad-CAM).
    """
    img = load_image_from_bytes(data)
    check_image_quality(img)
    img_resized = resize_image(img)
    tensor = pil_to_tensor(img_resized)
    logger.debug("Preprocessed image → tensor shape: %s", tensor.shape)
    return tensor, img_resized


def preprocess_path(path: str | Path) -> tuple[tf.Tensor, Image.Image]:
    """
    Full preprocessing pipeline for an image file on disk.

    Args:
        path: Absolute or relative path to the image file.

    Returns:
        Tuple of (tensor for inference, resized PIL image for Grad-CAM).
    """
    img = load_image_from_path(path)
    img_resized = resize_image(img)
    tensor = pil_to_tensor(img_resized)
    return tensor, img_resized
