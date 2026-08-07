"""
PneumoVision AI — Grad-CAM Heatmap Generator
Production-ready implementation using TensorFlow GradientTape.

Grad-CAM: Gradient-weighted Class Activation Mapping
Paper: Selvaraju et al., 2017 — https://arxiv.org/abs/1610.02391

Algorithm
---------
1. Build a sub-model from input → [last_conv_output, model_output].
2. Record gradients of the predicted class score w.r.t. the conv feature maps.
3. Pool gradients spatially (global average) → importance weights.
4. Weighted sum of feature maps → raw CAM.
5. ReLU → normalize → resize to 224×224 → apply colormap → overlay on original.
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image

from app.core.config import get_settings

logger = logging.getLogger("pneumovision.gradcam")
settings = get_settings()

# Last convolutional layer name in VGG16
LAST_CONV_LAYER = "block5_conv3"


def _build_gradcam_model(model: tf.keras.Model) -> tf.keras.Model:
    """
    Build a sub-model that outputs both the last conv layer activations
    and the final prediction logits.

    Args:
        model: The loaded VGG16 Keras model.

    Returns:
        A Keras Model with two outputs: [conv_outputs, predictions].
    """
    try:
        last_conv = model.get_layer(LAST_CONV_LAYER)
    except ValueError:
        # Fall back: find the last Conv2D layer automatically
        last_conv = next(
            layer for layer in reversed(model.layers)
            if isinstance(layer, tf.keras.layers.Conv2D)
        )
        logger.warning("Layer '%s' not found; using '%s' instead.", LAST_CONV_LAYER, last_conv.name)

    return tf.keras.Model(
        inputs=model.inputs,
        outputs=[last_conv.output, model.output],
    )


def _compute_gradcam(
    gradcam_model: tf.keras.Model,
    tensor: tf.Tensor,
    class_index: int = 0,
) -> np.ndarray:
    """
    Compute the Grad-CAM heatmap array (values in [0, 1]).

    Args:
        gradcam_model: Sub-model with [conv_output, predictions] outputs.
        tensor: Preprocessed input tensor, shape (1, 224, 224, 3).
        class_index: Index of the target class (0 = binary output neuron).

    Returns:
        Normalized heatmap as a float32 NumPy array of shape (224, 224).
    """
    with tf.GradientTape() as tape:
        conv_outputs, predictions = gradcam_model(tensor, training=False)
        tape.watch(conv_outputs)

        # For binary sigmoid output, use the single output neuron
        if predictions.shape[-1] == 1:
            loss = predictions[:, 0]
        else:
            loss = predictions[:, class_index]

    # Gradient of predicted class score w.r.t. last conv layer outputs
    grads = tape.gradient(loss, conv_outputs)          # (1, H, W, C)

    # Global average pool gradients over spatial dims
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))  # (C,)

    # Weight feature maps by pooled gradients
    conv_outputs = conv_outputs[0]                     # (H, W, C)
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]  # (H, W, 1)
    heatmap = tf.squeeze(heatmap)                      # (H, W)

    # ReLU — keep only positive activations
    heatmap = tf.nn.relu(heatmap)

    # Normalize to [0, 1]
    heatmap_np = heatmap.numpy()
    max_val = heatmap_np.max()
    if max_val > 0:
        heatmap_np /= max_val

    return heatmap_np.astype(np.float32)


def _apply_colormap_overlay(
    heatmap: np.ndarray,
    original_img: Image.Image,
    alpha: float = 0.45,
) -> np.ndarray:
    """
    Resize heatmap to match original image, apply JET colormap, and overlay.

    Args:
        heatmap: Float32 array in [0, 1], shape (H, W).
        original_img: Original PIL Image (RGB).
        alpha: Opacity of the heatmap overlay (0 = original, 1 = full heatmap).

    Returns:
        Overlay as a uint8 NumPy array (RGB), same size as original_img.
    """
    h, w = np.array(original_img).shape[:2]

    # Resize heatmap to match original image dimensions
    heatmap_uint8 = np.uint8(255 * heatmap)
    heatmap_resized = cv2.resize(heatmap_uint8, (w, h))

    # Apply JET colormap (BGR output from OpenCV)
    heatmap_colored = cv2.applyColorMap(heatmap_resized, cv2.COLORMAP_JET)

    # Convert original PIL image to BGR NumPy for blending
    original_bgr = cv2.cvtColor(np.array(original_img), cv2.COLOR_RGB2BGR)

    # Weighted blend
    overlay_bgr = cv2.addWeighted(heatmap_colored, alpha, original_bgr, 1 - alpha, 0)

    # Convert back to RGB
    overlay_rgb = cv2.cvtColor(overlay_bgr, cv2.COLOR_BGR2RGB)
    return overlay_rgb


def generate_gradcam(
    model: tf.keras.Model,
    tensor: tf.Tensor,
    original_img: Image.Image,
    patient_id: str,
    class_index: int = 0,
) -> str:
    """
    Full Grad-CAM pipeline: compute heatmap → overlay → save to disk.

    Args:
        model: Loaded VGG16 Keras model.
        tensor: Preprocessed input tensor (1, 224, 224, 3).
        original_img: Resized original PIL Image (for overlay).
        patient_id: Used as filename prefix for the saved heatmap.
        class_index: Target class index for gradient computation.

    Returns:
        Relative path to the saved heatmap overlay PNG (from backend root).
        E.g. "heatmaps/PAT001_abc123.png"
    """
    logger.info("Generating Grad-CAM for patient: %s", patient_id)

    gradcam_model = _build_gradcam_model(model)
    heatmap = _compute_gradcam(gradcam_model, tensor, class_index)
    overlay = _apply_colormap_overlay(heatmap, original_img)

    # Save overlay
    heatmap_dir = Path(settings.heatmap_dir)
    heatmap_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{patient_id}_{uuid.uuid4().hex[:8]}.png"
    save_path = heatmap_dir / filename

    Image.fromarray(overlay).save(str(save_path), format="PNG")
    logger.info("✅ Grad-CAM saved: %s", save_path)

    return f"heatmaps/{filename}"
