import { useMemo, useState } from "react";
import { Activity, AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import { buildBackendFileUrl } from "../api/client";
import BeforeAfterPanel from "../components/BeforeAfterPanel";
import DetectionTable from "../components/DetectionTable";
import RedactionUploader from "../components/RedactionUploader";
import StorageRoutingPanel from "../components/StorageRoutingPanel";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";

export default function UserZoneView({ onRefreshStatus }) {
  const [originalPreview, setOriginalPreview] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const redactedImageUrl = useMemo(() => {
    const relativeUrl = result?.operational_zone?.redacted_file?.url;
    return relativeUrl ? buildBackendFileUrl(relativeUrl) : "";
  }, [result]);

  function handleOriginalPreview(nextPreview) {
    if (originalPreview) {
      URL.revokeObjectURL(originalPreview);
    }

    setOriginalPreview(nextPreview);
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="User Zone"
        title="Front-Office Document Redaction"
        subtitle="Simulasi pengguna atau petugas layanan publik yang mengunggah dokumen untuk disensor. View ini tidak memberi akses ke original yang sudah masuk Sovereign Vault."
        icon={FileText}
      />

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Pipeline"
          value={isProcessing ? "Running" : result ? "Completed" : "Idle"}
          helper="Local inference"
          icon={Activity}
          tone={result ? "emerald" : "sky"}
        />
        <MetricCard
          label="Latency"
          value={result ? `${result.latency_ms} ms` : "-"}
          helper="Inference time"
          icon={Activity}
          tone="sky"
        />
        <MetricCard
          label="Detected"
          value={result?.detection_count ?? "-"}
          helper="Objects found"
          icon={ShieldCheck}
          tone="amber"
        />
        <MetricCard
          label="Redacted"
          value={result?.redacted_count ?? "-"}
          helper="Objects censored"
          icon={ShieldCheck}
          tone="emerald"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <RedactionUploader
          onOriginalPreview={handleOriginalPreview}
          onResult={setResult}
          onError={setError}
          onProcessingChange={setIsProcessing}
          onAfterSubmit={onRefreshStatus}
        />

        <div className="space-y-5">
          <BeforeAfterPanel
            originalPreview={originalPreview}
            redactedImageUrl={redactedImageUrl}
          />

          {result && (
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Processing Result</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    record_id digunakan sebagai referensi untuk Operational Zone, Vault, dan Government Access.
                  </p>
                </div>
                <Badge tone="sky">{result.record_id?.slice(0, 12) || "record"}</Badge>
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Record ID
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-slate-700">
                    {result.record_id}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Upload Session
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-slate-700">
                    {result.upload_session_id}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <StorageRoutingPanel result={result} />

      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-950">Detection Table</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Class yang dinonaktifkan tetap bisa muncul sebagai deteksi, tetapi statusnya menjadi skipped.
          </p>
        </div>

        <DetectionTable
          detections={result?.detections || []}
          redactedDetections={result?.redacted_detections || []}
        />
      </Card>
    </div>
  );
}
