import {
  Activity,
  Building2,
  Database,
  FileText,
  Gauge,
  Home,
  KeyRound,
  Landmark,
  LockKeyhole,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import Badge from "../components/ui/Badge";

const navItems = [
  {
    id: "overview",
    label: "Overview",
    icon: Home,
    description: "Executive summary",
  },
  {
    id: "user-zone",
    label: "User Zone",
    icon: FileText,
    description: "Document redaction",
  },
  {
    id: "operational-zone",
    label: "Operational Zone",
    icon: Database,
    description: "Redacted metadata",
  },
  {
    id: "sovereign-vault",
    label: "Sovereign Vault",
    icon: LockKeyhole,
    description: "Encrypted original",
  },
  {
    id: "government-access",
    label: "Government Access",
    icon: Landmark,
    description: "Vault gateway",
  },
  {
    id: "dynamic-injection",
    label: "Dynamic Injection",
    icon: SlidersHorizontal,
    description: "Runtime policy",
  },
  {
    id: "live-stream",
    label: "Live Stream Track",
    icon: Video,
    description: "Secondary track",
  },
  {
    id: "audit-log",
    label: "Audit Log",
    icon: Activity,
    description: "Security trace",
  },
  {
    id: "metrics",
    label: "Metrics",
    icon: Gauge,
    description: "System status",
  },
];

export default function AppShell({
  activeView,
  onChangeView,
  children,
  health,
  keyInfo,
}) {
  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1500px] gap-5 px-4 py-4">
        <aside className="hidden w-[290px] shrink-0 lg:block">
          <div className="sticky top-4 rounded-[1.65rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-5 rounded-[1.35rem] bg-gradient-to-br from-sky-50 to-teal-50 p-4 ring-1 ring-sky-100">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                <Building2 size={24} />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                PrivAI
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">
                Government Privacy Console
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Local visual firewall for identity protection, operational checking, and sovereign vault access.
              </p>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeView;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeView(item.id)}
                    className={[
                      "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                      active
                        ? "bg-sky-600 text-white shadow-[0_10px_24px_rgba(2,132,199,0.22)]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-9 w-9 items-center justify-center rounded-xl transition",
                        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white",
                      ].join(" ")}
                    >
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className={active ? "block text-xs text-sky-100" : "block text-xs text-slate-400"}>
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-5 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Backend</span>
                <Badge tone={health?.status === "ok" ? "emerald" : "amber"}>
                  {health?.status ?? "checking"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Model</span>
                <Badge tone={health?.model_loaded ? "emerald" : "amber"}>
                  {health?.model_loaded ? "loaded" : "not loaded"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Vault Key</span>
                <Badge tone="sky">v{keyInfo?.active_key?.key_version ?? "-"}</Badge>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-4 rounded-[1.65rem] border border-slate-200/80 bg-white/90 px-5 py-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="sky">Government-first</Badge>
                  <Badge tone="emerald">Local inference</Badge>
                  <Badge tone="violet">Sovereign Vault</Badge>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                  PrivAI Role-Based Demo Flow
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Simulasi end-to-end dari user upload, redacted operational checking, encrypted vault, sampai government access gateway.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <KeyRound className="text-sky-600" size={20} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Active Key
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    v{keyInfo?.active_key?.key_version ?? "-"} · {health?.device ?? "unknown"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeView;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeView(item.id)}
                    className={[
                      "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-sky-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600",
                    ].join(" ")}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </header>

          <div className="pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
