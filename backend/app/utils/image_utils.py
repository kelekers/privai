from pathlib import Path
from typing import Tuple
import uuid

import cv2
import numpy as np


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def validate_image_filename(filename: str) -> None:
    suffix = Path(filename).suffix.lower()

    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_IMAGE_EXTENSIONS))
        raise ValueError(f"Unsupported image format. Allowed formats: {allowed}")


def read_image_bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Failed to decode image. The file may be corrupted or unsupported.")

    return image


def generate_runtime_filename(original_filename: str, prefix: str = "input") -> str:
    suffix = Path(original_filename).suffix.lower()
    unique_id = uuid.uuid4().hex[:12]
    return f"{prefix}_{unique_id}{suffix}"


def get_image_shape(image: np.ndarray) -> Tuple[int, int, int]:
    height, width = image.shape[:2]
    channels = image.shape[2] if len(image.shape) == 3 else 1
    return height, width, channels