import { useEffect, useMemo, useState } from "react";
import {
  Database,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  getCryptoKeyInfo,
  getStorageRecords,
  getVaultRecord,
  rotateVaultKey,
} from "../api/client";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";

function ShortHash({ value }) {
  if (!value) return <span>-</span>;

  return (
    <span className="break-all font-mono text-xs text-slate-600">
      {value.slice(0, 18)}...{value.slice(-12)}
    </span>
  );
}

function VaultRecordCard({ record, selected, onSelect }) {
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

        <Badge tone={record.vault_encrypted ? "sky" : "amber"}>
          encrypted: {String(record.vault_encrypted)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="font-semibold text-slate-400">Key version</p>
          <p className="mt-1 font-bold text-slate-900">v{record.vault_key_version ?? "-"}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="font-semibold text-slate-400">Redaction</p>
          <p className="mt-1 font-bold text-slate-900">{record.redaction_mode}</p>
        </div>
      </div>
    </button>
  );
}

function VaultMetadataPanel({ vaultRecord, selectedRecord, isLoading }) {
  if (!selectedRecord) {
    return (
      <Card>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-3xl bg-slate-50 p-5 text-slate-400 ring-1 ring-slate-100">
            <LockKeyhole size={36} />
          </div>
          <h3 className="text-lg font-bold text-slate-950">Pilih vault record</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Pilih record di sebelah kiri untuk melihat metadata encrypted original bundle.
          </p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <div className="flex min-h-[360px] items-center justify-center text-sm font-semibold text-slate-500">
          Loading vault metadata...
        </div>
      </Card>
    );
  }

  if (!vaultRecord) {
    return (
      <Card>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-3xl bg-amber-50 p-5 text-amber-600 ring-1 ring-amber-100">
            <LockKeyhole size={36} />
          </div>
          <h3 className="text-lg font-bold text-slate-950">Vault metadata belum tersedia</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Pastikan record diproses setelah Sprint Sovereign Vault aktif.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="sky">Sovereign Vault</Badge>
              <Badge tone="violet">Encrypted original</Badge>
            </div>
            <h2 className="text-lg font-bold text-slate-950">
              {vaultRecord.original_filename}
            </h2>
            <p className="mt-1 break-all font-mono text-xs text-slate-500">
              record_id: {vaultRecord.record_id}
            </p>
          </div>

          <Badge tone="emerald">plaintext_returned = {String(vaultRecord.plaintext_returned)}</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Encryption algorithm
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {vaultRecord.encryption_algorithm}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Key version
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {vaultRecord.key_id} · v{vaultRecord.key_version}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Original SHA-256
            </p>
            <p className="mt-2">
              <ShortHash value={vaultRecord.original_sha256} />
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Ciphertext SHA-256
            </p>
            <p className="mt-2">
              <ShortHash value={vaultRecord.ciphertext_sha256} />
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Access level
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {vaultRecord.access_level}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Retention status
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {vaultRecord.retention_status}
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-sky-100 bg-sky-50/60">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Vault Access Rule</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Endpoint vault metadata ini tidak mengembalikan plaintext. Original hanya dapat keluar
              melalui Government Access API dengan request, approval, one-time token, dan audit log.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function SovereignVaultView() {
  const [keyInfo, setKeyInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [vaultRecord, setVaultRecord] = useState(null);
  const [cryptoAdminToken, setCryptoAdminToken] = useState("privai-crypto-admin-demo-token");

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVault, setIsLoadingVault] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadVaultSummary() {
    setIsLoading(true);
    setError("");

    try {
      const [keyData, recordsData] = await Promise.all([
        getCryptoKeyInfo(),
        getStorageRecords(),
      ]);

      const nextRecords = recordsData.records || [];

      setKeyInfo(keyData);
      setRecords(nextRecords);

      if (!selectedRecord && nextRecords.length > 0) {
        setSelectedRecord(nextRecords[0]);
      } else if (selectedRecord) {
        const refreshed = nextRecords.find((item) => item.record_id === selectedRecord.record_id);
        if (refreshed) setSelectedRecord(refreshed);
      }
    } catch (err) {
      setError("Gagal membaca status Sovereign Vault. Pastikan backend aktif.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSelectedVaultRecord(record) {
    if (!record) {
      setVaultRecord(null);
      return;
    }

    setIsLoadingVault(true);
    setError("");

    try {
      const data = await getVaultRecord(record.record_id);
      setVaultRecord(data);
    } catch (err) {
      setVaultRecord(null);
      setError("Gagal membaca vault metadata untuk record terpilih.");
    } finally {
      setIsLoadingVault(false);
    }
  }

  async function handleSelectRecord(record) {
    setSelectedRecord(record);
    await loadSelectedVaultRecord(record);
  }

  async function handleRotateKey() {
    setIsRotating(true);
    setMessage("");
    setError("");

    try {
      const data = await rotateVaultKey(cryptoAdminToken);
      setMessage(`Vault key rotated: ${data.new_key?.key_id || "new key"}`);
      await loadVaultSummary();
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal melakukan key rotation.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsRotating(false);
    }
  }

  useEffect(() => {
    loadVaultSummary();
  }, []);

  useEffect(() => {
    if (selectedRecord) {
      loadSelectedVaultRecord(selectedRecord);
    }
  }, [selectedRecord?.record_id]);

  const summary = useMemo(() => {
    const encryptedCount = records.filter((item) => item.vault_encrypted).length;
    const latestKeyVersion = keyInfo?.active_key?.key_version ?? "-";

    return {
      encryptedCount,
      latestKeyVersion,
      totalRecords: records.length,
      fingerprint: keyInfo?.active_key?.public_key_fingerprint || "-",
    };
  }, [records, keyInfo]);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Sovereign Vault"
        title="Encrypted Original Storage"
        subtitle="Sovereign Vault menyimpan original sebagai encrypted bundle. DEK dibuat random per upload/session, sementara vault key memakai key_id dan key_version."
        icon={LockKeyhole}
        action={
          <Button variant="soft" onClick={loadVaultSummary} disabled={isLoading}>
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

      {message && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Active Key"
          value={`v${summary.latestKeyVersion}`}
          helper="Current vault key version"
          icon={KeyRound}
          tone="sky"
        />
        <MetricCard
          label="Encrypted"
          value={summary.encryptedCount}
          helper="Vault-backed records"
          icon={LockKeyhole}
          tone="violet"
        />
        <MetricCard
          label="Records"
          value={summary.totalRecords}
          helper="Operational references"
          icon={Database}
          tone="amber"
        />
        <MetricCard
          label="DEK Policy"
          value="Per upload"
          helper="Plaintext DEK not stored"
          icon={ShieldCheck}
          tone="emerald"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600 ring-1 ring-sky-100">
              <KeyRound size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Vault Key Lifecycle</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Private key tidak dikirim ke User Zone. User Zone hanya menerima public key yang dipercaya.
                Dalam produksi, distribusi public key harus divalidasi dengan TLS/mTLS, certificate chain,
                fingerprint verification, dan key pinning.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Active key id
              </p>
              <p className="mt-2 break-all font-mono text-xs text-slate-700">
                {keyInfo?.active_key?.key_id || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Public key fingerprint
              </p>
              <p className="mt-2">
                <ShortHash value={summary.fingerprint} />
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Symmetric scheme
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {keyInfo?.symmetric_scheme || "AES-256-GCM"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Asymmetric scheme
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {keyInfo?.asymmetric_scheme || "RSA-OAEP-SHA256"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-amber-100 bg-amber-50/50">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">Key Rotation Demo</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Rotasi key membuat upload baru memakai key version baru. Record lama tetap menyimpan key_version
              lama agar masih dapat dibuka secara terkontrol bila private key versi lama dipertahankan.
            </p>
          </div>

          <Input
            label="Crypto admin token"
            value={cryptoAdminToken}
            onChange={(event) => setCryptoAdminToken(event.target.value)}
            hint="Token demo untuk endpoint rotasi key."
          />

          <Button
            variant="soft"
            className="mt-4 w-full border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200"
            onClick={handleRotateKey}
            disabled={isRotating}
          >
            <KeyRound size={16} />
            {isRotating ? "Rotating..." : "Rotate Vault Key"}
          </Button>
        </Card>
      </div>

      <Card className="border-emerald-100 bg-emerald-50/60">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Envelope Encryption Policy</h3>
            <p className="mt-1 text-sm leading-6 text-emerald-900/80">
              Setiap upload membuat DEK AES-256 baru. Original dienkripsi dengan DEK tersebut.
              DEK plaintext tidak disimpan, tetapi dibungkus menggunakan public key Sovereign Vault.
              Private key tetap berada di Sovereign Vault simulation dan diakses hanya melalui Vault Gateway.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
        <div className="space-y-3">
          {records.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">
                Belum ada vault-backed record. Jalankan redaction dari User Zone terlebih dahulu.
              </p>
            </Card>
          ) : (
            records.map((record) => (
              <VaultRecordCard
                key={record.record_id}
                record={record}
                selected={selectedRecord?.record_id === record.record_id}
                onSelect={handleSelectRecord}
              />
            ))
          )}
        </div>

        <VaultMetadataPanel
          selectedRecord={selectedRecord}
          vaultRecord={vaultRecord}
          isLoading={isLoadingVault}
        />
      </div>
    </div>
  );
}
