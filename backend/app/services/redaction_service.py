from typing import Dict, List, Tuple

import cv2
import numpy as np

from app.ai.class_map import is_sensitive_class, normalize_class_name
from app.core.redaction_config import RedactionMode
from app.utils.image_utils import clamp_box_to_image


def _apply_black_box(
    image: np.ndarray,
    box: Tuple[int, int, int, int],
    label_enabled: bool = True,
    label_text: str = "REDACTED",
) -> None:
    x1, y1, x2, y2 = box

    cv2.rectangle(
        image,
        (x1, y1),
        (x2, y2),
        color=(0, 0, 0),
        thickness=-1,
    )

    if label_enabled:
        label_y = y1 + 20 if y1 + 20 < y2 else y1 + 12

        cv2.putText(
            image,
            label_text,
            (x1 + 6, label_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )


def _apply_blur(
    image: np.ndarray,
    box: Tuple[int, int, int, int],
) -> None:
    x1, y1, x2, y2 = box
    roi = image[y1:y2, x1:x2]

    if roi.size == 0:
        return

    width = x2 - x1
    height = y2 - y1

    kernel_width = max(15, width // 5)
    kernel_height = max(15, height // 5)

    if kernel_width % 2 == 0:
        kernel_width += 1

    if kernel_height % 2 == 0:
        kernel_height += 1

    blurred = cv2.GaussianBlur(roi, (kernel_width, kernel_height), 0)
    image[y1:y2, x1:x2] = blurred


def _apply_pixelate(
    image: np.ndarray,
    box: Tuple[int, int, int, int],
    pixel_size: int = 12,
) -> None:
    x1, y1, x2, y2 = box
    roi = image[y1:y2, x1:x2]

    if roi.size == 0:
        return

    height, width = roi.shape[:2]

    small_width = max(1, width // pixel_size)
    small_height = max(1, height // pixel_size)

    small = cv2.resize(roi, (small_width, small_height), interpolation=cv2.INTER_LINEAR)
    pixelated = cv2.resize(small, (width, height), interpolation=cv2.INTER_NEAREST)

    image[y1:y2, x1:x2] = pixelated


def redact_image(
    image: np.ndarray,
    detections: List[Dict],
    mode: str = RedactionMode.BLACK_BOX.value,
    active_classes: List[str] | None = None,
    label_enabled: bool = True,
    label_text: str = "REDACTED",
) -> Dict:
    redacted_image = image.copy()
    image_height, image_width = redacted_image.shape[:2]

    normalized_active_classes = None

    if active_classes is not None:
        normalized_active_classes = {
            normalize_class_name(class_name) for class_name in active_classes
        }

    redacted_detections = []
    skipped_detections = []

    for detection in detections:
        class_name = normalize_class_name(detection.get("class_name", "Unknown"))

        if normalized_active_classes is not None:
            should_redact = class_name in normalized_active_classes
        else:
            should_redact = is_sensitive_class(class_name)

        if not should_redact:
            skipped_detections.append(
                {
                    **detection,
                    "skip_reason": "class_not_active_or_not_sensitive",
                }
            )
            continue

        box_data = detection.get("box", {})
        x1 = box_data.get("x1", 0)
        y1 = box_data.get("y1", 0)
        x2 = box_data.get("x2", 0)
        y2 = box_data.get("y2", 0)

        box = clamp_box_to_image(
            x1=x1,
            y1=y1,
            x2=x2,
            y2=y2,
            image_width=image_width,
            image_height=image_height,
        )

        if mode == RedactionMode.BLACK_BOX.value:
            _apply_black_box(
                redacted_image,
                box,
                label_enabled=label_enabled,
                label_text=label_text,
            )
        elif mode == RedactionMode.BLUR.value:
            _apply_blur(redacted_image, box)
        elif mode == RedactionMode.PIXELATE.value:
            _apply_pixelate(redacted_image, box)
        else:
            raise ValueError(f"Unsupported redaction mode: {mode}")

        redacted_detections.append(
            {
                **detection,
                "class_name": class_name,
                "redaction_mode": mode,
                "redacted_box": {
                    "x1": box[0],
                    "y1": box[1],
                    "x2": box[2],
                    "y2": box[3],
                },
            }
        )

    return {
        "image": redacted_image,
        "redacted_count": len(redacted_detections),
        "redacted_detections": redacted_detections,
        "skipped_detections": skipped_detections,
    }