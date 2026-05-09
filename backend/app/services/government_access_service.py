import hashlib
import secrets
from datetime import datetime, timezone


def hash_access_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_one_time_access_token() -> str:
    return secrets.token_urlsafe(32)


def is_datetime_expired(value) -> bool:
    if value is None:
        return True

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value < datetime.now(timezone.utc)