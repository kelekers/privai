import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import (
    AuditLog,
    GovernmentAccessRequest,
    OperationalMetadata,
    SovereignVaultRecord,
    VaultKey,
)


def utc_now():
    return datetime.now(timezone.utc)


def create_audit_log(
    db: Session,
    *,
    record_id: str,
    zone: str,
    event_type: str,
    actor: str,
    action: str,
    details: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    row = AuditLog(
        record_id=record_id,
        zone=zone,
        event_type=event_type,
        actor=actor,
        action=action,
        details_json=json.dumps(details or {}, ensure_ascii=False),
    )

    db.add(row)
    db.flush()
    return row


def get_active_vault_key(db: Session) -> Optional[VaultKey]:
    return (
        db.query(VaultKey)
        .filter(VaultKey.status == "active")
        .order_by(VaultKey.key_version.desc())
        .first()
    )


def get_max_vault_key_version(db: Session) -> int:
    row = db.query(VaultKey).order_by(VaultKey.key_version.desc()).first()
    return row.key_version if row else 0


def create_vault_key(
    db: Session,
    *,
    key_id: str,
    key_version: int,
    public_key_fingerprint: str,
    status: str = "active",
) -> VaultKey:
    row = VaultKey(
        key_id=key_id,
        key_version=key_version,
        public_key_fingerprint=public_key_fingerprint,
        status=status,
    )

    db.add(row)
    db.flush()
    return row


def retire_active_vault_keys(db: Session) -> None:
    rows = db.query(VaultKey).filter(VaultKey.status == "active").all()

    for row in rows:
        row.status = "retired"
        row.retired_at = utc_now()

    db.flush()


def create_operational_metadata(
    db: Session,
    *,
    record_id: str,
    upload_session_id: str,
    original_filename: str,
    redacted_filename: str,
    redacted_path: str,
    redaction_profile: str,
    redaction_mode: str,
    active_classes: List[str],
    confidence_threshold: float,
    detection_count: int,
    redacted_count: int,
    latency_ms: float,
    detected_classes: List[str],
) -> OperationalMetadata:
    row = OperationalMetadata(
        record_id=record_id,
        upload_session_id=upload_session_id,
        original_filename=original_filename,
        redacted_filename=redacted_filename,
        redacted_path=redacted_path,
        redaction_profile=redaction_profile,
        redaction_mode=redaction_mode,
        active_classes_json=json.dumps(active_classes, ensure_ascii=False),
        confidence_threshold=confidence_threshold,
        detection_count=detection_count,
        redacted_count=redacted_count,
        latency_ms=latency_ms,
        detected_classes_json=json.dumps(detected_classes, ensure_ascii=False),
        stores_private_original=False,
    )

    db.add(row)
    db.flush()
    return row


def create_sovereign_vault_record(
    db: Session,
    *,
    record_id: str,
    upload_session_id: str,
    original_filename: str,
    encrypted_bundle_path: str,
    encryption_algorithm: str,
    key_id: str,
    key_version: int,
    nonce_b64: str,
    wrapped_dek_b64: str,
    original_sha256: str,
    ciphertext_sha256: str,
) -> SovereignVaultRecord:
    row = SovereignVaultRecord(
        record_id=record_id,
        upload_session_id=upload_session_id,
        original_filename=original_filename,
        encrypted_bundle_path=encrypted_bundle_path,
        encryption_algorithm=encryption_algorithm,
        key_id=key_id,
        key_version=key_version,
        nonce_b64=nonce_b64,
        wrapped_dek_b64=wrapped_dek_b64,
        original_sha256=original_sha256,
        ciphertext_sha256=ciphertext_sha256,
        access_level="restricted",
        retention_status="active",
    )

    db.add(row)
    db.flush()
    return row


def get_vault_record_by_record_id(
    db: Session,
    record_id: str,
) -> Optional[SovereignVaultRecord]:
    return (
        db.query(SovereignVaultRecord)
        .filter(SovereignVaultRecord.record_id == record_id)
        .first()
    )


def list_privacy_records(db: Session, limit: int = 25) -> List[Dict[str, Any]]:
    operational_rows = (
        db.query(OperationalMetadata)
        .order_by(OperationalMetadata.created_at.desc())
        .limit(limit)
        .all()
    )

    records = []

    for row in operational_rows:
        vault = get_vault_record_by_record_id(db, row.record_id)

        records.append(
            {
                "record_id": row.record_id,
                "upload_session_id": row.upload_session_id,
                "original_filename": row.original_filename,
                "redacted_filename": row.redacted_filename,
                "redaction_profile": row.redaction_profile,
                "redaction_mode": row.redaction_mode,
                "confidence_threshold": row.confidence_threshold,
                "detection_count": row.detection_count,
                "redacted_count": row.redacted_count,
                "latency_ms": row.latency_ms,
                "stores_private_original_in_operational_zone": row.stores_private_original,
                "vault_encrypted": vault is not None,
                "vault_key_id": vault.key_id if vault else None,
                "vault_key_version": vault.key_version if vault else None,
                "created_at": row.created_at.isoformat(),
            }
        )

    return records


def create_government_access_request(
    db: Session,
    *,
    request_id: str,
    record_id: str,
    requester: str,
    requester_role: str,
    reason: str,
) -> GovernmentAccessRequest:
    row = GovernmentAccessRequest(
        request_id=request_id,
        record_id=record_id,
        requester=requester,
        requester_role=requester_role,
        reason=reason,
        status="pending",
    )

    db.add(row)
    db.flush()
    return row


def get_government_access_request(
    db: Session,
    request_id: str,
) -> Optional[GovernmentAccessRequest]:
    return (
        db.query(GovernmentAccessRequest)
        .filter(GovernmentAccessRequest.request_id == request_id)
        .first()
    )


def approve_government_access_request(
    db: Session,
    *,
    request_id: str,
    approved_by: str,
    access_token_hash: str,
    ttl_minutes: int,
) -> GovernmentAccessRequest:
    row = get_government_access_request(db, request_id)

    if row is None:
        raise ValueError("Access request not found.")

    row.status = "approved"
    row.approved_by = approved_by
    row.approved_at = utc_now()
    row.access_token_hash = access_token_hash
    row.access_token_expires_at = utc_now() + timedelta(minutes=ttl_minutes)

    db.flush()
    return row


def mark_government_access_token_used(
    db: Session,
    *,
    request_id: str,
) -> GovernmentAccessRequest:
    row = get_government_access_request(db, request_id)

    if row is None:
        raise ValueError("Access request not found.")

    row.access_token_used_at = utc_now()
    db.flush()
    return row