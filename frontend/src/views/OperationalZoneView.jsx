import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Eye,
  FileImage,
  RefreshCw,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { API_BASE_URL, getStorageRecords } from "../api/client";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";

function buildRedactedUrl(filename) {
  if (!filename) return "";
  return `${API_BASE_URL}/api/files/redacted/${encodeURIComponent(filename)}`;
}

function EmptyState() {
  return (
    <Card>
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-3xl bg-sky-50 p-5 text-sky-600 ring-1 ring-sky-100">
          <Database size={38} />
        </div>
        <h3 className="text-xl font-bold text-slate-950">Belum ada operational record</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Jalankan proses redaction dari User Zone terlebih dahulu. Setelah itu hasil redacted
          dan metadata non-private akan muncul di sini.
        </p>
      </div>
    </Card>
  );
}

function RecordCard({ record, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(record)}
      className={[
        "w-full rounded-[1.25rem] border p-4 text-left transition",
        selected
          ? "border-sky-200 bg-sky-50 shadow-[0_12px_30px_rgba(2,132,199,0.10)]"
          : "border-slate-200 bg-white hover:border-sky-100 hover:bg-sky-50/40",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">
            {record.original_filename || "Unknown file"}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">
            {record.record_id}
          </p>
        </div>

        <Badge tone={record.stores_private_original_in_operational_zone ? "red" : "emerald"}>
          private: {String(record.stores_private_original_in_operational_zone)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="font-semibold text-slate-400">Mode</p>
          <p className="mt-1 font-bold text-slate-900">{record.redaction_mode}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="font-semibold text-slate-400">Detected</p>
          <p className="mt-1 font-bold text-slate-900">{record.detection_count}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="font-semibold text-slate-400">Redacted</p>
          <p className="mt-1 font-bold text-slate-900">{record.redacted_count}</p>
        </div>
      </div>
    </button>
  );
}

function SelectedRecordPanel({ record }) {
  if (!record) {
    return (
      <Card>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-3xl bg-slate-50 p-5 text-slate-400 ring-1 ring-slate-100">
            <Eye size={36} />
          </div>
          <h3 className="text-lg font-bold text-slate-950">Pilih record</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Pilih salah satu record di sebelah kiri untuk melihat preview hasil redacted dan metadata operasionalnya.
          </p>
        </div>
      </Card>
    );
  }

  const redactedUrl = buildRedactedUrl(record.redacted_filename);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="emerald">Operational Zone</Badge>
              <Badge tone="sky">Redacted output</Badge>
            </div>
            <h2 className="text-lg font-bold text-slate-950">
              {record.redacted_filename || "Redacted file"}
            </h2>
            <p className="mt-1 break-all font-mono text-xs text-slate-500">
              record_id: {record.record_id}
            </p>
          </div>

          <Badge tone={record.stores_private_original_in_operational_zone ? "red" : "emerald"}>
            stores_private_original = {String(record.stores_private_original_in_operational_zone)}
          </Badge>
        </div>

        {redactedUrl ? (
          <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-2">
            <img
              src={redactedUrl}
              alt="Redacted operational output"
              className="max-h-[420px] w-full rounded-xl object-contain"
            />
          </div>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            Preview file tidak tersedia.
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-4 text-lg font-bold text-slate-950">Non-Private Metadata</h3>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Original filename reference
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">
              {record.original_filename}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Redacted filename
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">
              {record.redacted_filename}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Redaction profile
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {record.redaction_profile}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Redaction mode
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {record.redaction_mode}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Detection count
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {record.detection_count}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Redacted count
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {record.redacted_count}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Latency
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {record.latency_ms} ms
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Vault encrypted
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {String(record.vault_encrypted)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function OperationalZoneView() {
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadRecords() {
    setIsLoading(true);
    setError("");

    try {
      const data = await getStorageRecords();
      const nextRecords = data.records || [];

      setRecords(nextRecords);

      if (!selectedRecord && nextRecords.length > 0) {
        setSelectedRecord(nextRecords[0]);
      } else if (selectedRecord) {
        const refreshed = nextRecords.find((item) => item.record_id === selectedRecord.record_id);
        if (refreshed) setSelectedRecord(refreshed);
      }
    } catch (err) {
      setError("Gagal membaca Operational Zone records. Pastikan backend aktif.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const summary = useMemo(() => {
    const total = records.length;
    const totalDetected = records.reduce((sum, item) => sum + Number(item.detection_count || 0), 0);
    const totalRedacted = records.reduce((sum, item) => sum + Number(item.redacted_count || 0), 0);
    const privateLeakCount = records.filter((item) => item.stores_private_original_in_operational_zone).length;

    return {
      total,
      totalDetected,
      totalRedacted,
      privateLeakCount,
    };
  }, [records]);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Operational Zone"
        title="Redacted Metadata and Checking Zone"
        subtitle="Operational Zone bukan public storage. Zona ini hanya digunakan untuk checking operasional atas hasil redacted dan metadata non-private."
        icon={Database}
        action={
          <Button variant="soft" onClick={loadRecords} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Records"
          value={summary.total}
          helper="Operational entries"
          icon={Database}
          tone="sky"
        />
        <MetricCard
          label="Detected"
          value={summary.totalDetected}
          helper="Total detections"
          icon={Eye}
          tone="amber"
        />
        <MetricCard
          label="Redacted"
          value={summary.totalRedacted}
          helper="Total censored boxes"
          icon={ShieldCheck}
          tone="emerald"
        />
        <MetricCard
          label="Private Leak"
          value={summary.privateLeakCount}
          helper="Should remain zero"
          icon={Timer}
          tone={summary.privateLeakCount === 0 ? "emerald" : "amber"}
        />
      </div>

      <Card className="border-sky-100 bg-sky-50/60">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
            <FileImage size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Operational Zone Rule</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Original plaintext tidak boleh disimpan di sini. Original hanya disimpan sebagai encrypted bundle
              di Sovereign Vault, sedangkan zona ini hanya menyimpan hasil redacted dan metadata non-private.
            </p>
          </div>
        </div>
      </Card>

      {records.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
          <div className="space-y-3">
            {records.map((record) => (
              <RecordCard
                key={record.record_id}
                record={record}
                selected={selectedRecord?.record_id === record.record_id}
                onSelect={setSelectedRecord}
              />
            ))}
          </div>

          <SelectedRecordPanel record={selectedRecord} />
        </div>
      )}
    </div>
  );
}
