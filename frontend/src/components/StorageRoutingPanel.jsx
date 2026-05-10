import { Database, LockKeyhole, ShieldCheck } from "lucide-react";
import Badge from "./ui/Badge";
import Card from "./ui/Card";

export default function StorageRoutingPanel({ result }) {
  if (!result) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Storage routing belum dijalankan</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Setelah upload diproses, sistem akan menunjukkan pemisahan antara Operational Zone dan Sovereign Vault.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="border-emerald-100 bg-emerald-50/60">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm">
            <Database size={24} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-950">Operational Zone</h3>
              <Badge tone="emerald">Redacted only</Badge>
            </div>

            <p className="mt-2 text-sm leading-6 text-emerald-900/80">
              Zona operasional hanya menyimpan hasil redacted dan metadata non-private.
            </p>

            <div className="mt-4 space-y-2 rounded-2xl border border-emerald-100 bg-white/75 p-3 text-xs text-slate-600">
              <p>
                <span className="font-semibold">Private original stored:</span>{" "}
                {String(result.operational_zone?.stores_private_original)}
              </p>
              <p className="truncate">
                <span className="font-semibold">Redacted file:</span>{" "}
                {result.operational_zone?.redacted_file?.filename || "-"}
              </p>
              <p className="truncate">
                <span className="font-semibold">Metadata:</span>{" "}
                {result.operational_zone?.metadata_file?.filename || "-"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-sky-100 bg-sky-50/60">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
            <LockKeyhole size={24} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-950">Sovereign Vault</h3>
              <Badge tone="sky">Encrypted original</Badge>
            </div>

            <p className="mt-2 text-sm leading-6 text-sky-900/80">
              Original disimpan sebagai encrypted bundle. Plaintext hanya keluar melalui Government Access API.
            </p>

            <div className="mt-4 space-y-2 rounded-2xl border border-sky-100 bg-white/75 p-3 text-xs text-slate-600">
              <p>
                <span className="font-semibold">Plain original stored:</span>{" "}
                {String(result.sovereign_vault?.stores_plain_original)}
              </p>
              <p>
                <span className="font-semibold">Encryption:</span>{" "}
                {result.sovereign_vault?.encryption_algorithm || "-"}
              </p>
              <p>
                <span className="font-semibold">DEK scope:</span>{" "}
                {result.sovereign_vault?.dek_scope || "-"}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
