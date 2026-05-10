import { Database, FileText, Landmark, LockKeyhole, Play, ShieldCheck, Video } from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";

export default function OverviewView({ onNavigate, health, keyInfo, records }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Executive Overview"
        title="PrivAI untuk Perlindungan Identitas Pemerintah"
        subtitle="PrivAI adalah visual firewall lokal untuk mendeteksi data sensitif, melakukan redaction, menyimpan output operasional non-private, dan mengamankan original di Sovereign Vault."
        icon={ShieldCheck}
        action={
          <Button onClick={() => onNavigate?.("user-zone")}>
            <Play size={16} />
            Start Demo
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Backend"
          value={health?.status ?? "checking"}
          helper="FastAPI local service"
          icon={ShieldCheck}
          tone={health?.status === "ok" ? "emerald" : "amber"}
        />
        <MetricCard
          label="Model"
          value={health?.model_loaded ? "Loaded" : "Not loaded"}
          helper="Local computer vision inference"
          icon={FileText}
          tone="sky"
        />
        <MetricCard
          label="Vault Key"
          value={`v${keyInfo?.active_key?.key_version ?? "-"}`}
          helper="Versioned key lifecycle"
          icon={LockKeyhole}
          tone="violet"
        />
        <MetricCard
          label="Records"
          value={records?.length ?? 0}
          helper="Recent privacy records"
          icon={Database}
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <FileText className="mb-4 text-sky-600" size={30} />
          <h3 className="text-lg font-bold text-slate-950">Main Track: Government Documents</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            User/front-office mengunggah dokumen atau gambar identitas. PrivAI menjalankan
            redaction sebelum data masuk ke zona operasional.
          </p>
        </Card>

        <Card>
          <LockKeyhole className="mb-4 text-violet-600" size={30} />
          <h3 className="text-lg font-bold text-slate-950">Sovereign Vault</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Original tidak disimpan plaintext. File asli dienkripsi sebagai vault bundle dengan
            DEK per file/session dan metadata versi key.
          </p>
        </Card>

        <Card>
          <Video className="mb-4 text-teal-600" size={30} />
          <h3 className="text-lg font-bold text-slate-950">Secondary Track: Live Stream</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Jalur tambahan untuk TikTok, YouTube, Instagram, dan OBS melalui Turbo Live atau
            virtual camera pipeline.
          </p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-bold text-slate-950">Simple End-to-End Flow</h3>
        <div className="grid gap-3 md:grid-cols-5">
          {[
            ["User Zone", "Upload dokumen", FileText],
            ["AI Redaction", "Local model + policy", ShieldCheck],
            ["Operational Zone", "Redacted metadata", Database],
            ["Sovereign Vault", "Encrypted original", LockKeyhole],
            ["Government Access", "Request + approval", Landmark],
          ].map(([title, desc, Icon]) => (
            <div key={title} className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
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
