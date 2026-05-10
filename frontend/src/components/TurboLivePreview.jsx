import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2, Play, RefreshCw, Square, Video } from "lucide-react";
import {
  buildTurboMjpegUrl,
  getTurboLiveStatus,
  startTurboLive,
  stopTurboLive,
} from "../api/client";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";

export default function TurboLivePreview() {
  const [sessionId] = useState("default");
  const [cameraIndex, setCameraIndex] = useState(0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25);
  const [redactionMode, setRedactionMode] = useState("blur");
  const [activeClasses, setActiveClasses] = useState("Wajah");
  const [disabledClasses, setDisabledClasses] = useState("");
  const [targetWidth, setTargetWidth] = useState(640);
  const [inferIntervalMs, setInferIntervalMs] = useState(90);
  const [jpegQuality, setJpegQuality] = useState(75);
  const [boxHoldMs, setBoxHoldMs] = useState(700);
  const [streamUrl, setStreamUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const data = await getTurboLiveStatus(sessionId);
      setStatus(data);
    } catch {
      setError("Gagal membaca status Turbo Live.");
    }
  }, [sessionId]);

  async function handleStart() {
    setIsBusy(true);
    setError("");
    setMessage("");

    try {
      await startTurboLive({
        sessionId,
        cameraIndex,
        confidenceThreshold,
        redactionMode,
        activeClasses,
        disabledClasses,
        targetWidth,
        inferIntervalMs,
        jpegQuality,
        boxHoldMs,
      });

      setStreamUrl(buildTurboMjpegUrl(sessionId));
      setMessage("Turbo Live started.");
      await refreshStatus();
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal memulai Turbo Live.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStop() {
    setIsBusy(true);
    setError("");
    setMessage("");

    try {
      await stopTurboLive(sessionId);
      setStreamUrl("");
      setMessage("Turbo Live stopped.");
      await refreshStatus();
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal menghentikan Turbo Live.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(refreshStatus, 0);
    const interval = window.setInterval(refreshStatus, 1500);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [refreshStatus]);

  const running = status?.running === true;

  return (
    <Card>
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-teal-50 p-3 text-teal-600 ring-1 ring-teal-100">
          <Video size={24} />
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-950">Turbo Live Mode</h2>
            <Badge tone={running ? "emerald" : "slate"}>{running ? "running" : "stopped"}</Badge>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Backend camera capture, background inference, and MJPEG output for OBS or virtual camera routing.
          </p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {message && <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
          {streamUrl || running ? (
            <img
              src={streamUrl || buildTurboMjpegUrl(sessionId)}
              alt="Turbo live MJPEG stream"
              className="aspect-video w-full rounded-2xl bg-slate-950 object-contain"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center text-sm text-slate-500">
              Start Turbo Live to open the backend camera stream.
            </div>
          )}

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <Button onClick={handleStart} disabled={isBusy}>
              {isBusy ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
              Start Turbo
            </Button>
            <Button variant="danger" onClick={handleStop} disabled={isBusy}>
              <Square size={18} />
              Stop
            </Button>
            <Button variant="secondary" onClick={refreshStatus}>
              <RefreshCw size={18} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-[1.25rem] border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 font-bold text-slate-950">
            <Activity size={18} className="text-sky-600" />
            Turbo Settings
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Camera index" type="number" value={cameraIndex} onChange={(event) => setCameraIndex(Number(event.target.value))} />
            <Select label="Mode" value={redactionMode} onChange={(event) => setRedactionMode(event.target.value)}>
              <option value="blur">blur</option>
              <option value="pixelate">pixelate</option>
              <option value="black_box">black_box</option>
            </Select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Confidence</label>
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

          <Input label="Active classes" value={activeClasses} onChange={(event) => setActiveClasses(event.target.value)} placeholder="Contoh: Wajah" />
          <Input label="Disabled classes" value={disabledClasses} onChange={(event) => setDisabledClasses(event.target.value)} placeholder="Contoh: Plat_Nomor" />

          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Width" value={targetWidth} onChange={(event) => setTargetWidth(Number(event.target.value))}>
              <option value={320}>320</option>
              <option value={416}>416</option>
              <option value={640}>640</option>
              <option value={960}>960</option>
            </Select>
            <Input label="Infer ms" type="number" value={inferIntervalMs} onChange={(event) => setInferIntervalMs(Number(event.target.value))} />
            <Input label="JPEG" type="number" value={jpegQuality} onChange={(event) => setJpegQuality(Number(event.target.value))} />
          </div>

          <Input label="Box hold ms" type="number" value={boxHoldMs} onChange={(event) => setBoxHoldMs(Number(event.target.value))} />

          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 md:grid-cols-2">
            <p>Frames: {status?.frame_counter ?? 0}</p>
            <p>Inferences: {status?.inference_counter ?? 0}</p>
            <p>Latency: {status?.latest_stats?.latency_ms ?? 0} ms</p>
            <p>Redacted: {status?.latest_stats?.redacted_count ?? 0}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
