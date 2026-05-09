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


def cv2_image_to_bytes(image: np.ndarray, extension: str = ".jpg") -> bytes:
    if extension.lower() == ".jpeg":
        extension = ".jpg"

    success, encoded_image = cv2.imencode(extension, image)

    if not success:
        raise ValueError("Failed to encode image.")

    return encoded_image.tobytes()


def save_cv2_image(image: np.ndarray, output_path: str | Path) -> None:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    success = cv2.imwrite(str(output_path), image)

    if not success:
        raise ValueError(f"Failed to save image to {output_path}")


def generate_runtime_filename(original_filename: str, prefix: str = "input") -> str:
    suffix = Path(original_filename).suffix.lower()

    if suffix == ".jpeg":
        suffix = ".jpg"

    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        suffix = ".jpg"

    unique_id = uuid.uuid4().hex[:12]
    return f"{prefix}_{unique_id}{suffix}"


def get_image_shape(image: np.ndarray) -> Tuple[int, int, int]:
    height, width = image.shape[:2]
    channels = image.shape[2] if len(image.shape) == 3 else 1
    return height, width, channels


def clamp_box_to_image(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    image_width: int,
    image_height: int,
) -> Tuple[int, int, int, int]:
    left = max(0, min(int(round(x1)), image_width - 1))
    top = max(0, min(int(round(y1)), image_height - 1))
    right = max(0, min(int(round(x2)), image_width))
    bottom = max(0, min(int(round(y2)), image_height))

    if right <= left:
        right = min(left + 1, image_width)

    if bottom <= top:
        bottom = min(top + 1, image_height)

    return left, top, right, bottom