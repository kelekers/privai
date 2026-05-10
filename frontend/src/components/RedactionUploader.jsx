import { useState } from "react";
import { Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { redactImage } from "../api/client";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";

const CLASS_PRESETS = ["KTP", "SIM", "Paspor", "NIK_Teks", "Wajah", "Plat_Nomor"];

function splitCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function RedactionUploader({
  onOriginalPreview,
  onResult,
  onError,
  onProcessingChange,
  onAfterSubmit,
}) {
  const [file, setFile] = useState(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.35);
  const [profile, setProfile] = useState("government");
  const [redactionMode, setRedactionMode] = useState("default");
  const [activeClasses, setActiveClasses] = useState("");
  const [disabledClasses, setDisabledClasses] = useState("");
  const [useRuntimePolicy, setUseRuntimePolicy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleDisabledClass(className) {
    const current = splitCsv(disabledClasses);

    if (current.includes(className)) {
      setDisabledClasses(current.filter((item) => item !== className).join(","));
    } else {
      setDisabledClasses([...current, className].join(","));
    }
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    onError?.("");
    onResult?.(null);
    onOriginalPreview?.(URL.createObjectURL(selectedFile));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      onError?.("Pilih file gambar terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    onProcessingChange?.(true);
    onError?.("");

    try {
      const data = await redactImage({
        file,
        confidenceThreshold,
        profile,
        redactionMode,
        activeClasses,
        disabledClasses,
        useRuntimePolicy,
      });

      onResult?.(data);
      await onAfterSubmit?.();
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        "Gagal menjalankan redaction pipeline. Pastikan backend aktif dan format file valid.";

      onError?.(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsSubmitting(false);
      onProcessingChange?.(false);
    }
  }

  const disabledSet = new Set(splitCsv(disabledClasses));

  return (
    <Card>
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-600 ring-1 ring-sky-100">
          <UploadCloud size={24} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-950">Document Redaction Request</h2>
            <Badge tone="sky">User Zone</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Front-office hanya mengirim dokumen dan menerima hasil sensor. Original tidak disimpan di Operational Zone.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-sky-200 bg-sky-50/60 px-4 py-8 text-center transition hover:bg-sky-50">
          <UploadCloud className="mb-3 text-sky-600" size={34} />
          <span className="text-sm font-bold text-slate-950">
            {file ? file.name : "Choose image or document scan"}
          </span>
          <span className="mt-1 text-xs text-slate-500">JPG, JPEG, PNG, WEBP</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

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
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>More sensitive</span>
            <span>More strict</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Profile" value={profile} onChange={(event) => setProfile(event.target.value)}>
            <option value="government">government</option>
            <option value="live_webcam">live_webcam</option>
          </Select>

          <Select
            label="Redaction mode"
            value={redactionMode}
            onChange={(event) => setRedactionMode(event.target.value)}
          >
            <option value="default">default by profile</option>
            <option value="black_box">black_box</option>
            <option value="blur">blur</option>
            <option value="pixelate">pixelate</option>
          </Select>
        </div>

        <Input
          label="Active classes override"
          placeholder="Kosongkan untuk default, contoh: KTP,NIK_Teks,Wajah"
          value={activeClasses}
          onChange={(event) => setActiveClasses(event.target.value)}
          hint="Jika diisi, hanya class tersebut yang akan disensor."
        />

        <Input
          label="Disabled classes"
          placeholder="Contoh: Wajah,Plat_Nomor"
          value={disabledClasses}
          onChange={(event) => setDisabledClasses(event.target.value)}
          hint="Class tetap terdeteksi, tetapi tidak disensor."
        />

        <div className="flex flex-wrap gap-2">
          {CLASS_PRESETS.map((className) => (
            <button
              key={className}
              type="button"
              onClick={() => toggleDisabledClass(className)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                disabledSet.has(className)
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {disabledSet.has(className) ? `Disabled: ${className}` : className}
            </button>
          ))}
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm text-violet-900">
          <input
            type="checkbox"
            checked={useRuntimePolicy}
            onChange={(event) => setUseRuntimePolicy(event.target.checked)}
            className="mt-1 accent-violet-600"
          />
          <span>
            <span className="font-bold">Use Runtime Policy</span>
            <br />
            Backend memakai policy Dynamic Injection yang sudah tersimpan.
          </span>
        </label>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
          {isSubmitting ? "Processing..." : "Run PrivAI Redaction"}
        </Button>
      </form>
    </Card>
  );
}
