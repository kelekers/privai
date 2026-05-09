import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export function buildBackendFileUrl(relativeUrl) {
  if (!relativeUrl) return "";
  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
    return relativeUrl;
  }
  return `${API_BASE_URL}${relativeUrl}`;
}

export async function getHealth() {
  const response = await apiClient.get("/api/health");
  return response.data;
}

export async function getModelInfo() {
  const response = await apiClient.get("/api/model-info");
  return response.data;
}

export async function getCryptoKeyInfo() {
  const response = await apiClient.get("/api/crypto/key-info");
  return response.data;
}

export async function getStorageRecords() {
  const response = await apiClient.get("/api/storage/records?limit=10");
  return response.data;
}

export async function redactImage({
  file,
  confidenceThreshold,
  profile,
  redactionMode,
  activeClasses,
  disabledClasses,
}) {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams();
  params.set("confidence_threshold", String(confidenceThreshold));
  params.set("profile", profile);

  if (redactionMode && redactionMode !== "default") {
    params.set("redaction_mode", redactionMode);
  }

  if (activeClasses?.trim()) {
    params.set("active_classes", activeClasses.trim());
  }

  if (disabledClasses?.trim()) {
    params.set("disabled_classes", disabledClasses.trim());
  }

  const response = await apiClient.post(`/api/redact?${params.toString()}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}