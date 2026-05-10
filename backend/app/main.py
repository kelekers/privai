from contextlib import asynccontextmanager
import base64
from pathlib import Path
import os
import uuid

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from typing import List, Optional
from pydantic import BaseModel, Field

from app.ai.class_map import normalize_class_name
from app.ai.detector import create_detector_from_env
from app.core.redaction_config import (
    RedactionProfile,
    get_allowed_profiles,
    get_allowed_redaction_modes,
    get_redaction_rule,
    is_allowed_redaction_mode,
)
from app.core.runtime_policy import (
    load_runtime_policy,
    reset_runtime_policy,
    update_runtime_policy,
)
from app.db.database import SessionLocal, init_db
from app.db.repositories import (
    approve_government_access_request,
    create_audit_log,
    create_government_access_request,
    create_operational_metadata,
    create_sovereign_vault_record,
    create_vault_key,
    get_active_vault_key,
    get_government_access_request,
    get_max_vault_key_version,
    get_vault_record_by_record_id,
    list_privacy_records,
    mark_government_access_token_used,
    retire_active_vault_keys,
)
from app.services.crypto_service import (
    decrypt_original_from_bundle,
    encrypt_original_for_vault,
    ensure_vault_keypair,
)
from app.services.government_access_service import (
    generate_one_time_access_token,
    hash_access_token,
    is_datetime_expired,
)
from app.services.live_turbo_service import LiveTurboSession
from app.services.robustness_service import robust_predict_with_tta
from app.services.redaction_service import redact_image
from app.services.storage_service import (
    get_redacted_dir,
    save_operational_metadata,
    save_redacted_image_to_operational_zone,
)
from app.utils.image_utils import (
    cv2_image_to_bytes,
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
TURBO_LIVE_SESSIONS = {}


def ensure_runtime_directories() -> None:
    directories = [
        "./storage/operational_zone/redacted",
        "./storage/operational_zone/metadata",
        "./storage/sovereign_vault/encrypted_original",
        "./storage/sovereign_vault/metadata",
        "./storage/sovereign_vault/keys_simulated",
        "./storage/user_zone/trusted_vault_keys",
        "./storage/audit",
        "./models",
        "./storage/config",
    ]

    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)


def parse_class_csv(value: str | None) -> list[str]:
    if value is None or not value.strip():
        return []

    return [
        normalize_class_name(item.strip())
        for item in value.split(",")
        if item.strip()
    ]


def build_active_classes(
    *,
    default_classes: list[str],
    active_classes_override: str | None,
    disabled_classes: str | None,
) -> list[str]:
    if active_classes_override:
        active_set = set(parse_class_csv(active_classes_override))
    else:
        active_set = {
            normalize_class_name(class_name)
            for class_name in default_classes
        }

    disabled_set = set(parse_class_csv(disabled_classes))
    active_set = active_set - disabled_set

    return sorted(active_set)


def guess_media_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()

    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"

    if suffix == ".png":
        return "image/png"

    if suffix == ".webp":
        return "image/webp"

    return "application/octet-stream"


def verify_government_token(token: str) -> None:
    expected = os.getenv("GOVERNMENT_API_TOKEN", "")

    if not expected or token != expected:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized Government Access API token.",
        )


def verify_approver_token(token: str) -> None:
    expected = os.getenv("GOVERNMENT_APPROVER_TOKEN", "")

    if not expected or token != expected:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized approver token.",
        )


def verify_crypto_admin_token(token: str) -> None:
    expected = os.getenv("CRYPTO_ADMIN_TOKEN", "")

    if not expected or token != expected:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized crypto admin token.",
        )


def ensure_active_key_in_database() -> dict:
    with SessionLocal() as db:
        active_key = get_active_vault_key(db)

        if active_key is not None:
            key_info = ensure_vault_keypair(active_key.key_version)

            return {
                "key_id": active_key.key_id,
                "key_version": active_key.key_version,
                "public_key_fingerprint": active_key.public_key_fingerprint,
                "status": active_key.status,
                "created": key_info["created"],
            }

        key_version = 1
        key_info = ensure_vault_keypair(key_version)

        create_vault_key(
            db,
            key_id=str(key_info["key_id"]),
            key_version=int(key_info["key_version"]),
            public_key_fingerprint=str(key_info["public_key_fingerprint"]),
            status="active",
        )

        create_audit_log(
            db,
            record_id="system",
            zone="Sovereign Vault",
            event_type="vault_key_initialized",
            actor="system",
            action="Initialized active Sovereign Vault keypair.",
            details={
                "key_id": key_info["key_id"],
                "key_version": key_info["key_version"],
                "public_key_fingerprint": key_info["public_key_fingerprint"],
            },
        )

        db.commit()

        return {
            "key_id": key_info["key_id"],
            "key_version": key_info["key_version"],
            "public_key_fingerprint": key_info["public_key_fingerprint"],
            "status": "active",
            "created": key_info["created"],
        }


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_runtime_directories()
    init_db()

    key_info = ensure_active_key_in_database()
    print(f"[PrivAI] Active vault key ready: {key_info}")

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
    version="0.3.0",
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

class RuntimePolicyUpdateRequest(BaseModel):
    policy_name: Optional[str] = Field(default=None, max_length=80)
    confidence_threshold: Optional[float] = Field(default=None, ge=0.01, le=0.99)
    profile: Optional[str] = None
    redaction_mode: Optional[str] = None
    active_classes: Optional[List[str]] = None
    disabled_classes: Optional[List[str]] = None
    label_text: Optional[str] = Field(default=None, max_length=30)
    injection_note: Optional[str] = Field(default=None, max_length=240)

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
        "class_filtering": {
            "active_classes": "Optional comma-separated whitelist, e.g. KTP,NIK_Teks,Wajah",
            "disabled_classes": "Optional comma-separated blacklist, e.g. Wajah,Plat_Nomor",
        },
        "note": (
            "Government profile uses black_box by default. "
            "Live webcam profile uses blur by default. "
            "Class filtering is post-processing only and does not retrain the model."
        ),
    }

@app.get("/api/runtime-policy")
def get_runtime_policy():
    return {
        "policy": load_runtime_policy(),
        "security": {
            "arbitrary_code_execution": False,
            "eval_enabled": False,
            "allowed_keys_only": True,
            "note": (
                "Dynamic Injection is handled as validated runtime configuration. "
                "It never executes arbitrary code."
            ),
        },
    }


@app.put("/api/runtime-policy")
def put_runtime_policy(
    payload: RuntimePolicyUpdateRequest = Body(...),
):
    try:
        update_payload = payload.model_dump(exclude_none=True)
        updated_policy = update_runtime_policy(update_payload)

        with SessionLocal() as db:
            create_audit_log(
                db,
                record_id="system",
                zone="Dynamic Injection",
                event_type="runtime_policy_updated",
                actor="demo_operator",
                action="Updated runtime redaction policy.",
                details=updated_policy,
            )
            db.commit()

        return {
            "status": "updated",
            "policy": updated_policy,
            "note": "Runtime policy updated safely without changing source code.",
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/runtime-policy/reset")
def post_reset_runtime_policy():
    policy = reset_runtime_policy()

    with SessionLocal() as db:
        create_audit_log(
            db,
            record_id="system",
            zone="Dynamic Injection",
            event_type="runtime_policy_reset",
            actor="demo_operator",
            action="Reset runtime policy to default government profile.",
            details=policy,
        )
        db.commit()

    return {
        "status": "reset",
        "policy": policy,
    }


@app.get("/api/crypto/key-info")
def crypto_key_info():
    key_info = ensure_active_key_in_database()

    return {
        "active_key": key_info,
        "asymmetric_scheme": "RSA-OAEP-SHA256",
        "symmetric_scheme": "AES-256-GCM",
        "dek_policy": {
            "scope": "per_file_upload_session",
            "generated_repeatedly": True,
            "plaintext_dek_stored": False,
        },
        "private_key_policy": {
            "private_key_location": "Sovereign Vault simulation only",
            "private_key_sent_to_user_zone": False,
            "rotation_strategy": "versioned key rotation",
        },
        "public_key_policy": {
            "public_key_location": "User Zone trusted vault keys",
            "mitm_note": (
                "Public key distribution is safe only if verified. "
                "Production should use TLS/mTLS, certificate validation, fingerprint verification, and key pinning."
            ),
        },
    }


@app.post("/api/crypto/rotate-vault-key")
def rotate_vault_key(
    x_crypto_admin_token: str = Header(default="", alias="X-Crypto-Admin-Token"),
):
    verify_crypto_admin_token(x_crypto_admin_token)

    with SessionLocal() as db:
        old_active = get_active_vault_key(db)
        next_version = get_max_vault_key_version(db) + 1

        retire_active_vault_keys(db)

        key_info = ensure_vault_keypair(next_version)

        create_vault_key(
            db,
            key_id=str(key_info["key_id"]),
            key_version=int(key_info["key_version"]),
            public_key_fingerprint=str(key_info["public_key_fingerprint"]),
            status="active",
        )

        create_audit_log(
            db,
            record_id="system",
            zone="Sovereign Vault",
            event_type="vault_key_rotated",
            actor="crypto_admin",
            action="Rotated active Sovereign Vault keypair.",
            details={
                "old_key_id": old_active.key_id if old_active else None,
                "new_key_id": key_info["key_id"],
                "new_key_version": key_info["key_version"],
                "public_key_fingerprint": key_info["public_key_fingerprint"],
            },
        )

        db.commit()

        return {
            "status": "rotated",
            "old_key_id": old_active.key_id if old_active else None,
            "new_key": {
                "key_id": key_info["key_id"],
                "key_version": key_info["key_version"],
                "public_key_fingerprint": key_info["public_key_fingerprint"],
            },
            "note": (
                "New uploads will use the new public key. "
                "Old encrypted bundles keep their original key_version and can still be decrypted if the old private key is retained."
            ),
        }


@app.post("/api/infer")
async def infer_image(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(default=0.35, ge=0.01, le=0.99),
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
    confidence_threshold: float = Query(default=0.35, ge=0.01, le=0.99),
    profile: str = Query(default=RedactionProfile.GOVERNMENT.value),
    redaction_mode: str | None = Query(default=None),
    active_classes: str | None = Query(default=None),
    disabled_classes: str | None = Query(default=None),
    use_runtime_policy: bool = Query(
        default=False,
        description="If true, ignore manual query policy and use validated runtime policy.",
    ),
    document_tta: bool = Query(
        default=True,
        description="If true, run document rotation TTA for government upload robustness.",
    ),
    tta_angles: str = Query(
        default="0,180",
        description="Comma-separated TTA angles. Allowed: 0,90,180,270.",
    ),
):
    if not detector.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="YOLO model is not loaded. Check MODEL_PATH and model file.",
        )

    try:
        validate_image_filename(file.filename or "")

        record_id = uuid.uuid4().hex
        upload_session_id = uuid.uuid4().hex

        image_bytes = await file.read()
        image = read_image_bytes_to_cv2(image_bytes)
        height, width, channels = get_image_shape(image)

        runtime_policy = None

        if use_runtime_policy:
            runtime_policy = load_runtime_policy()

            confidence_threshold = float(runtime_policy["confidence_threshold"])
            profile = runtime_policy["profile"]
            redaction_mode = runtime_policy["redaction_mode"]
            active_classes = ",".join(runtime_policy["active_classes"])
            disabled_classes = ",".join(runtime_policy["disabled_classes"])

        rule = get_redaction_rule(profile)
        selected_mode = redaction_mode or rule["mode"]

        if not is_allowed_redaction_mode(selected_mode):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported redaction mode: {selected_mode}",
            )

        selected_active_classes = build_active_classes(
            default_classes=rule["active_classes"],
            active_classes_override=active_classes,
            disabled_classes=disabled_classes,
        )

        selected_label_text = rule["label_text"]

        if runtime_policy is not None:
            selected_label_text = runtime_policy.get("label_text") or rule["label_text"]

        if document_tta and profile == RedactionProfile.GOVERNMENT.value:
            inference_result = robust_predict_with_tta(
                detector=detector,
                image=image,
                confidence_threshold=confidence_threshold,
                tta_angles=tta_angles,
                iou_threshold=0.55,
            )
        else:
            inference_result = detector.predict(
                image=image,
                confidence_threshold=confidence_threshold,
            )

        detected_classes = sorted(
            {
                normalize_class_name(detection.get("class_name", "Unknown"))
                for detection in inference_result["detections"]
            }
        )

        redaction_result = redact_image(
            image=image,
            detections=inference_result["detections"],
            mode=selected_mode,
            active_classes=selected_active_classes,
            label_enabled=rule["label_enabled"],
            label_text=selected_label_text,
        )

        saved_redacted = save_redacted_image_to_operational_zone(
            image=redaction_result["image"],
            original_filename=file.filename or "uploaded_image.jpg",
        )

        metadata_result = save_operational_metadata(
            {
                "record_id": record_id,
                "upload_session_id": upload_session_id,
                "original_filename": file.filename,
                "redacted_filename": saved_redacted["filename"],
                "redaction_profile": profile,
                "redaction_mode": selected_mode,
                "active_classes": selected_active_classes,
                "disabled_classes": parse_class_csv(disabled_classes),
                "confidence_threshold": confidence_threshold,
                "dynamic_injection": {
                    "use_runtime_policy": use_runtime_policy,
                    "policy_name": runtime_policy["policy_name"] if runtime_policy else None,
                    "injection_note": runtime_policy["injection_note"] if runtime_policy else None,
                },
                "image": {
                    "width": width,
                    "height": height,
                    "channels": channels,
                },
                "device": inference_result["device"],
                "latency_ms": inference_result["latency_ms"],
                "detection_count": inference_result["detection_count"],
                "redacted_count": redaction_result["redacted_count"],
                "detected_classes": detected_classes,
                "detections": inference_result["detections"],
                "redacted_detections": redaction_result["redacted_detections"],
            }
        )

        with SessionLocal() as db:
            active_key = get_active_vault_key(db)

            if active_key is None:
                raise HTTPException(
                    status_code=500,
                    detail="No active Sovereign Vault key found.",
                )

            vault_result = encrypt_original_for_vault(
                original_bytes=image_bytes,
                original_filename=file.filename or "uploaded_image.jpg",
                record_id=record_id,
                upload_session_id=upload_session_id,
                key_id=active_key.key_id,
                key_version=active_key.key_version,
            )

            create_operational_metadata(
                db,
                record_id=record_id,
                upload_session_id=upload_session_id,
                original_filename=file.filename or "uploaded_image.jpg",
                redacted_filename=saved_redacted["filename"],
                redacted_path=saved_redacted["path"],
                redaction_profile=profile,
                redaction_mode=selected_mode,
                active_classes=selected_active_classes,
                confidence_threshold=confidence_threshold,
                detection_count=inference_result["detection_count"],
                redacted_count=redaction_result["redacted_count"],
                latency_ms=inference_result["latency_ms"],
                detected_classes=detected_classes,
            )

            create_sovereign_vault_record(
                db,
                record_id=record_id,
                upload_session_id=upload_session_id,
                original_filename=file.filename or "uploaded_image.jpg",
                encrypted_bundle_path=str(vault_result["encrypted_bundle_path"]),
                encryption_algorithm=str(vault_result["encryption_algorithm"]),
                key_id=str(vault_result["key_id"]),
                key_version=int(vault_result["key_version"]),
                nonce_b64=str(vault_result["nonce_b64"]),
                wrapped_dek_b64=str(vault_result["wrapped_dek_b64"]),
                original_sha256=str(vault_result["original_sha256"]),
                ciphertext_sha256=str(vault_result["ciphertext_sha256"]),
            )

            create_audit_log(
                db,
                record_id=record_id,
                zone="Operational Zone",
                event_type="redacted_output_created",
                actor="system",
                action="Stored redacted image and non-private metadata.",
                details={
                    "redacted_filename": saved_redacted["filename"],
                    "stores_private_original": False,
                    "use_runtime_policy": use_runtime_policy,
                },
            )

            create_audit_log(
                db,
                record_id=record_id,
                zone="Sovereign Vault",
                event_type="encrypted_original_stored",
                actor="system",
                action="Stored encrypted original bundle with per-session DEK.",
                details={
                    "key_id": vault_result["key_id"],
                    "key_version": vault_result["key_version"],
                    "dek_scope": vault_result["dek_scope"],
                    "algorithm": vault_result["encryption_algorithm"],
                    "original_sha256": vault_result["original_sha256"],
                },
            )

            if use_runtime_policy:
                create_audit_log(
                    db,
                    record_id=record_id,
                    zone="Dynamic Injection",
                    event_type="runtime_policy_applied",
                    actor="system",
                    action="Applied validated runtime policy during redaction.",
                    details={
                        "policy_name": runtime_policy["policy_name"],
                        "confidence_threshold": confidence_threshold,
                        "profile": profile,
                        "redaction_mode": selected_mode,
                        "active_classes": selected_active_classes,
                        "disabled_classes": parse_class_csv(disabled_classes),
                        "label_text": selected_label_text,
                    },
                )

            db.commit()

        return {
            "record_id": record_id,
            "upload_session_id": upload_session_id,
            "filename": file.filename,
            "image": {
                "width": width,
                "height": height,
                "channels": channels,
            },
            "redaction_policy": {
                "profile": profile,
                "redaction_mode": selected_mode,
                "active_classes": selected_active_classes,
                "disabled_classes": parse_class_csv(disabled_classes),
                "label_text": selected_label_text,
                "document_tta": document_tta,
                "tta_angles": tta_angles if document_tta else None,
                "note": "Class filtering and document TTA are post-processing only. The YOLO model is not retrained.",
            },
            "dynamic_injection": {
                "use_runtime_policy": use_runtime_policy,
                "policy": runtime_policy,
                "note": (
                    "Runtime policy is validated configuration only. "
                    "No arbitrary code execution is allowed."
                ),
            },
            "confidence_threshold": confidence_threshold,
            "robustness": inference_result.get("robustness"),
            "device": inference_result["device"],
            "latency_ms": inference_result["latency_ms"],
            "detection_count": inference_result["detection_count"],
            "redacted_count": redaction_result["redacted_count"],
            "detected_classes": detected_classes,
            "detections": inference_result["detections"],
            "redacted_detections": redaction_result["redacted_detections"],
            "skipped_detections": redaction_result["skipped_detections"],
            "operational_zone": {
                "redacted_file": saved_redacted,
                "metadata_file": metadata_result,
                "stores_private_original": False,
                "note": "Operational Zone stores redacted output and non-private metadata only.",
            },
            "sovereign_vault": {
                "encrypted_original_bundle_created": True,
                "stores_plain_original": False,
                "encryption_algorithm": "AES-256-GCM + RSA-OAEP-SHA256",
                "dek_scope": "per_file_upload_session",
                "key_policy": "Vault key is versioned. DEK is random per upload/session.",
                "access_policy": "Original data is accessible only through Government Access API / Vault Gateway.",
            },
        }

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Redaction and vault storage failed: {str(exc)}",
        )





@app.post("/api/live/turbo/start")
def start_turbo_live(
    session_id: str = Query(default="default"),
    camera_index: int = Query(default=0, ge=0, le=10),
    confidence_threshold: float = Query(default=0.25, ge=0.01, le=0.99),
    redaction_mode: str = Query(default="blur"),
    active_classes: str | None = Query(default=None),
    disabled_classes: str | None = Query(default=None),
    target_width: int = Query(default=640, ge=240, le=1280),
    infer_interval_ms: int = Query(default=90, ge=30, le=1000),
    jpeg_quality: int = Query(default=75, ge=40, le=95),
    box_hold_ms: int = Query(
        default=700,
        ge=0,
        le=2000,
        description="How long to keep last boxes when detection temporarily disappears.",
    ),
):
    if not detector.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="YOLO model is not loaded. Check MODEL_PATH and model file.",
        )

    if not is_allowed_redaction_mode(redaction_mode):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported redaction mode: {redaction_mode}",
        )

    rule = get_redaction_rule(RedactionProfile.LIVE_WEBCAM.value)

    selected_active_classes = build_active_classes(
        default_classes=rule["active_classes"],
        active_classes_override=active_classes,
        disabled_classes=disabled_classes,
    )

    old_session = TURBO_LIVE_SESSIONS.get(session_id)

    if old_session is not None:
        old_session.stop()

    session = LiveTurboSession(
        detector=detector,
        camera_index=camera_index,
        confidence_threshold=confidence_threshold,
        redaction_mode=redaction_mode,
        active_classes=selected_active_classes,
        target_width=target_width,
        infer_interval_ms=infer_interval_ms,
        jpeg_quality=jpeg_quality,
        box_hold_ms=box_hold_ms,
    )

    try:
        session.start()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    TURBO_LIVE_SESSIONS[session_id] = session

    return {
        "status": "started",
        "session_id": session_id,
        "stream_url": f"/api/live/turbo/mjpeg?session_id={session_id}",
        "policy": {
            "confidence_threshold": confidence_threshold,
            "redaction_mode": redaction_mode,
            "active_classes": selected_active_classes,
            "disabled_classes": parse_class_csv(disabled_classes),
            "target_width": target_width,
            "infer_interval_ms": infer_interval_ms,
            "jpeg_quality": jpeg_quality,
            "box_hold_ms": box_hold_ms,
        },
        "performance_note": (
            "Capture/output runs continuously. YOLO inference runs in a background thread. "
            "Output can remain smooth by reusing the latest detection boxes."
        ),
        "integration_note": (
            "This turbo mode is suitable as the base for OBS Virtual Camera or pyvirtualcam integration."
        ),
    }


@app.post("/api/live/turbo/stop")
def stop_turbo_live(
    session_id: str = Query(default="default"),
):
    session = TURBO_LIVE_SESSIONS.get(session_id)

    if session is None:
        return {
            "status": "not_running",
            "session_id": session_id,
        }

    session.stop()
    TURBO_LIVE_SESSIONS.pop(session_id, None)

    return {
        "status": "stopped",
        "session_id": session_id,
    }


@app.get("/api/live/turbo/status")
def turbo_live_status(
    session_id: str = Query(default="default"),
):
    session = TURBO_LIVE_SESSIONS.get(session_id)

    if session is None:
        return {
            "running": False,
            "session_id": session_id,
        }

    return {
        "session_id": session_id,
        **session.get_status(),
    }


@app.get("/api/live/turbo/mjpeg")
def turbo_live_mjpeg(
    session_id: str = Query(default="default"),
):
    session = TURBO_LIVE_SESSIONS.get(session_id)

    if session is None or not session.running:
        raise HTTPException(
            status_code=404,
            detail="Turbo live session is not running. Start it first using /api/live/turbo/start.",
        )

    return StreamingResponse(
        session.mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.post("/api/live/redact-frame")
async def live_redact_frame(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(
        default=0.25,
        ge=0.01,
        le=0.99,
        description="YOLO confidence threshold for live webcam frame.",
    ),
    redaction_mode: str | None = Query(
        default=None,
        description="Optional override for live mode. Default is blur.",
    ),
    active_classes: str | None = Query(
        default=None,
        description="Optional comma-separated whitelist, e.g. Wajah,NIK_Teks.",
    ),
    disabled_classes: str | None = Query(
        default=None,
        description="Optional comma-separated blacklist, e.g. Wajah.",
    ),
):
    """
    Secondary/development track endpoint for live webcam privacy filtering.

    This endpoint intentionally does not store frames in Operational Zone
    and does not encrypt frames into Sovereign Vault. It only returns an
    ephemeral redacted frame for live preview.
    """
    if not detector.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="YOLO model is not loaded. Check MODEL_PATH and model file.",
        )

    try:
        validate_image_filename(file.filename or "webcam_frame.jpg")

        image_bytes = await file.read()
        image = read_image_bytes_to_cv2(image_bytes)
        height, width, channels = get_image_shape(image)

        profile = RedactionProfile.LIVE_WEBCAM.value
        rule = get_redaction_rule(profile)

        selected_mode = redaction_mode or rule["mode"]

        if not is_allowed_redaction_mode(selected_mode):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported redaction mode: {selected_mode}",
            )

        selected_active_classes = build_active_classes(
            default_classes=rule["active_classes"],
            active_classes_override=active_classes,
            disabled_classes=disabled_classes,
        )

        inference_result = detector.predict(
            image=image,
            confidence_threshold=confidence_threshold,
        )

        detected_classes = sorted(
            {
                normalize_class_name(detection.get("class_name", "Unknown"))
                for detection in inference_result["detections"]
            }
        )

        redaction_result = redact_image(
            image=image,
            detections=inference_result["detections"],
            mode=selected_mode,
            active_classes=selected_active_classes,
            label_enabled=False,
            label_text="",
        )

        redacted_bytes = cv2_image_to_bytes(
            redaction_result["image"],
            extension=".jpg",
        )

        redacted_base64 = base64.b64encode(redacted_bytes).decode("utf-8")

        return {
            "scope": "live_webcam_development_track",
            "mime_type": "image/jpeg",
            "frame_image_base64": redacted_base64,
            "image": {
                "width": width,
                "height": height,
                "channels": channels,
            },
            "redaction_policy": {
                "profile": profile,
                "redaction_mode": selected_mode,
                "active_classes": selected_active_classes,
                "disabled_classes": parse_class_csv(disabled_classes),
                "note": "Live webcam mode is ephemeral and uses blur by default.",
            },
            "storage_policy": {
                "stored_in_operational_zone": False,
                "stored_in_sovereign_vault": False,
                "reason": "Live webcam frames are processed ephemerally for privacy preview only.",
            },
            "confidence_threshold": confidence_threshold,
            "device": inference_result["device"],
            "latency_ms": inference_result["latency_ms"],
            "detection_count": inference_result["detection_count"],
            "redacted_count": redaction_result["redacted_count"],
            "detected_classes": detected_classes,
            "detections": inference_result["detections"],
            "redacted_detections": redaction_result["redacted_detections"],
            "skipped_detections": redaction_result["skipped_detections"],
        }

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Live frame redaction failed: {str(exc)}",
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
        media_type=guess_media_type(filename),
        filename=filename,
    )


@app.get("/api/storage/records")
def get_storage_records(limit: int = Query(default=25, ge=1, le=100)):
    with SessionLocal() as db:
        return {
            "records": list_privacy_records(db, limit=limit),
            "note": (
                "Operational Zone records contain non-private metadata. "
                "Sovereign Vault records contain references to encrypted original bundles."
            ),
        }


@app.get("/api/vault/records/{record_id}")
def get_vault_record(record_id: str):
    with SessionLocal() as db:
        vault = get_vault_record_by_record_id(db, record_id)

        if vault is None:
            raise HTTPException(status_code=404, detail="Vault record not found.")

        return {
            "record_id": vault.record_id,
            "upload_session_id": vault.upload_session_id,
            "original_filename": vault.original_filename,
            "encrypted_bundle_path": vault.encrypted_bundle_path,
            "encryption_algorithm": vault.encryption_algorithm,
            "key_id": vault.key_id,
            "key_version": vault.key_version,
            "original_sha256": vault.original_sha256,
            "ciphertext_sha256": vault.ciphertext_sha256,
            "access_level": vault.access_level,
            "retention_status": vault.retention_status,
            "created_at": vault.created_at.isoformat(),
            "plaintext_returned": False,
            "note": "This endpoint returns vault metadata only, not the original plaintext.",
        }


@app.post("/api/government/access-requests")
def create_government_access_request_endpoint(
    record_id: str = Query(...),
    requester: str = Query(default="demo_officer"),
    requester_role: str = Query(default="authorized_government_officer"),
    reason: str = Query(default="Legal verification or authorized audit."),
    x_government_token: str = Header(default="", alias="X-Government-Token"),
):
    verify_government_token(x_government_token)

    request_id = uuid.uuid4().hex

    with SessionLocal() as db:
        vault = get_vault_record_by_record_id(db, record_id)

        if vault is None:
            raise HTTPException(status_code=404, detail="Vault record not found.")

        create_government_access_request(
            db,
            request_id=request_id,
            record_id=record_id,
            requester=requester,
            requester_role=requester_role,
            reason=reason,
        )

        create_audit_log(
            db,
            record_id=record_id,
            zone="Government Access API",
            event_type="access_request_created",
            actor=requester,
            action="Requested controlled access to original encrypted data.",
            details={
                "request_id": request_id,
                "requester_role": requester_role,
                "reason": reason,
            },
        )

        db.commit()

    return {
        "request_id": request_id,
        "record_id": record_id,
        "status": "pending",
        "note": "Request created. Approval is required before original data can be accessed.",
    }


@app.post("/api/government/access-requests/{request_id}/approve")
def approve_government_access_request_endpoint(
    request_id: str,
    approved_by: str = Query(default="demo_supervisor"),
    x_approver_token: str = Header(default="", alias="X-Approver-Token"),
):
    verify_approver_token(x_approver_token)

    ttl_minutes = int(os.getenv("GOVERNMENT_ACCESS_TOKEN_TTL_MINUTES", "15"))
    one_time_token = generate_one_time_access_token()
    one_time_token_hash = hash_access_token(one_time_token)

    with SessionLocal() as db:
        access_request = get_government_access_request(db, request_id)

        if access_request is None:
            raise HTTPException(status_code=404, detail="Access request not found.")

        if access_request.status != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Request cannot be approved because status is {access_request.status}.",
            )

        approve_government_access_request(
            db,
            request_id=request_id,
            approved_by=approved_by,
            access_token_hash=one_time_token_hash,
            ttl_minutes=ttl_minutes,
        )

        create_audit_log(
            db,
            record_id=access_request.record_id,
            zone="Government Access API",
            event_type="access_request_approved",
            actor=approved_by,
            action="Approved controlled access request and issued one-time access token.",
            details={
                "request_id": request_id,
                "ttl_minutes": ttl_minutes,
            },
        )

        db.commit()

    return {
        "request_id": request_id,
        "status": "approved",
        "one_time_access_token": one_time_token,
        "ttl_minutes": ttl_minutes,
        "note": (
            "Demo returns token directly for hackathon testing. "
            "In production, this token should be delivered through a secure internal channel."
        ),
    }


@app.get("/api/government/access-requests/{request_id}")
def get_government_access_request_endpoint(
    request_id: str,
    x_government_token: str = Header(default="", alias="X-Government-Token"),
):
    verify_government_token(x_government_token)

    with SessionLocal() as db:
        access_request = get_government_access_request(db, request_id)

        if access_request is None:
            raise HTTPException(status_code=404, detail="Access request not found.")

        return {
            "request_id": access_request.request_id,
            "record_id": access_request.record_id,
            "requester": access_request.requester,
            "requester_role": access_request.requester_role,
            "reason": access_request.reason,
            "status": access_request.status,
            "approved_by": access_request.approved_by,
            "approved_at": access_request.approved_at.isoformat()
            if access_request.approved_at
            else None,
            "access_token_expires_at": access_request.access_token_expires_at.isoformat()
            if access_request.access_token_expires_at
            else None,
            "access_token_used_at": access_request.access_token_used_at.isoformat()
            if access_request.access_token_used_at
            else None,
        }


@app.get("/api/government/access-requests/{request_id}/secure-original")
def government_secure_original_gateway(
    request_id: str,
    access_token: str = Query(...),
    x_government_token: str = Header(default="", alias="X-Government-Token"),
):
    verify_government_token(x_government_token)

    with SessionLocal() as db:
        access_request = get_government_access_request(db, request_id)

        if access_request is None:
            raise HTTPException(status_code=404, detail="Access request not found.")

        if access_request.status != "approved":
            raise HTTPException(status_code=403, detail="Access request is not approved.")

        if access_request.access_token_used_at is not None:
            raise HTTPException(status_code=403, detail="One-time access token already used.")

        if is_datetime_expired(access_request.access_token_expires_at):
            raise HTTPException(status_code=403, detail="One-time access token is expired.")

        if hash_access_token(access_token) != access_request.access_token_hash:
            raise HTTPException(status_code=403, detail="Invalid one-time access token.")

        vault = get_vault_record_by_record_id(db, access_request.record_id)

        if vault is None:
            raise HTTPException(status_code=404, detail="Vault record not found.")

        try:
            plaintext, bundle = decrypt_original_from_bundle(vault.encrypted_bundle_path)

            mark_government_access_token_used(
                db,
                request_id=request_id,
            )

            create_audit_log(
                db,
                record_id=access_request.record_id,
                zone="Government Access API / Vault Gateway",
                event_type="authorized_original_decryption",
                actor=access_request.requester,
                action="Decrypted original file through controlled government gateway.",
                details={
                    "request_id": request_id,
                    "key_id": vault.key_id,
                    "key_version": vault.key_version,
                    "reason": access_request.reason,
                    "original_sha256": vault.original_sha256,
                },
            )

            db.commit()

            original_filename = bundle["original_filename"]

            return Response(
                content=plaintext,
                media_type=guess_media_type(original_filename),
                headers={
                    "Content-Disposition": f'attachment; filename="{original_filename}"'
                },
            )

        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Government Vault Gateway decryption failed: {str(exc)}",
            )