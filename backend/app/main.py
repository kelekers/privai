from contextlib import asynccontextmanager
from pathlib import Path
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.ai.detector import create_detector_from_env
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
    version="0.1.0",
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