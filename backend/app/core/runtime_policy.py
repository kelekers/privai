import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from app.ai.class_map import SENSITIVE_CLASSES, normalize_class_name
from app.core.redaction_config import (
    RedactionProfile,
    RedactionMode,
    get_allowed_profiles,
    get_allowed_redaction_modes,
)


ALLOWED_POLICY_KEYS = {
    "policy_name",
    "confidence_threshold",
    "profile",
    "redaction_mode",
    "active_classes",
    "disabled_classes",
    "label_text",
    "injection_note",
}


def get_runtime_policy_path() -> Path:
    return Path(os.getenv("RUNTIME_POLICY_PATH", "./storage/config/runtime_policy.json"))


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_default_runtime_policy() -> Dict[str, Any]:
    return {
        "policy_name": "Default Government Policy",
        "confidence_threshold": 0.35,
        "profile": RedactionProfile.GOVERNMENT.value,
        "redaction_mode": RedactionMode.BLACK_BOX.value,
        "active_classes": SENSITIVE_CLASSES,
        "disabled_classes": [],
        "label_text": "REDACTED",
        "injection_note": "Default policy for government-first redaction.",
        "updated_at": utc_now_iso(),
    }


def sanitize_class_list(values: List[str]) -> List[str]:
    allowed_classes = {normalize_class_name(item) for item in SENSITIVE_CLASSES}
    sanitized = []

    for value in values:
        normalized = normalize_class_name(value)

        if normalized not in allowed_classes:
            raise ValueError(
                f"Invalid class '{value}'. Allowed classes: {sorted(allowed_classes)}"
            )

        if normalized not in sanitized:
            sanitized.append(normalized)

    return sanitized


def validate_runtime_policy(policy: Dict[str, Any]) -> Dict[str, Any]:
    clean_policy = get_default_runtime_policy()
    clean_policy.update(policy)

    confidence = float(clean_policy["confidence_threshold"])
    if confidence < 0.01 or confidence > 0.99:
        raise ValueError("confidence_threshold must be between 0.01 and 0.99.")

    profile = clean_policy["profile"]
    if profile not in get_allowed_profiles():
        raise ValueError(f"Invalid profile: {profile}")

    redaction_mode = clean_policy["redaction_mode"]
    if redaction_mode not in get_allowed_redaction_modes():
        raise ValueError(f"Invalid redaction_mode: {redaction_mode}")

    active_classes = sanitize_class_list(clean_policy.get("active_classes", []))
    disabled_classes = sanitize_class_list(clean_policy.get("disabled_classes", []))

    label_text = str(clean_policy.get("label_text", "REDACTED")).strip()
    if len(label_text) > 30:
        raise ValueError("label_text must be 30 characters or fewer.")

    policy_name = str(clean_policy.get("policy_name", "Runtime Policy")).strip()
    if len(policy_name) > 80:
        raise ValueError("policy_name must be 80 characters or fewer.")

    injection_note = str(clean_policy.get("injection_note", "")).strip()
    if len(injection_note) > 240:
        raise ValueError("injection_note must be 240 characters or fewer.")

    return {
        "policy_name": policy_name,
        "confidence_threshold": confidence,
        "profile": profile,
        "redaction_mode": redaction_mode,
        "active_classes": active_classes,
        "disabled_classes": disabled_classes,
        "label_text": label_text,
        "injection_note": injection_note,
        "updated_at": clean_policy.get("updated_at", utc_now_iso()),
    }


def save_runtime_policy(policy: Dict[str, Any]) -> Dict[str, Any]:
    policy_path = get_runtime_policy_path()
    policy_path.parent.mkdir(parents=True, exist_ok=True)

    validated = validate_runtime_policy(policy)
    validated["updated_at"] = utc_now_iso()

    with open(policy_path, "w", encoding="utf-8") as file:
        json.dump(validated, file, ensure_ascii=False, indent=2)

    return validated


def load_runtime_policy() -> Dict[str, Any]:
    policy_path = get_runtime_policy_path()

    if not policy_path.exists():
        return save_runtime_policy(get_default_runtime_policy())

    with open(policy_path, "r", encoding="utf-8") as file:
        policy = json.load(file)

    return validate_runtime_policy(policy)


def update_runtime_policy(update: Dict[str, Any]) -> Dict[str, Any]:
    unknown_keys = set(update.keys()) - ALLOWED_POLICY_KEYS

    if unknown_keys:
        raise ValueError(f"Unsupported runtime policy keys: {sorted(unknown_keys)}")

    current = load_runtime_policy()

    for key, value in update.items():
        if value is not None:
            current[key] = value

    return save_runtime_policy(current)


def reset_runtime_policy() -> Dict[str, Any]:
    return save_runtime_policy(get_default_runtime_policy())