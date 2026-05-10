import { useEffect, useMemo, useState } from "react";
import { useCallback } from "react";
import {
  Activity,
  Database,
  RefreshCw,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { getAuditLogs } from "../api/client";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";
import Select from "../components/ui/Select";

const ZONE_PRESETS = [
  "",
  "Operational Zone",
  "Sovereign Vault",
  "Government Access API",
  "Government Access API / Vault Gateway",
  "Dynamic Injection",
];

const EVENT_PRESETS = [
  "",
  "redacted_output_created",
  "encrypted_original_stored",
  "access_request_created",
  "access_request_approved",
  "authorized_original_decryption",
  "runtime_policy_updated",
  "runtime_policy_reset",
  "runtime_policy_applied",
  "vault_key_initialized",
  "vault_key_rotated",
];

function getZoneTone(zone) {
  if (zone?.includes("Government")) return "sky";
  if (zone?.includes("Vault")) return "violet";
  if (zone?.includes("Operational")) return "emerald";
  if (zone?.includes("Dynamic")) return "amber";
  return "slate";
}

function AuditLogCard({ log }) {
  return (
    <Card compact>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={getZoneTone(log.zone)}>{log.zone}</Badge>
            <Badge tone="slate">{log.event_type}</Badge>
          </div>

          <h3 className="font-bold text-slate-950">{log.action}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
            <p>
              <span className="font-semibold text-slate-700">Actor:</span>{" "}
              {log.actor}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Time:</span>{" "}
              {log.created_at || "-"}
            </p>
          </div>

          <p className="mt-2 break-all font-mono text-xs text-slate-500">
            record_id: {log.record_id}
          </p>
        </div>

        <Badge tone="sky">#{log.id}</Badge>
      </div>

      {log.details && Object.keys(log.details).length > 0 && (
        <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Details JSON
          </summary>
          <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </details>
      )}
    </Card>
  );
}

export default function AuditLogView() {
  const [logs, setLogs] = useState([]);
  const [limit, setLimit] = useState(50);
  const [recordId, setRecordId] = useState("");
  const [zone, setZone] = useState("");
  const [eventType, setEventType] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await getAuditLogs({
        limit,
        recordId,
        zone,
        eventType,
      });

      setLogs(data.logs || []);
      setMessage(`Loaded ${data.count || 0} audit logs.`);
    } catch {
      setError("Gagal membaca audit logs. Pastikan backend aktif dan database sudah dibuat.");
    } finally {
      setIsLoading(false);
    }
  }, [eventType, limit, recordId, zone]);

  useEffect(() => {
    const timer = window.setTimeout(loadLogs, 0);
    return () => window.clearTimeout(timer);
  }, [loadLogs]);

  const summary = useMemo(() => {
    const zones = new Set(logs.map((log) => log.zone));
    const events = new Set(logs.map((log) => log.event_type));
    const vaultDecrypts = logs.filter(
      (log) => log.event_type === "authorized_original_decryption",
    ).length;
    const policyEvents = logs.filter(
      (log) => log.zone === "Dynamic Injection",
    ).length;

    return {
      total: logs.length,
      zones: zones.size,
      events: events.size,
      vaultDecrypts,
      policyEvents,
    };
  }, [logs]);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Audit Log"
        title="Security Event Trace"
        subtitle="Audit log mencatat peristiwa penting seperti redaction, vault storage, runtime policy update, key rotation, access request, approval, dan authorized original decryption."
        icon={Activity}
        action={
          <Button variant="soft" onClick={loadLogs} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh Logs
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
          label="Logs"
          value={summary.total}
          helper="Loaded events"
          icon={Activity}
          tone="sky"
        />
        <MetricCard
          label="Zones"
          value={summary.zones}
          helper="Security domains"
          icon={Database}
          tone="violet"
        />
        <MetricCard
          label="Decrypts"
          value={summary.vaultDecrypts}
          helper="Original access events"
          icon={ShieldCheck}
          tone="emerald"
        />
        <MetricCard
          label="Policy Events"
          value={summary.policyEvents}
          helper="Runtime changes"
          icon={Timer}
          tone="amber"
        />
      </div>

      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-950">Filters</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Gunakan filter ini saat juri bertanya untuk melihat jejak satu record, satu zone, atau satu event type tertentu.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <Input
            label="Record ID"
            value={recordId}
            onChange={(event) => setRecordId(event.target.value)}
            placeholder="Opsional"
          />

          <Select
            label="Zone"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
          >
            {ZONE_PRESETS.map((item) => (
              <option key={item || "all"} value={item}>
                {item || "All zones"}
              </option>
            ))}
          </Select>

          <Select
            label="Event type"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
          >
            {EVENT_PRESETS.map((item) => (
              <option key={item || "all"} value={item}>
                {item || "All events"}
              </option>
            ))}
          </Select>

          <Input
            label="Limit"
            type="number"
            min="1"
            max="200"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={loadLogs} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Apply Filters
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setRecordId("");
              setZone("");
              setEventType("");
              setLimit(50);
            }}
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      <Card className="border-sky-100 bg-sky-50/60">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Audit Narrative</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Untuk sistem pemerintah, audit log adalah bukti bahwa original tidak diakses sembarangan.
              Setiap akses original melalui Government Access API dicatat sebagai authorized_original_decryption,
              lengkap dengan actor, reason, key version, dan record_id.
            </p>
          </div>
        </div>
      </Card>

      {logs.length === 0 ? (
        <Card>
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-3xl bg-slate-50 p-5 text-slate-400 ring-1 ring-slate-100">
              <Activity size={36} />
            </div>
            <h3 className="text-lg font-bold text-slate-950">Belum ada audit log</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Jalankan redaction dari User Zone, update Dynamic Injection policy, rotate key,
              atau lakukan Government Access flow untuk menghasilkan audit events.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <AuditLogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
