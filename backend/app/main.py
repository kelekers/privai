from contextlib import asynccontextmanager
from pathlib import Path
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.ai.detector import create_detector_from_env
from app.core.redaction_config import (
    RedactionProfile,
    get_allowed_profiles,
    get_allowed_redaction_modes,
    get_redaction_rule,
    is_allowed_redaction_mode,
)
from app.services.redaction_service import redact_image
from app.services.storage_service import (
    get_redacted_dir,
    save_operational_metadata,
    save_redacted_image_to_operational_zone,
)
from app.utils.image_utils import (
    get_image_shape,
    read_image_bytes_to_cv2,
    validate_image_filename,
)

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "PrivAI MVP API")
APP_ENV = os.getenv("APP_ENV", "development")

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

detector = create_detector_from_env()


def ensure_runtime_directories() -> None:
    directories = [
        "./storage/operational_zone/redacted",
        "./storage/operational_zone/metadata",
        "./storage/sovereign_vault/encrypted_original",
        "./storage/sovereign_vault/metadata",
        "./storage/audit",
        "./models",
    ]

    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_runtime_directories()

    try:
        detector.load()
        print("[PrivAI] YOLO model loaded successfully.")
        print(f"[PrivAI] Device: {detector.device}")
        print(f"[PrivAI] Model classes: {detector.get_model_names()}")
    except Exception as exc:
        print(f"[PrivAI] Warning: failed to load YOLO model: {exc}")

    yield


app = FastAPI(
    title=APP_NAME,
    version="0.2.0",
    description="Government-first local privacy protection MVP for PrivAI.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    app: str
    environment: str
    operational_zone: str
    sovereign_vault: str
    model_loaded: bool
    device: str


@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        app=APP_NAME,
        environment=APP_ENV,
        operational_zone="ready",
        sovereign_vault="ready",
        model_loaded=detector.is_loaded(),
        device=detector.device,
    )


@app.get("/api/model-info")
def model_info():
    model_path = os.getenv("MODEL_PATH", "./models/privai_yolo.pt")
    exists = Path(model_path).exists()

    return {
        "model_path": model_path,
        "model_exists": exists,
        "model_loaded": detector.is_loaded(),
        "device": detector.device,
        "model_classes": detector.get_model_names(),
        "expected_classes": os.getenv(
            "DEFAULT_ACTIVE_CLASSES",
            "KTP,SIM,Paspor,NIK_Teks,Wajah,Plat_Nomor",
        ).split(","),
    }


@app.get("/api/redaction-config")
def redaction_config():
    return {
        "default_government_profile": get_redaction_rule(
            RedactionProfile.GOVERNMENT.value
        ),
        "default_live_webcam_profile": get_redaction_rule(
            RedactionProfile.LIVE_WEBCAM.value
        ),
        "allowed_profiles": get_allowed_profiles(),
        "allowed_redaction_modes": get_allowed_redaction_modes(),
        "note": (
            "Government profile uses black_box by default. "
            "Live webcam profile uses blur by default. "
            "Dynamic Injection will be implemented in a later sprint."
        ),
    }


@app.post("/api/infer")
async def infer_image(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(
        default=0.35,
        ge=0.01,
        le=0.99,
        description="YOLO confidence threshold",
    ),
):
    if not detector.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="YOLO model is not loaded. Check MODEL_PATH and model file.",
        )

    try:
        validate_image_filename(file.filename or "")
        image_bytes = await file.read()
        image = read_image_bytes_to_cv2(image_bytes)
        height, width, channels = get_image_shape(image)

        result = detector.predict(
            image=image,
            confidence_threshold=confidence_threshold,
        )

        return {
            "filename": file.filename,
            "image": {
                "width": width,
                "height": height,
                "channels": channels,
            },
            "confidence_threshold": confidence_threshold,
            **result,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(exc)}",
        )


@app.post("/api/redact")
async def redact_uploaded_image(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(
        default=0.35,
        ge=0.01,
        le=0.99,
        description="YOLO confidence threshold",
    ),
    profile: str = Query(
        default=RedactionProfile.GOVERNMENT.value,
        description="Redaction profile: government or live_webcam",
    ),
    redaction_mode: str | None = Query(
        default=None,
        description="Optional override: black_box, blur, or pixelate",
    ),
):
    if not detector.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="YOLO model is not loaded. Check MODEL_PATH and model file.",
        )

    try:
        validate_image_filename(file.filename or "")

        image_bytes = await file.read()
        image = read_image_bytes_to_cv2(image_bytes)
        height, width, channels = get_image_shape(image)

        rule = get_redaction_rule(profile)

        selected_mode = redaction_mode or rule["mode"]

        if not is_allowed_redaction_mode(selected_mode):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported redaction mode: {selected_mode}",
            )

        inference_result = detector.predict(
            image=image,
            confidence_threshold=confidence_threshold,
        )

        redaction_result = redact_image(
            image=image,
            detections=inference_result["detections"],
            mode=selected_mode,
            active_classes=rule["active_classes"],
            label_enabled=rule["label_enabled"],
            label_text=rule["label_text"],
        )

        saved_redacted = save_redacted_image_to_operational_zone(
            image=redaction_result["image"],
            original_filename=file.filename or "uploaded_image.jpg",
        )

        metadata_result = save_operational_metadata(
            {
                "original_filename": file.filename,
                "redacted_filename": saved_redacted["filename"],
                "redaction_profile": profile,
                "redaction_mode": selected_mode,
                "confidence_threshold": confidence_threshold,
                "image": {
                    "width": width,
                    "height": height,
                    "channels": channels,
                },
                "device": inference_result["device"],
                "latency_ms": inference_result["latency_ms"],
                "detection_count": inference_result["detection_count"],
                "redacted_count": redaction_result["redacted_count"],
                "detections": inference_result["detections"],
                "redacted_detections": redaction_result["redacted_detections"],
            }
        )

        return {
            "filename": file.filename,
            "image": {
                "width": width,
                "height": height,
                "channels": channels,
            },
            "profile": profile,
            "redaction_mode": selected_mode,
            "confidence_threshold": confidence_threshold,
            "device": inference_result["device"],
            "latency_ms": inference_result["latency_ms"],
            "detection_count": inference_result["detection_count"],
            "redacted_count": redaction_result["redacted_count"],
            "detections": inference_result["detections"],
            "redacted_detections": redaction_result["redacted_detections"],
            "skipped_detections": redaction_result["skipped_detections"],
            "operational_zone": {
                "redacted_file": saved_redacted,
                "metadata_file": metadata_result,
                "stores_private_original": False,
                "note": "Operational Zone stores redacted output and non-private metadata only.",
            },
        }

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Redaction failed: {str(exc)}",
        )


@app.get("/api/files/redacted/{filename}")
def get_redacted_file(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    file_path = get_redacted_dir() / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Redacted file not found.")

    return FileResponse(
        path=file_path,
        media_type="image/jpeg",
        filename=filename,
    )