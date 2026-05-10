import { useEffect, useRef, useState } from "react";
import { Activity, Loader2, Play, Square, Video } from "lucide-react";
import { redactLiveFrame } from "../api/client";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";

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
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraOn(true);
    } catch {
      setError("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan dan gunakan localhost.");
    }
  }

  function stopContinuous() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsContinuous(false);
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
      canvas.getContext("2d").drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Failed to capture webcam frame."))), "image/jpeg", 0.82);
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
    intervalRef.current = window.setInterval(processOneFrame, 900);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <Card>
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-teal-50 p-3 text-teal-600 ring-1 ring-teal-100">
          <Video size={24} />
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-950">Browser Webcam Mode</h2>
            <Badge tone="teal">Ephemeral frames</Badge>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Frame webcam diproses sementara dan tidak disimpan di Operational Zone atau Sovereign Vault.
          </p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-950">Original Webcam</h3>
            <Badge tone={isCameraOn ? "emerald" : "slate"}>{isCameraOn ? "camera on" : "camera off"}</Badge>
          </div>
          <video ref={videoRef} muted playsInline className="aspect-video w-full rounded-2xl bg-slate-950 object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {!isCameraOn ? (
              <Button onClick={startCamera}>
                <Video size={18} />
                Start Camera
              </Button>
            ) : (
              <Button variant="danger" onClick={stopCamera}>
                <Square size={18} />
                Stop Camera
              </Button>
            )}

            <Button variant="soft" onClick={processOneFrame} disabled={!isCameraOn || isProcessing}>
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />}
              Process Frame
            </Button>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {!isContinuous ? (
              <Button variant="secondary" onClick={startContinuous} disabled={!isCameraOn}>
                <Play size={18} />
                Start Continuous
              </Button>
            ) : (
              <Button variant="danger" onClick={stopContinuous}>
                <Square size={18} />
                Stop Continuous
              </Button>
            )}
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
              Status: {isContinuous ? "continuous" : isProcessing ? "processing" : "idle"}
            </div>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-950">Redacted Webcam Output</h3>
            <Badge tone="teal">Preview</Badge>
          </div>

          {redactedImage ? (
            <img src={redactedImage} alt="Redacted webcam frame" className="aspect-video w-full rounded-2xl bg-slate-950 object-cover" />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              Redacted webcam output will appear here.
            </div>
          )}

          {stats && (
            <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Latency</p>
                <p className="font-bold text-slate-950">{stats.latencyMs} ms</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Detected</p>
                <p className="font-bold text-slate-950">{stats.detectionCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Redacted</p>
                <p className="font-bold text-slate-950">{stats.redactedCount}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Confidence threshold</label>
            <Badge tone="slate">{Number(confidenceThreshold).toFixed(2)}</Badge>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.99"
            step="0.01"
            value={confidenceThreshold}
            onChange={(event) => setConfidenceThreshold(Number(event.target.value))}
            className="w-full accent-teal-600"
          />
        </div>
        <Select label="Live redaction mode" value={redactionMode} onChange={(event) => setRedactionMode(event.target.value)}>
          <option value="blur">blur</option>
          <option value="pixelate">pixelate</option>
          <option value="black_box">black_box</option>
        </Select>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Input label="Active classes" value={activeClasses} onChange={(event) => setActiveClasses(event.target.value)} placeholder="Kosongkan untuk default" />
        <Input label="Disabled classes" value={disabledClasses} onChange={(event) => setDisabledClasses(event.target.value)} placeholder="Contoh: Wajah" />
      </div>
    </Card>
  );
}
