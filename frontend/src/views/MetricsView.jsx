import { Activity, Database, Gauge, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";

const checklist = [
  "Backend health returns OK",
  "Model is loaded for local inference",
  "Upload creates redacted operational record",
  "Vault key info is available",
  "Government Access request can be approved",
  "Dynamic Injection policy can save and reset",
  "Live Stream track is accessible separately",
];

export default function MetricsView({
  health,
  modelInfo,
  keyInfo,
  records = [],
  onRefreshStatus,
}) {
  const activeKey = keyInfo?.active_key || {};
  const latest = records[0];

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Metrics"
        title="System Status and Demo Readiness"
        subtitle="A focused monitoring page for backend health, model status, device, vault key, recent records, and demo checklist."
        icon={Gauge}
        action={
          <Button variant="secondary" onClick={onRefreshStatus}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Backend" value={health?.status ?? "checking"} helper="FastAPI local service" icon={ShieldCheck} tone={health?.status === "ok" ? "emerald" : "amber"} />
        <MetricCard label="Model" value={health?.model_loaded ? "Loaded" : "Not loaded"} helper={modelInfo?.model_name ?? modelInfo?.model_path ?? "YOLO model"} icon={Activity} tone="sky" />
        <MetricCard label="Device" value={health?.device ?? "unknown"} helper="Inference runtime" icon={Gauge} tone="violet" />
        <MetricCard label="Vault Key" value={`v${activeKey.key_version ?? "-"}`} helper={activeKey.key_id ?? "Active key"} icon={KeyRound} tone="emerald" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <Badge tone="sky">Recent records</Badge>
          <h2 className="mt-3 text-xl font-bold text-slate-950">Latest Storage Activity</h2>

          {!records.length ? (
            <div className="mt-5 rounded-[1.15rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Database className="mx-auto mb-3 text-slate-400" size={32} />
              <h3 className="font-bold text-slate-950">No records yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Process a document in User Zone to see activity here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {records.slice(0, 5).map((record) => (
                <div
                  key={record.record_id}
                  className="rounded-[1.15rem] border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-mono text-xs text-slate-500">{record.record_id}</p>
                      <p className="mt-1 font-bold text-slate-950">
                        {record.original_filename ?? "privacy_record"}
                      </p>
                    </div>
                    <Badge tone="emerald">{record.redaction_mode ?? "default"}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                    <p>Detected: {record.detection_count ?? 0}</p>
                    <p>Redacted: {record.redacted_count ?? 0}</p>
                    <p>Latency: {record.latency_ms ?? "-"} ms</p>
                    <p>Key: v{record.vault_key_version ?? "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <Badge tone="emerald">Demo checklist</Badge>
          <h2 className="mt-3 text-xl font-bold text-slate-950">Judge Walkthrough</h2>
          <div className="mt-5 space-y-3">
            {checklist.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-[1.15rem] bg-slate-50 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-sky-700 ring-1 ring-sky-100">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.15rem] border border-sky-100 bg-sky-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">
              Latest record
            </p>
            <p className="mt-2 break-all font-mono text-sm text-sky-900">
              {latest?.record_id ?? "No privacy record yet"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
