from typing import Any, Dict, List, Tuple
import time

import cv2

from app.ai.class_map import normalize_class_name
from app.utils.image_utils import clamp_box_to_image


def parse_tta_angles(value: str | None) -> List[int]:
    if not value:
        return [0, 180]

    angles = []

    for item in value.split(","):
        item = item.strip()

        if not item:
            continue

        angle = int(item) % 360

        if angle not in {0, 90, 180, 270}:
            raise ValueError("TTA angles must be one of: 0, 90, 180, 270.")

        if angle not in angles:
            angles.append(angle)

    return angles or [0, 180]


def rotate_image(image, angle: int):
    angle = angle % 360

    if angle == 0:
        return image

    if angle == 90:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)

    if angle == 180:
        return cv2.rotate(image, cv2.ROTATE_180)

    if angle == 270:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)

    raise ValueError(f"Unsupported angle: {angle}")


def map_rotated_point_to_original(
    x: float,
    y: float,
    angle: int,
    original_width: int,
    original_height: int,
) -> Tuple[float, float]:
    angle = angle % 360

    if angle == 0:
        return x, y

    if angle == 90:
        return y, original_height - x

    if angle == 180:
        return original_width - x, original_height - y

    if angle == 270:
        return original_width - y, x

    raise ValueError(f"Unsupported angle: {angle}")


def map_rotated_box_to_original(
    box: Dict[str, float],
    angle: int,
    original_width: int,
    original_height: int,
) -> Dict[str, float]:
    x1 = float(box["x1"])
    y1 = float(box["y1"])
    x2 = float(box["x2"])
    y2 = float(box["y2"])

    points = [
        map_rotated_point_to_original(x1, y1, angle, original_width, original_height),
        map_rotated_point_to_original(x2, y1, angle, original_width, original_height),
        map_rotated_point_to_original(x1, y2, angle, original_width, original_height),
        map_rotated_point_to_original(x2, y2, angle, original_width, original_height),
    ]

    xs = [point[0] for point in points]
    ys = [point[1] for point in points]

    left, top, right, bottom = clamp_box_to_image(
        x1=min(xs),
        y1=min(ys),
        x2=max(xs),
        y2=max(ys),
        image_width=original_width,
        image_height=original_height,
    )

    return {
        "x1": round(float(left), 2),
        "y1": round(float(top), 2),
        "x2": round(float(right), 2),
        "y2": round(float(bottom), 2),
    }


def box_iou(box_a: Dict[str, float], box_b: Dict[str, float]) -> float:
    ax1, ay1, ax2, ay2 = box_a["x1"], box_a["y1"], box_a["x2"], box_a["y2"]
    bx1, by1, bx2, by2 = box_b["x1"], box_b["y1"], box_b["x2"], box_b["y2"]

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)

    union = area_a + area_b - inter_area

    if union <= 0:
        return 0.0

    return inter_area / union


def classwise_nms(
    detections: List[Dict[str, Any]],
    iou_threshold: float = 0.55,
) -> List[Dict[str, Any]]:
    sorted_detections = sorted(
        detections,
        key=lambda item: float(item.get("confidence", 0)),
        reverse=True,
    )

    kept = []

    for detection in sorted_detections:
        class_name = normalize_class_name(detection.get("class_name", "Unknown"))
        should_keep = True

        for existing in kept:
            existing_class = normalize_class_name(existing.get("class_name", "Unknown"))

            if class_name != existing_class:
                continue

            if box_iou(detection["box"], existing["box"]) >= iou_threshold:
                should_keep = False
                break

        if should_keep:
            kept.append(detection)

    return kept


def robust_predict_with_tta(
    *,
    detector,
    image,
    confidence_threshold: float,
    tta_angles: str | None = "0,180",
    iou_threshold: float = 0.55,
) -> Dict[str, Any]:
    original_height, original_width = image.shape[:2]
    angles = parse_tta_angles(tta_angles)

    all_detections = []
    total_latency_ms = 0.0
    device = getattr(detector, "device", "unknown")

    started = time.perf_counter()

    for angle in angles:
        rotated_image = rotate_image(image, angle)

        result = detector.predict(
            image=rotated_image,
            confidence_threshold=confidence_threshold,
        )

        total_latency_ms += float(result.get("latency_ms", 0))
        device = result.get("device", device)

        for detection in result.get("detections", []):
            mapped_detection = {
                **detection,
                "class_name": normalize_class_name(detection.get("class_name", "Unknown")),
                "box": map_rotated_box_to_original(
                    detection["box"],
                    angle,
                    original_width,
                    original_height,
                ),
                "tta_angle": angle,
            }

            all_detections.append(mapped_detection)

    merged_detections = classwise_nms(
        all_detections,
        iou_threshold=iou_threshold,
    )

    wall_latency_ms = round((time.perf_counter() - started) * 1000, 2)

    return {
        "latency_ms": wall_latency_ms,
        "raw_tta_latency_ms": round(total_latency_ms, 2),
        "device": device,
        "detections": merged_detections,
        "detection_count": len(merged_detections),
        "robustness": {
            "document_tta_enabled": True,
            "tta_angles": angles,
            "nms_iou_threshold": iou_threshold,
            "note": "Document TTA helps detect upside-down or rotated documents without retraining.",
        },
    }
