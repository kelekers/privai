import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Camera,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  Video,
} from "lucide-react";
import {
  buildTurboMjpegUrl,
  getTurboLiveStatus,
  startTurboLive,
  stopTurboLive,
} from "../api/client";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";
import Select from "../components/ui/Select";

const QUICK_PRESETS = [
  {
    name: "Fast Face Blur",
    description: "Paling cocok untuk live demo ringan.",
    settings: {
      confidenceThreshold: 0.20,
      redactionMode: "blur",
      activeClasses: "Wajah",
      disabledClasses: "",
      targetWidth: 416,
      inferIntervalMs: 90,
      jpegQuality: 75,
      boxHoldMs: 700,
    },
  },
  {
    name: "Quality Face Blur",
    description: "Lebih jelas, tapi lebih berat.",
    settings: {
      confidenceThreshold: 0.25,
      redactionMode: "blur",
      activeClasses: "Wajah",
      disabledClasses: "",
      targetWidth: 640,
      inferIntervalMs: 90,
      jpegQuality: 82,
      boxHoldMs: 700,
    },
  },
  {
    name: "Stable Turn Handling",
    description: "Lebih stabil saat wajah menoleh.",
    settings: {
      confidenceThreshold: 0.18,
      redactionMode: "blur",
      activeClasses: "Wajah",
      disabledClasses: "",
      targetWidth: 640,
      inferIntervalMs: 100,
      jpegQuality: 75,
      boxHoldMs: 1100,
    },
  },
  {
    name: "Black Box Live Demo",
    description: "Mode sensor tegas untuk demo visual.",
    settings: {
      confidenceThreshold: 0.20,
      redactionMode: "black_box",
      activeClasses: "Wajah",
      disabledClasses: "",
      targetWidth: 416,
      inferIntervalMs: 100,
      jpegQuality: 75,
      boxHoldMs: 700,
    },
  },
];

function SettingRow({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-slate-950">{value}</p>
      {helper && <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>}
    </div>
  );
}

function IntegrationStep({ number, title, description }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
          {number}
        </div>
        <div>
          <p className="font-bold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function LiveStreamView() {
  const [sessionId] = useState("default");
  const [cameraIndex, setCameraIndex] = useState(0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.20);
  const [redactionMode, setRedactionMode] = useState("blur");
  const [activeClasses, setActiveClasses] = useState("Wajah");
  const [disabledClasses, setDisabledClasses] = useState("");
  const [targetWidth, setTargetWidth] = useState(416);
  const [inferIntervalMs, setInferIntervalMs] = useState(90);
  const [jpegQuality, setJpegQuality] = useState(75);
  const [boxHoldMs, setBoxHoldMs] = useState(700);

  const [streamUrl, setStreamUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshStatus() {
    try {
      const data = await getTurboLiveStatus(sessionId);
      setStatus(data);

      if (data.running && !streamUrl) {
        setStreamUrl(buildTurboMjpegUrl(sessionId));
      }
    } catch (err) {
      setError("Gagal membaca status Turbo Live. Pastikan backend aktif.");
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
      setMessage("Turbo Live started. Stream sedang berjalan dari backend OpenCV.");
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

  function applyPreset(preset) {
    setConfidenceThreshold(preset.settings.confidenceThreshold);
    setRedactionMode(preset.settings.redactionMode);
    setActiveClasses(preset.settings.activeClasses);
    setDisabledClasses(preset.settings.disabledClasses);
    setTargetWidth(preset.settings.targetWidth);
    setInferIntervalMs(preset.settings.inferIntervalMs);
    setJpegQuality(preset.settings.jpegQuality);
    setBoxHoldMs(preset.settings.boxHoldMs);
    setMessage(`Preset loaded: ${preset.name}. Klik Start Turbo untuk menjalankan.`);
    setError("");
  }

  useEffect(() => {
    refreshStatus();

    const timer = setInterval(() => {
      refreshStatus();
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  const running = status?.running === true;

  const estimatedMode = useMemo(() => {
    if (targetWidth <= 416 && inferIntervalMs >= 90) return "Fast";
    if (targetWidth >= 640 && inferIntervalMs <= 90) return "Balanced";
    return "Custom";
  }, [targetWidth, inferIntervalMs]);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Secondary Track"
        title="Live Stream Privacy Filter"
        subtitle="Track ini ditujukan untuk integrasi live stream seperti TikTok, YouTube, Instagram, dan OBS. Main product tetap government document redaction, sedangkan live stream adalah jalur pengembangan tambahan."
        icon={Video}
        action={
          <Button variant="soft" onClick={refreshStatus}>
            <RefreshCw size={16} />
            Refresh Status
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Turbo Status"
          value={running ? "Running" : "Stopped"}
          helper="Backend camera stream"
          icon={Video}
          tone={running ? "emerald" : "amber"}
        />
        <MetricCard
          label="Frames"
          value={status?.frame_counter ?? 0}
          helper="Captured frames"
          icon={Activity}
          tone="sky"
        />
        <MetricCard
          label="Inferences"
          value={status?.inference_counter ?? 0}
          helper="YOLO background runs"
          icon={ShieldCheck}
          tone="violet"
        />
        <MetricCard
          label="Latency"
          value={`${status?.latest_stats?.latency_ms ?? 0} ms`}
          helper={estimatedMode}
          icon={Activity}
          tone="emerald"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_430px]">
        <div className="space-y-5">
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="sky">Turbo Local Mode</Badge>
                  <Badge tone="emerald">Fast MJPEG output</Badge>
                  <Badge tone="violet">Background inference</Badge>
                </div>
                <h2 className="text-lg font-bold text-slate-950">Redacted Live Output</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Backend mengambil kamera langsung via OpenCV. YOLO berjalan di background thread, sehingga output stream bisa tetap smooth dengan latest detection boxes.
                </p>
              </div>

              <Badge tone={running ? "emerald" : "amber"}>
                {running ? "streaming" : "offline"}
              </Badge>
            </div>

            {streamUrl || running ? (
              <div className="overflow-hidden rounded-[1.25rem] border border-slate-100 bg-slate-950 p-2">
                <img
                  src={streamUrl || buildTurboMjpegUrl(sessionId)}
                  alt="Turbo live MJPEG stream"
                  className="aspect-video w-full rounded-xl object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                <Camera className="mb-3 text-slate-400" size={38} />
                <p className="text-sm font-semibold text-slate-700">
                  Klik Start Turbo untuk membuka kamera lokal dari backend.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Pastikan tidak ada aplikasi lain yang sedang memakai kamera.
                </p>
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Button onClick={handleStart} disabled={isBusy}>
                <Play size={16} />
                Start Turbo
              </Button>

              <Button variant="danger" onClick={handleStop} disabled={isBusy}>
                <Square size={16} />
                Stop
              </Button>

              <Button variant="secondary" onClick={refreshStatus}>
                <RefreshCw size={16} />
                Refresh
              </Button>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Livestream Integration Path</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Untuk masuk ke TikTok, YouTube, Instagram, atau OBS, output Turbo Live dapat dijadikan sumber kamera virtual pada tahap pengembangan berikutnya.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <IntegrationStep
                number="1"
                title="PrivAI Capture"
                description="Backend mengambil frame dari kamera lokal dengan OpenCV."
              />
              <IntegrationStep
                number="2"
                title="AI Redaction"
                description="YOLO mendeteksi wajah atau class sensitif secara lokal."
              />
              <IntegrationStep
                number="3"
                title="Virtual Camera"
                description="Output diarahkan ke OBS Virtual Camera atau pyvirtualcam."
              />
              <IntegrationStep
                number="4"
                title="Live Apps"
                description="TikTok Studio, YouTube, Instagram, atau OBS memilih PrivAI sebagai camera source."
              />
            </div>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/60">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-950">Why Turbo Mode is Faster</h3>
                <p className="mt-1 text-sm leading-6 text-emerald-900/80">
                  Browser frame upload per request sangat berat karena perlu capture, encode, upload, decode, inference, encode lagi, lalu render base64. Turbo Mode menghilangkan overhead itu dengan mengambil kamera langsung di backend dan mengalirkan output sebagai MJPEG stream.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Turbo Settings</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Rekomendasi demo: active classes Wajah, mode blur, width 416 atau 640, box hold 700 ms.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Camera index"
                type="number"
                value={cameraIndex}
                onChange={(event) => setCameraIndex(Number(event.target.value))}
                hint="Biasanya 0 untuk kamera bawaan laptop."
              />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Confidence threshold
                  </label>
                  <Badge tone="slate">{Number(confidenceThreshold).toFixed(2)}</Badge>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  value={confidenceThreshold}
                  onChange={(event) => setConfidenceThreshold(Number(event.target.value))}
                  className="w-full accent-sky-600"
                />
              </div>

              <Select
                label="Redaction mode"
                value={redactionMode}
                onChange={(event) => setRedactionMode(event.target.value)}
              >
                <option value="blur">blur</option>
                <option value="pixelate">pixelate</option>
                <option value="black_box">black_box</option>
              </Select>

              <Input
                label="Active classes"
                value={activeClasses}
                onChange={(event) => setActiveClasses(event.target.value)}
                hint="Untuk live stream paling aman: Wajah."
              />

              <Input
                label="Disabled classes"
                value={disabledClasses}
                onChange={(event) => setDisabledClasses(event.target.value)}
                placeholder="Opsional"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Target width"
                  value={targetWidth}
                  onChange={(event) => setTargetWidth(Number(event.target.value))}
                >
                  <option value={320}>320</option>
                  <option value={416}>416</option>
                  <option value={640}>640</option>
                  <option value={960}>960</option>
                </Select>

                <Input
                  label="Infer interval ms"
                  type="number"
                  value={inferIntervalMs}
                  onChange={(event) => setInferIntervalMs(Number(event.target.value))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="JPEG quality"
                  type="number"
                  value={jpegQuality}
                  onChange={(event) => setJpegQuality(Number(event.target.value))}
                />

                <Input
                  label="Box hold ms"
                  type="number"
                  value={boxHoldMs}
                  onChange={(event) => setBoxHoldMs(Number(event.target.value))}
                  hint="Naikkan jika blur mati saat wajah menoleh."
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Quick Presets</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Preset ini hanya mengisi setting. Klik Start Turbo untuk menjalankan.
              </p>
            </div>

            <div className="space-y-3">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white p-4 text-left transition hover:border-sky-100 hover:bg-sky-50/50"
                >
                  <p className="font-bold text-slate-950">{preset.name}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Runtime Stats</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Status dari backend Turbo Live session.
              </p>
            </div>

            <div className="grid gap-3">
              <SettingRow
                label="Detection count"
                value={status?.latest_stats?.detection_count ?? 0}
                helper="Jumlah box aktif setelah temporal persistence."
              />
              <SettingRow
                label="Raw detection count"
                value={status?.latest_stats?.raw_detection_count ?? 0}
                helper="Deteksi mentah dari inference terbaru."
              />
              <SettingRow
                label="Redacted count"
                value={status?.latest_stats?.redacted_count ?? 0}
                helper="Jumlah box yang disensor di output stream."
              />
              <SettingRow
                label="Box hold"
                value={`${status?.latest_stats?.box_hold_ms ?? boxHoldMs} ms`}
                helper="Menahan box terakhir saat deteksi hilang sesaat."
              />
              <SettingRow
                label="Last error"
                value={status?.last_error || "-"}
                helper="Error terakhir dari backend session."
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
