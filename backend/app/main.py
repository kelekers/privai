from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "PrivAI MVP API")
APP_ENV = os.getenv("APP_ENV", "development")

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")


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


ensure_runtime_directories()

app = FastAPI(
    title=APP_NAME,
    version="0.1.0",
    description="Government-first local privacy protection MVP for PrivAI.",
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


@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        app=APP_NAME,
        environment=APP_ENV,
        operational_zone="ready",
        sovereign_vault="ready",
    )


@app.get("/api/model-info")
def model_info():
    model_path = os.getenv("MODEL_PATH", "./models/privai_yolo.pt")
    exists = Path(model_path).exists()

    return {
        "model_path": model_path,
        "model_exists": exists,
        "device": os.getenv("MODEL_DEVICE", "auto"),
        "expected_classes": os.getenv(
            "DEFAULT_ACTIVE_CLASSES",
            "KTP,SIM,Paspor,NIK_Teks,Wajah,Plat_Nomor",
        ).split(","),
        "note": "Actual YOLO loading will be implemented in Sprint 1.",
    }