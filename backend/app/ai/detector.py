import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import torch
from ultralytics import YOLO

from app.ai.class_map import normalize_class_name


class YOLODetector:
    def __init__(
        self,
        model_path: str,
        device: str = "auto",
        default_confidence: float = 0.35,
    ) -> None:
        self.model_path = Path(model_path)
        self.requested_device = device
        self.default_confidence = default_confidence

        self.model: Optional[YOLO] = None
        self.device = self._resolve_device(device)

    def _resolve_device(self, device: str) -> str:
        if device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"

        if device == "cuda" and not torch.cuda.is_available():
            return "cpu"

        return device

    def load(self) -> None:
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"YOLO model not found at {self.model_path}. "
                "Place your .pt file in backend/models/privai_yolo.pt"
            )

        self.model = YOLO(str(self.model_path))

        # Warm-up ringan akan dilakukan saat inference pertama.
        # Untuk Sprint 1, cukup load model saja.

    def is_loaded(self) -> bool:
        return self.model is not None

    def get_model_names(self) -> Dict[int, str]:
        if self.model is None:
            return {}

        names = getattr(self.model, "names", {})
        return {int(k): str(v) for k, v in names.items()}

    def predict(
        self,
        image,
        confidence_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        if self.model is None:
            raise RuntimeError("YOLO model is not loaded.")

        conf = confidence_threshold or self.default_confidence

        start_time = time.perf_counter()

        results = self.model.predict(
            source=image,
            conf=conf,
            device=self.device,
            verbose=False,
        )

        end_time = time.perf_counter()
        latency_ms = round((end_time - start_time) * 1000, 2)

        detections: List[Dict[str, Any]] = []

        if not results:
            return {
                "latency_ms": latency_ms,
                "device": self.device,
                "detections": detections,
                "detection_count": 0,
            }

        result = results[0]
        names = result.names

        if result.boxes is None:
            return {
                "latency_ms": latency_ms,
                "device": self.device,
                "detections": detections,
                "detection_count": 0,
            }

        for box in result.boxes:
            xyxy = box.xyxy[0].tolist()
            cls_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())

            raw_class_name = names.get(cls_id, str(cls_id))
            class_name = normalize_class_name(raw_class_name)

            x1, y1, x2, y2 = [round(float(value), 2) for value in xyxy]

            detections.append(
                {
                    "class_id": cls_id,
                    "class_name": class_name,
                    "raw_class_name": raw_class_name,
                    "confidence": round(confidence, 4),
                    "box": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    },
                }
            )

        return {
            "latency_ms": latency_ms,
            "device": self.device,
            "detections": detections,
            "detection_count": len(detections),
        }


def create_detector_from_env() -> YOLODetector:
    model_path = os.getenv("MODEL_PATH", "./models/privai_yolo.pt")
    device = os.getenv("MODEL_DEVICE", "auto")

    default_confidence = float(
        os.getenv("DEFAULT_CONFIDENCE_THRESHOLD", "0.35")
    )

    detector = YOLODetector(
        model_path=model_path,
        device=device,
        default_confidence=default_confidence,
    )

    return detector