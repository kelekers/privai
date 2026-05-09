import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from app.utils.image_utils import generate_runtime_filename, save_cv2_image


def get_operational_zone_dir() -> Path:
    return Path(os.getenv("OPERATIONAL_ZONE_DIR", "./storage/operational_zone"))


def get_redacted_dir() -> Path:
    return get_operational_zone_dir() / "redacted"


def get_metadata_dir() -> Path:
    return get_operational_zone_dir() / "metadata"


def save_redacted_image_to_operational_zone(
    image,
    original_filename: str,
) -> Dict[str, str]:
    output_filename = generate_runtime_filename(
        original_filename=original_filename,
        prefix="redacted",
    )

    output_path = get_redacted_dir() / output_filename
    save_cv2_image(image, output_path)

    return {
        "filename": output_filename,
        "path": str(output_path),
        "url": f"/api/files/redacted/{output_filename}",
    }


def save_operational_metadata(metadata: Dict[str, Any]) -> Dict[str, str]:
    get_metadata_dir().mkdir(parents=True, exist_ok=True)

    created_at = datetime.now(timezone.utc).isoformat()
    metadata = {
        **metadata,
        "created_at": created_at,
        "privacy_note": (
            "Operational Zone stores redacted output and non-private metadata only. "
            "Original private data is not stored here."
        ),
    }

    metadata_filename = f"metadata_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f')}.json"
    metadata_path = get_metadata_dir() / metadata_filename

    with open(metadata_path, "w", encoding="utf-8") as file:
        json.dump(metadata, file, ensure_ascii=False, indent=2)

    return {
        "filename": metadata_filename,
        "path": str(metadata_path),
    }