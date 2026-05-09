import { useEffect, useState } from "react";
import { ShieldCheck, Database, LockKeyhole, Server } from "lucide-react";
import { getHealth, getModelInfo } from "./api/client";

function StatusBadge({ label, value }) {
  const isReady = value === "ready" || value === "ok" || value === true;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={isReady ? "mt-1 font-semibold text-emerald-300" : "mt-1 font-semibold text-yellow-300"}>
        {String(value)}
      </p>
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStatus() {
      try {
        const [healthData, modelData] = await Promise.all([
          getHealth(),
          getModelInfo(),
        ]);

        setHealth(healthData);
        setModelInfo(modelData);
      } catch (err) {
        setError("Backend belum aktif atau API tidak dapat diakses.");
      }
    }

    loadStatus();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300">
              <ShieldCheck size={32} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
                PrivAI Government-First MVP
              </p>
              <h1 className="text-3xl font-bold md:text-5xl">
                Visual Firewall for Sovereign Identity Protection
              </h1>
            </div>
          </div>

          <p className="max-w-3xl text-slate-300">
            Sprint 0 scaffold is running. Backend, Operational Zone,
            Sovereign Vault simulation, and frontend connectivity are ready
            for the next sprint.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <StatusBadge label="Backend API" value={health?.status ?? "checking"} />
          <StatusBadge label="Operational Zone" value={health?.operational_zone ?? "checking"} />
          <StatusBadge label="Sovereign Vault" value={health?.sovereign_vault ?? "checking"} />
          <StatusBadge label="Model File Exists" value={modelInfo?.model_exists ?? "checking"} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <Server className="mb-4 text-cyan-300" />
            <h2 className="mb-2 text-xl font-semibold">Local Backend</h2>
            <p className="text-sm text-slate-400">
              FastAPI backend will handle YOLO inference, redaction, routing,
              encryption, and audit logging.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <Database className="mb-4 text-cyan-300" />
            <h2 className="mb-2 text-xl font-semibold">Operational Zone</h2>
            <p className="text-sm text-slate-400">
              Stores redacted images and non-private operational metadata only.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <LockKeyhole className="mb-4 text-cyan-300" />
            <h2 className="mb-2 text-xl font-semibold">Sovereign Vault</h2>
            <p className="text-sm text-slate-400">
              Stores encrypted original files and controlled audit metadata.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}