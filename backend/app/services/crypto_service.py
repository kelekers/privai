import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Tuple

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _b64encode(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


def _b64decode(data: str) -> bytes:
    return base64.b64decode(data.encode("utf-8"))


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def get_sovereign_vault_dir() -> Path:
    return Path(os.getenv("SOVEREIGN_VAULT_DIR", "./storage/sovereign_vault"))


def get_user_zone_dir() -> Path:
    return Path(os.getenv("USER_ZONE_DIR", "./storage/user_zone"))


def get_key_id_prefix() -> str:
    return os.getenv("VAULT_KEY_ID_PREFIX", "privai-vault-rsa-oaep-demo")


def build_key_id(key_version: int) -> str:
    return f"{get_key_id_prefix()}-v{key_version}"


def get_private_key_path(key_version: int) -> Path:
    return (
        get_sovereign_vault_dir()
        / "keys_simulated"
        / f"vault_private_key_v{key_version}.pem"
    )


def get_public_key_path_in_user_zone(key_version: int) -> Path:
    return (
        get_user_zone_dir()
        / "trusted_vault_keys"
        / f"vault_public_key_v{key_version}.pem"
    )


def calculate_public_key_fingerprint(public_pem: bytes) -> str:
    public_key = serialization.load_pem_public_key(public_pem)

    public_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    return hashlib.sha256(public_der).hexdigest()


def ensure_vault_keypair(key_version: int) -> Dict[str, str | int]:
    private_key_path = get_private_key_path(key_version)
    public_key_path = get_public_key_path_in_user_zone(key_version)

    private_key_path.parent.mkdir(parents=True, exist_ok=True)
    public_key_path.parent.mkdir(parents=True, exist_ok=True)

    key_id = build_key_id(key_version)

    if private_key_path.exists() and public_key_path.exists():
        public_pem = public_key_path.read_bytes()

        return {
            "key_id": key_id,
            "key_version": key_version,
            "public_key_fingerprint": calculate_public_key_fingerprint(public_pem),
            "created": "existing",
        }

    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=3072,
    )

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    private_key_path.write_bytes(private_pem)
    public_key_path.write_bytes(public_pem)

    return {
        "key_id": key_id,
        "key_version": key_version,
        "public_key_fingerprint": calculate_public_key_fingerprint(public_pem),
        "created": "new",
    }


def load_vault_public_key_from_user_zone(key_version: int):
    public_key_path = get_public_key_path_in_user_zone(key_version)

    if not public_key_path.exists():
        ensure_vault_keypair(key_version)

    public_pem = public_key_path.read_bytes()
    return serialization.load_pem_public_key(public_pem)


def load_vault_private_key(key_version: int):
    private_key_path = get_private_key_path(key_version)

    if not private_key_path.exists():
        raise FileNotFoundError(
            f"Vault private key v{key_version} is missing. "
            "In production, this key should be protected by HSM/KMS."
        )

    private_pem = private_key_path.read_bytes()

    return serialization.load_pem_private_key(
        private_pem,
        password=None,
    )


def encrypt_original_for_vault(
    *,
    original_bytes: bytes,
    original_filename: str,
    record_id: str,
    upload_session_id: str,
    key_id: str,
    key_version: int,
) -> Dict[str, str | int]:
    ensure_vault_keypair(key_version)

    vault_public_key = load_vault_public_key_from_user_zone(key_version)

    # DEK dibuat random setiap file/session.
    # Ini kunci simetris per-upload, bukan fixed global key.
    dek = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)

    associated_data_payload = {
        "app": "PrivAI",
        "record_id": record_id,
        "upload_session_id": upload_session_id,
        "original_filename": original_filename,
        "key_id": key_id,
        "key_version": key_version,
        "dek_scope": "per_file_upload_session",
    }

    associated_data = json.dumps(
        associated_data_payload,
        sort_keys=True,
    ).encode("utf-8")

    aesgcm = AESGCM(dek)

    ciphertext = aesgcm.encrypt(
        nonce,
        original_bytes,
        associated_data,
    )

    wrapped_dek = vault_public_key.encrypt(
        dek,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    encrypted_dir = get_sovereign_vault_dir() / "encrypted_original"
    encrypted_dir.mkdir(parents=True, exist_ok=True)

    bundle_filename = f"vault_bundle_{record_id}.privai.json"
    bundle_path = encrypted_dir / bundle_filename

    bundle = {
        "version": "1.0",
        "record_id": record_id,
        "upload_session_id": upload_session_id,
        "key_id": key_id,
        "key_version": key_version,
        "original_filename": original_filename,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "encryption_algorithm": "AES-256-GCM + RSA-OAEP-SHA256",
        "dek_scope": "per_file_upload_session",
        "nonce_b64": _b64encode(nonce),
        "wrapped_dek_b64": _b64encode(wrapped_dek),
        "associated_data_b64": _b64encode(associated_data),
        "ciphertext_b64": _b64encode(ciphertext),
        "original_sha256": _sha256_hex(original_bytes),
        "ciphertext_sha256": _sha256_hex(ciphertext),
        "privacy_note": (
            "Original data is encrypted using a fresh AES-256 DEK per upload session. "
            "The plaintext DEK is never stored. "
            "The DEK is wrapped using the Sovereign Vault public key. "
            "The private key remains inside Sovereign Vault simulation."
        ),
    }

    with open(bundle_path, "w", encoding="utf-8") as file:
        json.dump(bundle, file, ensure_ascii=False, indent=2)

    return {
        "record_id": record_id,
        "upload_session_id": upload_session_id,
        "encrypted_bundle_filename": bundle_filename,
        "encrypted_bundle_path": str(bundle_path),
        "encryption_algorithm": bundle["encryption_algorithm"],
        "dek_scope": bundle["dek_scope"],
        "key_id": key_id,
        "key_version": key_version,
        "nonce_b64": bundle["nonce_b64"],
        "wrapped_dek_b64": bundle["wrapped_dek_b64"],
        "original_sha256": bundle["original_sha256"],
        "ciphertext_sha256": bundle["ciphertext_sha256"],
    }


def decrypt_original_from_bundle(
    encrypted_bundle_path: str,
) -> Tuple[bytes, Dict]:
    bundle_path = Path(encrypted_bundle_path)

    if not bundle_path.exists():
        raise FileNotFoundError(f"Encrypted bundle not found: {bundle_path}")

    with open(bundle_path, "r", encoding="utf-8") as file:
        bundle = json.load(file)

    key_version = int(bundle["key_version"])

    vault_private_key = load_vault_private_key(key_version)

    wrapped_dek = _b64decode(bundle["wrapped_dek_b64"])
    nonce = _b64decode(bundle["nonce_b64"])
    associated_data = _b64decode(bundle["associated_data_b64"])
    ciphertext = _b64decode(bundle["ciphertext_b64"])

    dek = vault_private_key.decrypt(
        wrapped_dek,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    aesgcm = AESGCM(dek)

    plaintext = aesgcm.decrypt(
        nonce,
        ciphertext,
        associated_data,
    )

    if _sha256_hex(plaintext) != bundle["original_sha256"]:
        raise ValueError("Integrity check failed. Original SHA-256 does not match.")

    return plaintext, bundle