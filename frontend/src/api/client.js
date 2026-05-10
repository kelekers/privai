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
  useRuntimePolicy,
}) {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams();
  params.set("confidence_threshold", String(confidenceThreshold));
  params.set("profile", profile);

  if (useRuntimePolicy) {
    params.set("use_runtime_policy", "true");
  }

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

export async function getRuntimePolicy() {
  const response = await apiClient.get("/api/runtime-policy");
  return response.data;
}

export async function updateRuntimePolicy(policy) {
  const response = await apiClient.put("/api/runtime-policy", policy);
  return response.data;
}

export async function resetRuntimePolicy() {
  const response = await apiClient.post("/api/runtime-policy/reset");
  return response.data;
}

export async function createGovernmentAccessRequest({
  recordId,
  requester,
  requesterRole,
  reason,
  governmentToken,
}) {
  const params = new URLSearchParams();
  params.set("record_id", recordId);
  params.set("requester", requester);
  params.set("requester_role", requesterRole);
  params.set("reason", reason);

  const response = await apiClient.post(
    `/api/government/access-requests?${params.toString()}`,
    null,
    {
      headers: {
        "X-Government-Token": governmentToken,
      },
    },
  );

  return response.data;
}

export async function approveGovernmentAccessRequest({
  requestId,
  approvedBy,
  approverToken,
}) {
  const params = new URLSearchParams();
  params.set("approved_by", approvedBy);

  const response = await apiClient.post(
    `/api/government/access-requests/${requestId}/approve?${params.toString()}`,
    null,
    {
      headers: {
        "X-Approver-Token": approverToken,
      },
    },
  );

  return response.data;
}

export async function downloadGovernmentOriginal({
  requestId,
  accessToken,
  governmentToken,
}) {
  const response = await apiClient.get(
    `/api/government/access-requests/${requestId}/secure-original`,
    {
      params: {
        access_token: accessToken,
      },
      headers: {
        "X-Government-Token": governmentToken,
      },
      responseType: "blob",
    },
  );

  const contentDisposition = response.headers["content-disposition"] || "";
  const filenameMatch = contentDisposition.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] || "privai_decrypted_original.jpg";

  const blobUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  link.remove();
  URL.revokeObjectURL(blobUrl);

  return {
    filename,
    status: "downloaded",
  };
}


export async function redactLiveFrame({
  frameBlob,
  confidenceThreshold,
  redactionMode,
  activeClasses,
  disabledClasses,
}) {
  const formData = new FormData();
  formData.append("file", frameBlob, "webcam_frame.jpg");

  const params = new URLSearchParams();
  params.set("confidence_threshold", String(confidenceThreshold ?? 0.25));

  if (redactionMode && redactionMode !== "default") {
    params.set("redaction_mode", redactionMode);
  }

  if (activeClasses?.trim()) {
    params.set("active_classes", activeClasses.trim());
  }

  if (disabledClasses?.trim()) {
    params.set("disabled_classes", disabledClasses.trim());
  }

  const response = await apiClient.post(
    `/api/live/redact-frame?${params.toString()}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}


export async function startTurboLive({
  sessionId = "default",
  cameraIndex = 0,
  confidenceThreshold = 0.25,
  redactionMode = "blur",
  activeClasses = "",
  disabledClasses = "",
  targetWidth = 640,
  inferIntervalMs = 90,
  jpegQuality = 75,
}) {
  const params = new URLSearchParams();

  params.set("session_id", sessionId);
  params.set("camera_index", String(cameraIndex));
  params.set("confidence_threshold", String(confidenceThreshold));
  params.set("redaction_mode", redactionMode);
  params.set("target_width", String(targetWidth));
  params.set("infer_interval_ms", String(inferIntervalMs));
  params.set("jpeg_quality", String(jpegQuality));

  if (activeClasses?.trim()) {
    params.set("active_classes", activeClasses.trim());
  }

  if (disabledClasses?.trim()) {
    params.set("disabled_classes", disabledClasses.trim());
  }

  const response = await apiClient.post(`/api/live/turbo/start?${params.toString()}`);
  return response.data;
}

export async function stopTurboLive(sessionId = "default") {
  const params = new URLSearchParams();
  params.set("session_id", sessionId);

  const response = await apiClient.post(`/api/live/turbo/stop?${params.toString()}`);
  return response.data;
}

export async function getTurboLiveStatus(sessionId = "default") {
  const params = new URLSearchParams();
  params.set("session_id", sessionId);

  const response = await apiClient.get(`/api/live/turbo/status?${params.toString()}`);
  return response.data;
}

export function buildTurboMjpegUrl(sessionId = "default") {
  return `${API_BASE_URL}/api/live/turbo/mjpeg?session_id=${encodeURIComponent(sessionId)}&t=${Date.now()}`;
}

