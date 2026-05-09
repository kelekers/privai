SENSITIVE_CLASSES = [
    "KTP",
    "SIM",
    "Paspor",
    "NIK_Teks",
    "Wajah",
    "Plat_Nomor",
]


CLASS_ALIASES = {
    "ktp": "KTP",
    "KTP": "KTP",

    "sim": "SIM",
    "SIM": "SIM",

    "paspor": "Paspor",
    "passport": "Paspor",
    "Paspor": "Paspor",

    "nik": "NIK_Teks",
    "nik_teks": "NIK_Teks",
    "NIK_Teks": "NIK_Teks",

    "wajah": "Wajah",
    "face": "Wajah",
    "Wajah": "Wajah",

    "plat_nomor": "Plat_Nomor",
    "plate": "Plat_Nomor",
    "license_plate": "Plat_Nomor",
    "Plat_Nomor": "Plat_Nomor",
}


def normalize_class_name(raw_name: str) -> str:
    if raw_name is None:
        return "Unknown"

    cleaned = str(raw_name).strip()
    return CLASS_ALIASES.get(cleaned, cleaned)


def is_sensitive_class(class_name: str) -> bool:
    return normalize_class_name(class_name) in SENSITIVE_CLASSES