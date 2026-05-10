import os
import threading
import time
from typing import Dict, List, Optional

import cv2
import numpy as np

from app.services.redaction_service import redact_image


def resize_keep_aspect(frame: np.ndarray, target_width: int) -> np.ndarray:
    if target_width <= 0:
        return frame

    height, width = frame.shape[:2]

    if width <= target_width:
        return frame

    ratio = target_width / float(width)
    target_height = int(height * ratio)

    return cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)


class LiveTurboSession:
    """
    Fast local webcam pipeline.

    Capture/output runs continuously.
    YOLO inference runs in a separate thread.
    Every output frame uses the latest detection boxes.

    This makes the preview smooth even when inference is slower than camera FPS.
    """

    def __init__(
        self,
        *,
        detector,
        camera_index: int,
        confidence_threshold: float,
        redaction_mode: str,
        active_classes: List[str],
        target_width: int = 640,
        infer_interval_ms: int = 90,
        jpeg_quality: int = 75,
    ) -> None:
        self.detector = detector
        self.camera_index = camera_index
        self.confidence_threshold = confidence_threshold
        self.redaction_mode = redaction_mode
        self.active_classes = active_classes
        self.target_width = target_width
        self.infer_interval_ms = infer_interval_ms
        self.jpeg_quality = jpeg_quality

        self.running = False
        self.lock = threading.Lock()

        self.capture_thread: Optional[threading.Thread] = None
        self.inference_thread: Optional[threading.Thread] = None

        self.cap = None
        self.latest_frame = None
        self.latest_detections = []
        self.latest_stats: Dict = {
            "latency_ms": 0,
            "detection_count": 0,
            "redacted_count": 0,
            "device": getattr(detector, "device", "unknown"),
        }

        self.frame_counter = 0
        self.inference_counter = 0
        self.started_at = None
        self.last_error = None

    def start(self) -> None:
        if self.running:
            return

        self.running = True
        self.started_at = time.time()
        self.last_error = None

        api_preference = cv2.CAP_DSHOW if os.name == "nt" else cv2.CAP_ANY
        self.cap = cv2.VideoCapture(self.camera_index, api_preference)

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.target_width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(self.target_width * 0.75))
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if not self.cap.isOpened():
            self.running = False
            raise RuntimeError(f"Failed to open camera index {self.camera_index}.")

        self.capture_thread = threading.Thread(
            target=self._capture_loop,
            name="PrivAI-TurboLive-Capture",
            daemon=True,
        )
        self.inference_thread = threading.Thread(
            target=self._inference_loop,
            name="PrivAI-TurboLive-Inference",
            daemon=True,
        )

        self.capture_thread.start()
        self.inference_thread.start()

    def stop(self) -> None:
        self.running = False

        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=1.0)

        if self.inference_thread and self.inference_thread.is_alive():
            self.inference_thread.join(timeout=1.0)

        if self.cap is not None:
            self.cap.release()
            self.cap = None

    def _capture_loop(self) -> None:
        while self.running:
            try:
                ok, frame = self.cap.read()

                if not ok or frame is None:
                    time.sleep(0.01)
                    continue

                frame = resize_keep_aspect(frame, self.target_width)

                with self.lock:
                    self.latest_frame = frame
                    self.frame_counter += 1

                time.sleep(0.001)

            except Exception as exc:
                self.last_error = str(exc)
                time.sleep(0.05)

    def _inference_loop(self) -> None:
        while self.running:
            started = time.perf_counter()

            try:
                with self.lock:
                    frame = None if self.latest_frame is None else self.latest_frame.copy()

                if frame is None:
                    time.sleep(0.01)
                    continue

                result = self.detector.predict(
                    image=frame,
                    confidence_threshold=self.confidence_threshold,
                )

                with self.lock:
                    self.latest_detections = result.get("detections", [])
                    self.latest_stats = {
                        "latency_ms": result.get("latency_ms", 0),
                        "detection_count": result.get("detection_count", 0),
                        "redacted_count": 0,
                        "device": result.get("device", "unknown"),
                    }
                    self.inference_counter += 1

            except Exception as exc:
                self.last_error = str(exc)

            elapsed_ms = (time.perf_counter() - started) * 1000
            sleep_ms = max(1, self.infer_interval_ms - elapsed_ms)
            time.sleep(sleep_ms / 1000.0)

    def get_status(self) -> Dict:
        with self.lock:
            uptime = 0 if self.started_at is None else round(time.time() - self.started_at, 2)

            return {
                "running": self.running,
                "camera_index": self.camera_index,
                "confidence_threshold": self.confidence_threshold,
                "redaction_mode": self.redaction_mode,
                "active_classes": self.active_classes,
                "target_width": self.target_width,
                "infer_interval_ms": self.infer_interval_ms,
                "jpeg_quality": self.jpeg_quality,
                "frame_counter": self.frame_counter,
                "inference_counter": self.inference_counter,
                "latest_stats": self.latest_stats,
                "uptime_seconds": uptime,
                "last_error": self.last_error,
            }

    def _placeholder_frame(self) -> np.ndarray:
        frame = np.zeros((360, 640, 3), dtype=np.uint8)

        cv2.putText(
            frame,
            "PrivAI Turbo Live starting...",
            (48, 180),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

        return frame

    def get_encoded_frame(self) -> bytes:
        with self.lock:
            frame = None if self.latest_frame is None else self.latest_frame.copy()
            detections = list(self.latest_detections)

        if frame is None:
            frame = self._placeholder_frame()
            redacted_count = 0
        else:
            redaction_result = redact_image(
                image=frame,
                detections=detections,
                mode=self.redaction_mode,
                active_classes=self.active_classes,
                label_enabled=False,
                label_text="",
            )
            frame = redaction_result["image"]
            redacted_count = redaction_result["redacted_count"]

        with self.lock:
            self.latest_stats["redacted_count"] = redacted_count

        ok, encoded = cv2.imencode(
            ".jpg",
            frame,
            [int(cv2.IMWRITE_JPEG_QUALITY), int(self.jpeg_quality)],
        )

        if not ok:
            raise RuntimeError("Failed to encode MJPEG frame.")

        return encoded.tobytes()

    def mjpeg_generator(self):
        boundary = b"--frame\r\n"

        while self.running:
            try:
                frame_bytes = self.get_encoded_frame()

                yield (
                    boundary
                    + b"Content-Type: image/jpeg\r\n"
                    + b"Cache-Control: no-cache\r\n\r\n"
                    + frame_bytes
                    + b"\r\n"
                )

                # Output stream can stay smooth even if inference is slower.
                time.sleep(1 / 30)

            except GeneratorExit:
                break

            except Exception as exc:
                self.last_error = str(exc)
                time.sleep(0.05)
