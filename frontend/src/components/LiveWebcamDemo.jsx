import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Loader2,
  Play,
  Square,
  Video,
  Zap,
} from "lucide-react";
import { redactLiveFrame } from "../api/client";

const CLASS_PRESETS = ["KTP", "SIM", "Paspor", "NIK_Teks", "Wajah", "Plat_Nomor"];

function splitClassInput(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function LiveWebcamDemo() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isContinuous, setIsContinuous] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25);
  const [redactionMode, setRedactionMode] = useState("blur");
  const [activeClasses, setActiveClasses] = useState("");
  const [disabledClasses, setDisabledClasses] = useState("");

  const [redactedImage, setRedactedImage] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  async function startCamera() {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraOn(true);
    } catch (err) {
      setError("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan dan gunakan localhost.");
    }
  }

  function stopCamera() {
    stopContinuous();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
  }

  function captureFrameBlob() {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        reject(new Error("Video or canvas is not ready."));
        return;
      }

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to capture webcam frame."));
            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        0.82,
      );
    });
  }

  async function processOneFrame() {
    if (!isCameraOn || isProcessing) return;

    setIsProcessing(true);
    setError("");

    try {
      const frameBlob = await captureFrameBlob();

      const data = await redactLiveFrame({
        frameBlob,
        confidenceThreshold,
        redactionMode,
        activeClasses,
        disabledClasses,
      });

      setRedactedImage(`data:${data.mime_type};base64,${data.frame_image_base64}`);

      setStats({
        latencyMs: data.latency_ms,
        detectionCount: data.detection_count,
        redactedCount: data.redacted_count,
        detectedClasses: data.detected_classes || [],
        storagePolicy: data.storage_policy,
      });
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || "Gagal memproses frame.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsProcessing(false);
    }
  }

  function startContinuous() {
    if (!isCameraOn) {
      setError("Nyalakan kamera terlebih dahulu.");
      return;
    }

    if (intervalRef.current) return;

    setIsContinuous(true);

    intervalRef.current = setInterval(() => {
      processOneFrame();
    }, 900);
  }

  function stopContinuous() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsContinuous(false);
  }

  function toggleDisabledClass(className) {
    const current = splitClassInput(disabledClasses);

    if (current.includes(className)) {
      setDisabledClasses(current.filter((item) => item !== className).join(","));
    } else {
      setDisabledClasses([...current, className].join(","));
    }
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <section className="rounded-3xl border border-teal-300/20 bg-teal-400/10 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-2xl bg-teal-300/10 p-2.5 text-teal-200">
          <Video size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Live Webcam Privacy Filter</h2>
          <p className="text-sm text-slate-400">
            Secondary development track. Frame diproses secara ephemeral, tidak disimpan ke Operational Zone atau Sovereign Vault.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Original Webcam</h3>
            <span className="rounded-full bg-slate-400/10 px-3 py-1 text-xs text-slate-300">
              Browser stream
            </span>
          </div>

          <video
            ref={videoRef}
            muted
            playsInline
            className="aspect-video w-full rounded-2xl bg-black object-cover"
          />

          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {!isCameraOn ? (
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center justify-center gap-2 rounded-2xl bg-teal-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-teal-200"
              >
                <Camera size={18} />
                Start Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-100 hover:bg-red-300/20"
              >
                <CameraOff size={18} />
                Stop Camera
              </button>
            )}

            <button
              type="button"
              onClick={processOneFrame}
              disabled={!isCameraOn || isProcessing}
              className="flex items-center justify-center gap-2 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-4 py-3 text-sm font-semibold text-teal-100 hover:bg-teal-300/20 disabled:opacity-60"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
              Process Frame
            </button>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {!isContinuous ? (
              <button
                type="button"
                onClick={startContinuous}
                disabled={!isCameraOn}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-60"
              >
                <Play size={18} />
                Start Continuous
              </button>
            ) : (
              <button
                type="button"
                onClick={stopContinuous}
                className="flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/30 bg-yellow-300/10 px-4 py-3 text-sm font-semibold text-yellow-100 hover:bg-yellow-300/20"
              >
                <Square size={18} />
                Stop Continuous
              </button>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              Status: {isContinuous ? "continuous" : isProcessing ? "processing" : "idle"}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Redacted Webcam Output</h3>
            <span className="rounded-full bg-teal-400/10 px-3 py-1 text-xs text-teal-200">
              Ephemeral blur
            </span>
          </div>

          {redactedImage ? (
            <img
              src={redactedImage}
              alt="Redacted webcam frame"
              className="aspect-video w-full rounded-2xl bg-black object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
              Hasil sensor webcam akan muncul di sini.
            </div>
          )}

          {stats && (
            <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-500">Latency</p>
                <p className="font-semibold text-white">{stats.latencyMs} ms</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-500">Detected</p>
                <p className="font-semibold text-white">{stats.detectionCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-500">Redacted</p>
                <p className="font-semibold text-white">{stats.redactedCount}</p>
              </div>
            </div>
          )}

          {stats?.storagePolicy && (
            <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-xs text-emerald-100">
              Stored in Operational Zone: {String(stats.storagePolicy.stored_in_operational_zone)}
              <br />
              Stored in Sovereign Vault: {String(stats.storagePolicy.stored_in_sovereign_vault)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Confidence threshold: {Number(confidenceThreshold).toFixed(2)}
          </label>
          <input
            type="range"
            min="0.01"
            max="0.99"
            step="0.01"
            value={confidenceThreshold}
            onChange={(event) => setConfidenceThreshold(Number(event.target.value))}
            className="w-full accent-teal-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Live redaction mode</label>
          <select
            value={redactionMode}
            onChange={(event) => setRedactionMode(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-teal-300/60"
          >
            <option value="blur">blur</option>
            <option value="pixelate">pixelate</option>
            <option value="black_box">black_box</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Active classes</label>
          <input
            value={activeClasses}
            onChange={(event) => setActiveClasses(event.target.value)}
            placeholder="Kosongkan untuk default"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-teal-300/60"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Disabled classes</label>
          <input
            value={disabledClasses}
            onChange={(event) => setDisabledClasses(event.target.value)}
            placeholder="Contoh: Wajah"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-teal-300/60"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CLASS_PRESETS.map((className) => (
          <button
            key={className}
            type="button"
            onClick={() => toggleDisabledClass(className)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10"
          >
            Toggle disable {className}
          </button>
        ))}
      </div>
    </section>
  );
}
