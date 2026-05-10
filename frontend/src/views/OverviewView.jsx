import { ArrowRight, Database, FileText, Landmark, LockKeyhole, ShieldCheck, Video } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";

export default function OverviewView({ onNavigate, health, keyInfo, records }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Executive Overview"
        title="PrivAI untuk Perlindungan Identitas Pemerintah"
        subtitle="PrivAI mensimulasikan visual firewall lokal untuk mendeteksi data sensitif, melakukan redaction, menyimpan hasil operasional non-private, dan mengamankan original melalui Sovereign Vault."
        icon={ShieldCheck}
        action={
          <Button onClick={() => onNavigate("user-zone")}>
            Start Demo
            <ArrowRight size={16} />
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Backend" value={health?.status ?? "checking"} helper="FastAPI local service" icon={ShieldCheck} tone="emerald" />
        <MetricCard label="Model" value={health?.model_loaded ? "Loaded" : "Not loaded"} helper="YOLO .pt inference" icon={FileText} tone="sky" />
        <MetricCard label="Vault Key" value={`v${keyInfo?.active_key?.key_version ?? "-"}`} helper="Versioned key lifecycle" icon={LockKeyhole} tone="violet" />
        <MetricCard label="Records" value={records?.length ?? 0} helper="Recent privacy records" icon={Database} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <FileText className="mb-4 text-sky-600" size={30} />
          <h3 className="text-lg font-bold text-slate-950">Main Track: Government</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            User/front-office mengunggah dokumen. Sistem melakukan black-box redaction dan mengirim hasil sensor ke Operational Zone.
          </p>
        </Card>

        <Card>
          <LockKeyhole className="mb-4 text-violet-600" size={30} />
          <h3 className="text-lg font-bold text-slate-950">Sovereign Vault</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Original file tidak disimpan plaintext. Data dienkripsi menggunakan DEK per upload/session dan key vault berversi.
          </p>
        </Card>

        <Card>
          <Video className="mb-4 text-teal-600" size={30} />
          <h3 className="text-lg font-bold text-slate-950">Secondary Track: Live Stream</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Untuk integrasi TikTok, YouTube, Instagram, dan OBS melalui Turbo Live atau virtual camera pipeline.
          </p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-bold text-slate-950">End-to-End Flow</h3>
        <div className="grid gap-3 md:grid-cols-5">
          {[
            ["User Zone", "Upload dokumen", FileText],
            ["AI Redaction", "YOLO + black box", ShieldCheck],
            ["Operational Zone", "Redacted metadata", Database],
            ["Sovereign Vault", "Encrypted original", LockKeyhole],
            ["Government Access", "Request + approval", Landmark],
          ].map(([title, desc, Icon]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Icon className="mb-3 text-sky-600" size={22} />
              <p className="font-bold text-slate-950">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
