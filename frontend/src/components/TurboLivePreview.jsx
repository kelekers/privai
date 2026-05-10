import { useEffect, useState } from "react";
import {
  Gauge,
  Loader2,
  MonitorPlay,
  Play,
  RefreshCw,
  Square,
  Tv,
} from "lucide-react";
import {
  buildTurboMjpegUrl,
  getTurboLiveStatus,
  startTurboLive,
  stopTurboLive,
} from "../api/client";

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

  async function refreshStatus() {
    try {
      const data = await getTurboLiveStatus(sessionId);
      setStatus(data);
    } catch (err) {
      setError("Gagal membaca status Turbo Live.");
    }
  }

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
    refreshStatus();

    const timer = setInterval(() => {
      refreshStatus();
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  const running = status?.running === true;

  return (
    <section className="rounded-3xl border border-lime-300/20 bg-lime-400/10 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-2xl bg-lime-300/10 p-2.5 text-lime-200">
          <MonitorPlay size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Turbo Live Mode</h2>
          <p className="text-sm text-slate-400">
            Fast local pipeline untuk livestream apps. Backend mengambil kamera langsung, inference berjalan di background thread, dan output MJPEG tetap smooth.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Turbo Output Stream</h3>
            <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs text-lime-200">
              {running ? "running" : "stopped"}
            </span>
          </div>

          {streamUrl || running ? (
            <img
              src={streamUrl || buildTurboMjpegUrl(sessionId)}
              alt="Turbo live MJPEG stream"
              className="aspect-video w-full rounded-2xl bg-black object-contain"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-slate-500">
              Klik Start Turbo Live untuk membuka kamera lokal dari backend.
            </div>
          )}

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={isBusy}
              className="flex items-center justify-center gap-2 rounded-2xl bg-lime-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-lime-200 disabled:opacity-60"
            >
              {isBusy ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
              Start Turbo
            </button>

            <button
              type="button"
              onClick={handleStop}
              disabled={isBusy}
              className="flex items-center justify-center gap-2 rounded-2xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-100 hover:bg-red-300/20 disabled:opacity-60"
            >
              <Square size={18} />
              Stop
            </button>

            <button
              type="button"
              onClick={refreshStatus}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/40 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Gauge size={18} />
            Turbo Settings
          </h3>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Camera index</label>
              <input
                type="number"
                value={cameraIndex}
                onChange={(event) => setCameraIndex(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">Mode</label>
              <select
                value={redactionMode}
                onChange={(event) => setRedactionMode(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
              >
                <option value="blur">blur</option>
                <option value="pixelate">pixelate</option>
                <option value="black_box">black_box</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Confidence: {Number(confidenceThreshold).toFixed(2)}
            </label>
            <input
              type="range"
              min="0.01"
              max="0.99"
              step="0.01"
              value={confidenceThreshold}
              onChange={(event) => setConfidenceThreshold(Number(event.target.value))}
              className="w-full accent-lime-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Active classes</label>
            <input
              value={activeClasses}
              onChange={(event) => setActiveClasses(event.target.value)}
              placeholder="Contoh: Wajah"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Disabled classes</label>
            <input
              value={disabledClasses}
              onChange={(event) => setDisabledClasses(event.target.value)}
              placeholder="Contoh: Plat_Nomor"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Width</label>
              <select
                value={targetWidth}
                onChange={(event) => setTargetWidth(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
              >
                <option value={320}>320</option>
                <option value={416}>416</option>
                <option value={640}>640</option>
                <option value={960}>960</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">Infer ms</label>
              <input
                type="number"
                value={inferIntervalMs}
                onChange={(event) => setInferIntervalMs(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">JPEG</label>
              <input
                type="number"
                value={jpegQuality}
                onChange={(event) => setJpegQuality(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-lime-300/60"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Box hold: {boxHoldMs} ms
            </label>
            <input
              type="range"
              min="0"
              max="2000"
              step="50"
              value={boxHoldMs}
              onChange={(event) => setBoxHoldMs(Number(event.target.value))}
              className="w-full accent-lime-300"
            />
            <p className="mt-1 text-xs text-slate-500">
              Naikkan jika blur sering mati saat wajah menoleh. Turunkan jika box terasa terlalu lama tertinggal.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            <p>Frames: {status?.frame_counter ?? 0}</p>
            <p>Inferences: {status?.inference_counter ?? 0}</p>
            <p>Latency: {status?.latest_stats?.latency_ms ?? 0} ms</p>
            <p>Detected: {status?.latest_stats?.detection_count ?? 0}</p>
            <p>Raw detected: {status?.latest_stats?.raw_detection_count ?? 0}</p>
            <p>Redacted: {status?.latest_stats?.redacted_count ?? 0}</p>
            <p>Box hold: {status?.latest_stats?.box_hold_ms ?? boxHoldMs} ms</p>
          </div>

          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs text-cyan-100">
            <Tv className="mb-2" size={16} />
            Untuk TikTok, YouTube, Instagram, output final sebaiknya diarahkan ke OBS Virtual Camera atau pyvirtualcam.
          </div>
        </div>
      </div>
    </section>
  );
}
