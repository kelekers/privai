from enum import Enum
from typing import Dict, List

from app.ai.class_map import SENSITIVE_CLASSES


class RedactionMode(str, Enum):
    BLACK_BOX = "black_box"
    BLUR = "blur"
    PIXELATE = "pixelate"


class RedactionProfile(str, Enum):
    GOVERNMENT = "government"
    LIVE_WEBCAM = "live_webcam"


DEFAULT_REDACTION_RULES: Dict[str, Dict] = {
    RedactionProfile.GOVERNMENT.value: {
        "mode": RedactionMode.BLACK_BOX.value,
        "active_classes": SENSITIVE_CLASSES,
        "label_enabled": True,
        "label_text": "REDACTED",
    },
    RedactionProfile.LIVE_WEBCAM.value: {
        "mode": RedactionMode.BLUR.value,
        "active_classes": SENSITIVE_CLASSES,
        "label_enabled": False,
        "label_text": "",
    },
}


def get_redaction_rule(profile: str) -> Dict:
    if profile not in DEFAULT_REDACTION_RULES:
        return DEFAULT_REDACTION_RULES[RedactionProfile.GOVERNMENT.value]

    return DEFAULT_REDACTION_RULES[profile]


def is_allowed_redaction_mode(mode: str) -> bool:
    return mode in {item.value for item in RedactionMode}


def get_allowed_redaction_modes() -> List[str]:
    return [item.value for item in RedactionMode]


def get_allowed_profiles() -> List[str]:
    return [item.value for item in RedactionProfile]