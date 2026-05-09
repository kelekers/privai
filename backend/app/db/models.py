from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text

from app.db.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class VaultKey(Base):
    __tablename__ = "vault_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String(120), unique=True, index=True, nullable=False)
    key_version = Column(Integer, unique=True, index=True, nullable=False)

    public_key_fingerprint = Column(String(128), nullable=False)
    status = Column(String(30), default="active", nullable=False)

    created_at = Column(DateTime, default=utc_now, nullable=False)
    retired_at = Column(DateTime, nullable=True)


class OperationalMetadata(Base):
    __tablename__ = "operational_metadata"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String(64), unique=True, index=True, nullable=False)
    upload_session_id = Column(String(64), index=True, nullable=False)

    original_filename = Column(String(255), nullable=False)
    redacted_filename = Column(String(255), nullable=False)
    redacted_path = Column(Text, nullable=False)

    redaction_profile = Column(String(50), nullable=False)
    redaction_mode = Column(String(50), nullable=False)
    active_classes_json = Column(Text, nullable=False)

    confidence_threshold = Column(Float, nullable=False)
    detection_count = Column(Integer, nullable=False)
    redacted_count = Column(Integer, nullable=False)
    latency_ms = Column(Float, nullable=False)

    detected_classes_json = Column(Text, nullable=False)
    stores_private_original = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=utc_now, nullable=False)


class SovereignVaultRecord(Base):
    __tablename__ = "sovereign_vault_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String(64), unique=True, index=True, nullable=False)
    upload_session_id = Column(String(64), index=True, nullable=False)

    original_filename = Column(String(255), nullable=False)
    encrypted_bundle_path = Column(Text, nullable=False)

    encryption_algorithm = Column(String(120), nullable=False)
    key_id = Column(String(120), nullable=False)
    key_version = Column(Integer, nullable=False)

    nonce_b64 = Column(Text, nullable=False)
    wrapped_dek_b64 = Column(Text, nullable=False)

    original_sha256 = Column(String(64), nullable=False)
    ciphertext_sha256 = Column(String(64), nullable=False)

    access_level = Column(String(50), default="restricted", nullable=False)
    retention_status = Column(String(50), default="active", nullable=False)

    created_at = Column(DateTime, default=utc_now, nullable=False)


class GovernmentAccessRequest(Base):
    __tablename__ = "government_access_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(64), unique=True, index=True, nullable=False)
    record_id = Column(String(64), index=True, nullable=False)

    requester = Column(String(120), nullable=False)
    requester_role = Column(String(120), nullable=False)
    reason = Column(Text, nullable=False)

    status = Column(String(30), default="pending", nullable=False)

    approved_by = Column(String(120), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    access_token_hash = Column(String(128), nullable=True)
    access_token_expires_at = Column(DateTime, nullable=True)
    access_token_used_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=utc_now, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String(64), index=True, nullable=False)

    zone = Column(String(80), nullable=False)
    event_type = Column(String(80), nullable=False)
    actor = Column(String(120), nullable=False)
    action = Column(String(160), nullable=False)

    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)