import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  FileImage,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  buildBackendFileUrl,
  getCryptoKeyInfo,
  getHealth,
  getModelInfo,
  getStorageRecords,
  redactImage,
} from "./api/client";

const CLASS_PRESETS = ["KTP", "SIM", "Paspor", "NIK_Teks", "Wajah", "Plat_Nomor"];

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-2xl bg-cyan-400/10 p-2.5 text-cyan-300">
        <Icon size={22} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatusPill({ label, value, tone = "cyan" }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : tone === "yellow"
        ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-200"
        : tone === "red"
          ? "border-red-400/20 bg-red-400/10 text-red-200"
          : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="mb-1 block text-sm font-medium text-slate-300">{children}</label>;
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
    />
  );
}

function SelectInput(props) {
  return (
    <select
      {...props}
      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
    />
  );
}

function DetectionTable({ detections = [], redactedDetections = [] }) {
  const redactedKeys = useMemo(() => {
    return new Set(
      redactedDetections.map((item) => {
        const box = item.box || {};
        return `${item.class_name}-${box.x1}-${box.y1}-${box.x2}-${box.y2}`;
      }),
    );
  }, [redactedDetections]);

  if (!detections.length) {
    return (
      <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-100">
        Tidak ada objek terdeteksi pada threshold saat ini. Coba turunkan confidence threshold.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="max-h-80 overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Box</th>
              <th className="px-4 py-3">Redaction</th>
            </tr>
          </thead>
          <tbody>
            {detections.map((item, index) => {
              const box = item.box || {};
              const key = `${item.class_name}-${box.x1}-${box.y1}-${box.x2}-${box.y2}`;
              const isRedacted = redactedKeys.has(key);

              return (
                <tr key={`${key}-${index}`} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-white">{item.class_name}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {(Number(item.confidence || 0) * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    x1:{box.x1} y1:{box.y1} x2:{box.x2} y2:{box.y2}
                  </td>
                  <td className="px-4 py-3">
                    {isRedacted ? (
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                        Redacted
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-400/10 px-3 py-1 text-xs text-slate-300">
                        Skipped
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentRecords({ records }) {
  if (!records?.length) {
    return <p className="text-sm text-slate-400">Belum ada record tersimpan.</p>;
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.record_id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-cyan-200">{record.record_id}</p>
              <p className="mt-1 text-sm font-medium text-white">{record.original_filename}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                Operational OK
              </span>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                Vault Key v{record.vault_key_version ?? "-"}
              </span>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
            <p>Mode: {record.redaction_mode}</p>
            <p>Detected: {record.detection_count}</p>
            <p>Redacted: {record.redacted_count}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [keyInfo, setKeyInfo] = useState(null);
  const [records, setRecords] = useState([]);

  const [file, setFile] = useState(null);
  const [originalPreview, setOriginalPreview] = useState("");
  const [result, setResult] = useState(null);

  const [confidenceThreshold, setConfidenceThreshold] = useState(0.35);
  const [profile, setProfile] = useState("government");
  const [redactionMode, setRedactionMode] = useState("default");
  const [activeClasses, setActiveClasses] = useState("");
  const [disabledClasses, setDisabledClasses] = useState("");

  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redactedImageUrl = result?.operational_zone?.redacted_file?.url
    ? buildBackendFileUrl(result.operational_zone.redacted_file.url)
    : "";

  async function loadStatus() {
    setIsLoadingStatus(true);
    setError("");

    try {
      const [healthData, modelData, keyData, recordsData] = await Promise.all([
        getHealth(),
        getModelInfo(),
        getCryptoKeyInfo(),
        getStorageRecords(),
      ]);

      setHealth(healthData);
      setModelInfo(modelData);
      setKeyInfo(keyData);
      setRecords(recordsData.records || []);
    } catch (err) {
      setError("Backend belum aktif atau salah satu endpoint tidak dapat diakses.");
    } finally {
      setIsLoadingStatus(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setError("");

    if (originalPreview) {
      URL.revokeObjectURL(originalPreview);
    }

    setOriginalPreview(URL.createObjectURL(selectedFile));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError("Pilih gambar terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const data = await redactImage({
        file,
        confidenceThreshold,
        profile,
        redactionMode,
        activeClasses,
        disabledClasses,
      });

      setResult(data);
      await loadStatus();
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        "Gagal menjalankan redaction pipeline. Cek backend atau format file.";
      setError(typeof message === "string" ? message : JSON.stringify(message));
    } finally {
      setIsSubmitting(false);
    }
  }

  function setDisablePreset(className) {
    const current = disabledClasses
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (current.includes(className)) {
      setDisabledClasses(current.filter((item) => item !== className).join(","));
    } else {
      setDisabledClasses([...current, className].join(","));
    }
  }

  const disabledSet = new Set(
    disabledClasses
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  return (
    <main className="min-h-screen px-5 py-6 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-2 text-sm uppercase tracking-[0.3em] text-cyan-300">
                PrivAI Government-First MVP
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                Visual Firewall Dashboard
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Upload dokumen atau gambar, jalankan deteksi lokal YOLO, sensor area sensitif,
                simpan hasil redacted ke Operational Zone, dan simpan original terenkripsi ke
                Sovereign Vault.
              </p>
            </div>

            <button
              type="button"
              onClick={loadStatus}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              {isLoadingStatus ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
              Refresh Status
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-3xl border border-red-400/20 bg-red-500/10 p-4 text-red-100">
            <AlertTriangle className="mt-0.5 shrink-0" size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <StatusPill
            label="Backend"
            value={health?.status ?? "checking"}
            tone={health?.status === "ok" ? "green" : "yellow"}
          />
          <StatusPill
            label="Model"
            value={health?.model_loaded ? "loaded" : "not loaded"}
            tone={health?.model_loaded ? "green" : "yellow"}
          />
          <StatusPill
            label="Device"
            value={health?.device ?? "unknown"}
            tone="cyan"
          />
          <StatusPill
            label="Vault Key"
            value={`v${keyInfo?.active_key?.key_version ?? "-"}`}
            tone="cyan"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[430px_1fr]">
          <div className="space-y-6">
            <Card>
              <SectionTitle
                icon={UploadCloud}
                title="Government Redaction Input"
                subtitle="Mode utama MVP: black-box redaction untuk dokumen atau visual pemerintah."
              />

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <FieldLabel>Upload image</FieldLabel>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-cyan-300/30 bg-cyan-300/5 px-4 py-8 text-center transition hover:bg-cyan-300/10">
                    <FileImage className="mb-3 text-cyan-300" size={34} />
                    <span className="text-sm font-semibold text-white">
                      {file ? file.name : "Choose image"}
                    </span>
                    <span className="mt-1 text-xs text-slate-400">JPG, PNG, JPEG, WEBP</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <FieldLabel>Confidence threshold: {Number(confidenceThreshold).toFixed(2)}</FieldLabel>
                  <input
                    type="range"
                    min="0.01"
                    max="0.99"
                    step="0.01"
                    value={confidenceThreshold}
                    onChange={(event) => setConfidenceThreshold(Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>More sensitive</span>
                    <span>More strict</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Profile</FieldLabel>
                    <SelectInput value={profile} onChange={(event) => setProfile(event.target.value)}>
                      <option value="government">government</option>
                      <option value="live_webcam">live_webcam</option>
                    </SelectInput>
                  </div>

                  <div>
                    <FieldLabel>Redaction mode</FieldLabel>
                    <SelectInput
                      value={redactionMode}
                      onChange={(event) => setRedactionMode(event.target.value)}
                    >
                      <option value="default">default by profile</option>
                      <option value="black_box">black_box</option>
                      <option value="blur">blur</option>
                      <option value="pixelate">pixelate</option>
                    </SelectInput>
                  </div>
                </div>

                <div>
                  <FieldLabel>Active classes override</FieldLabel>
                  <TextInput
                    placeholder="Kosongkan untuk default, contoh: KTP,NIK_Teks,Wajah"
                    value={activeClasses}
                    onChange={(event) => setActiveClasses(event.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Disabled classes</FieldLabel>
                  <TextInput
                    placeholder="Contoh: Wajah,Plat_Nomor"
                    value={disabledClasses}
                    onChange={(event) => setDisabledClasses(event.target.value)}
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    {CLASS_PRESETS.map((className) => (
                      <button
                        key={className}
                        type="button"
                        onClick={() => setDisablePreset(className)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          disabledSet.has(className)
                            ? "border-yellow-300/40 bg-yellow-300/20 text-yellow-100"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {disabledSet.has(className) ? `Disabled: ${className}` : className}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  {isSubmitting ? "Processing..." : "Run PrivAI Redaction"}
                </button>
              </form>
            </Card>

            <Card>
              <SectionTitle
                icon={KeyRound}
                title="Sovereign Key Policy"
                subtitle="Ringkasan lifecycle key untuk narasi demo."
              />

              <div className="space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">DEK Policy</p>
                  <p className="mt-1 font-semibold text-white">
                    {keyInfo?.dek_policy?.scope ?? "per_file_upload_session"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    DEK dibuat random setiap upload/session dan tidak disimpan plaintext.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Vault Key</p>
                  <p className="mt-1 font-semibold text-white">
                    {keyInfo?.active_key?.key_id ?? "loading"}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">
                    fp: {keyInfo?.active_key?.public_key_fingerprint ?? "-"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <SectionTitle
                icon={Activity}
                title="Before and After"
                subtitle="Original hanya ditampilkan dari file lokal browser. Backend menyimpan original dalam bentuk terenkripsi di Vault."
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Original Preview</h3>
                    <span className="rounded-full bg-slate-400/10 px-3 py-1 text-xs text-slate-300">
                      Browser local
                    </span>
                  </div>

                  {originalPreview ? (
                    <img
                      src={originalPreview}
                      alt="Original preview"
                      className="max-h-[420px] w-full rounded-2xl object-contain"
                    />
                  ) : (
                    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
                      Belum ada gambar.
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Redacted Output</h3>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                      Operational Zone
                    </span>
                  </div>

                  {redactedImageUrl ? (
                    <img
                      src={redactedImageUrl}
                      alt="Redacted output"
                      className="max-h-[420px] w-full rounded-2xl object-contain"
                    />
                  ) : (
                    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
                      Hasil redaction akan muncul di sini.
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {result && (
              <>
                <section className="grid gap-4 md:grid-cols-4">
                  <StatusPill label="Latency" value={`${result.latency_ms} ms`} tone="cyan" />
                  <StatusPill label="Detected" value={result.detection_count} tone="green" />
                  <StatusPill label="Redacted" value={result.redacted_count} tone="green" />
                  <StatusPill label="Record ID" value={result.record_id?.slice(0, 8) ?? "-"} tone="cyan" />
                </section>

                <Card>
                  <SectionTitle
                    icon={Database}
                    title="Storage Routing Result"
                    subtitle="Memastikan original tidak masuk Operational Zone."
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                      <Database className="mb-3 text-emerald-200" />
                      <h3 className="font-semibold text-white">Operational Zone</h3>
                      <p className="mt-2 text-sm text-emerald-100">
                        Redacted image dan metadata non-private berhasil disimpan.
                      </p>
                      <div className="mt-3 space-y-1 text-xs text-emerald-100/80">
                        <p>Private original stored: {String(result.operational_zone?.stores_private_original)}</p>
                        <p>File: {result.operational_zone?.redacted_file?.filename}</p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                      <LockKeyhole className="mb-3 text-cyan-200" />
                      <h3 className="font-semibold text-white">Sovereign Vault</h3>
                      <p className="mt-2 text-sm text-cyan-100">
                        Original disimpan sebagai encrypted bundle. Akses plaintext hanya melalui Government Access API.
                      </p>
                      <div className="mt-3 space-y-1 text-xs text-cyan-100/80">
                        <p>Plain original stored: {String(result.sovereign_vault?.stores_plain_original)}</p>
                        <p>DEK scope: {result.sovereign_vault?.dek_scope}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <SectionTitle
                    icon={Activity}
                    title="Detection Result"
                    subtitle="Class yang disabled tetap bisa terdeteksi, tetapi tidak ikut disensor."
                  />
                  <DetectionTable
                    detections={result.detections || []}
                    redactedDetections={result.redacted_detections || []}
                  />
                </Card>
              </>
            )}

            <Card>
              <SectionTitle
                icon={Database}
                title="Recent Privacy Records"
                subtitle="Record terbaru dari SQLite backend."
              />
              <RecentRecords records={records} />
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}