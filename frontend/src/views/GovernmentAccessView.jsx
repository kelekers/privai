import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileKey2,
  KeyRound,
  Landmark,
  RefreshCw,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import {
  approveGovernmentAccessRequest,
  createGovernmentAccessRequest,
  downloadGovernmentOriginal,
  getGovernmentAccessRequest,
  getStorageRecords,
} from "../api/client";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";

function AccessStep({ number, title, description, active, done }) {
  return (
    <div
      className={[
        "rounded-[1.25rem] border p-4 transition",
        done
          ? "border-emerald-100 bg-emerald-50"
          : active
            ? "border-sky-200 bg-sky-50"
            : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            done
              ? "bg-emerald-600 text-white"
              : active
                ? "bg-sky-600 text-white"
                : "bg-slate-100 text-slate-500",
          ].join(" ")}
        >
          {done ? <CheckCircle2 size={18} /> : number}
        </div>

        <div>
          <p className="font-bold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function RecordPicker({ records, selectedRecordId, onSelect }) {
  if (!records.length) {
    return (
      <Card compact>
        <p className="text-sm text-slate-600">
          Belum ada record. Jalankan redaction dari User Zone terlebih dahulu.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => {
        const selected = record.record_id === selectedRecordId;

        return (
          <button
            key={record.record_id}
            type="button"
            onClick={() => onSelect(record.record_id)}
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
                vault: {String(record.vault_encrypted)}
              </Badge>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-400">Mode</p>
                <p className="mt-1 font-bold text-slate-900">{record.redaction_mode}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-400">Key</p>
                <p className="mt-1 font-bold text-slate-900">v{record.vault_key_version ?? "-"}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-400">Redacted</p>
                <p className="mt-1 font-bold text-slate-900">{record.redacted_count}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function GovernmentAccessView() {
  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState("");

  const [requester, setRequester] = useState("petugas_dukcapil");
  const [requesterRole, setRequesterRole] = useState("identity_verification_officer");
  const [reason, setReason] = useState("Verifikasi legal dokumen.");
  const [approvedBy, setApprovedBy] = useState("supervisor_dukcapil");

  const [governmentToken, setGovernmentToken] = useState("privai-government-demo-token");
  const [approverToken, setApproverToken] = useState("privai-approver-demo-token");

  const [requestId, setRequestId] = useState("");
  const [oneTimeToken, setOneTimeToken] = useState("");
  const [accessRequest, setAccessRequest] = useState(null);

  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRecords() {
    setIsLoadingRecords(true);
    setError("");

    try {
      const data = await getStorageRecords();
      const nextRecords = data.records || [];
      setRecords(nextRecords);

      if (!selectedRecordId && nextRecords.length > 0) {
        setSelectedRecordId(nextRecords[0].record_id);
      }
    } catch (err) {
      setError("Gagal membaca daftar record. Pastikan backend aktif.");
    } finally {
      setIsLoadingRecords(false);
    }
  }

  async function refreshAccessRequest(nextRequestId = requestId) {
    if (!nextRequestId) return;

    try {
      const data = await getGovernmentAccessRequest({
        requestId: nextRequestId,
        governmentToken,
      });

      setAccessRequest(data);
    } catch (err) {
      setAccessRequest(null);
    }
  }

  async function handleCreateRequest() {
    if (!selectedRecordId) {
      setError("Pilih record terlebih dahulu.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    setError("");

    try {
      const data = await createGovernmentAccessRequest({
        recordId: selectedRecordId,
        requester,
        requesterRole,
        reason,
        governmentToken,
      });

      setRequestId(data.request_id);
      setOneTimeToken("");
      setAccessRequest({
        request_id: data.request_id,
        record_id: selectedRecordId,
        status: "pending",
        requester,
        requester_role: requesterRole,
        reason,
      });

      setMessage(`Access request dibuat: ${data.request_id}`);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal membuat access request.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleApproveRequest() {
    if (!requestId) {
      setError("Buat access request terlebih dahulu.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    setError("");

    try {
      const data = await approveGovernmentAccessRequest({
        requestId,
        approvedBy,
        approverToken,
      });

      setOneTimeToken(data.one_time_access_token);
      setMessage("Request disetujui. One-time token diterbitkan.");
      await refreshAccessRequest(requestId);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal approve access request.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDownloadOriginal() {
    if (!requestId || !oneTimeToken) {
      setError("Request ID dan one-time token diperlukan.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    setError("");

    try {
      const data = await downloadGovernmentOriginal({
        requestId,
        accessToken: oneTimeToken,
        governmentToken,
      });

      setMessage(`Original berhasil diunduh melalui Vault Gateway: ${data.filename}. Token ini sekarang sudah terpakai.`);
      await refreshAccessRequest(requestId);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal download original melalui Vault Gateway.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const currentStep = useMemo(() => {
    if (accessRequest?.access_token_used_at) return 4;
    if (oneTimeToken || accessRequest?.status === "approved") return 3;
    if (requestId || accessRequest?.status === "pending") return 2;
    return 1;
  }, [requestId, oneTimeToken, accessRequest]);

  const selectedRecord = records.find((item) => item.record_id === selectedRecordId);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Government Access API"
        title="Controlled Vault Gateway"
        subtitle="Akses original tidak dilakukan oleh user biasa dan tidak langsung membuka Sovereign Vault. Pemerintah harus membuat request, mendapat approval, lalu memakai one-time token melalui Vault Gateway."
        icon={Landmark}
        action={
          <Button variant="soft" onClick={loadRecords} disabled={isLoadingRecords}>
            <RefreshCw size={16} className={isLoadingRecords ? "animate-spin" : ""} />
            Refresh Records
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
          label="Selected Record"
          value={selectedRecordId ? selectedRecordId.slice(0, 8) : "-"}
          helper="Vault reference"
          icon={FileKey2}
          tone="sky"
        />
        <MetricCard
          label="Request"
          value={requestId ? "Created" : "None"}
          helper={requestId ? requestId.slice(0, 8) : "Pending action"}
          icon={FileKey2}
          tone={requestId ? "emerald" : "amber"}
        />
        <MetricCard
          label="Approval"
          value={oneTimeToken || accessRequest?.status === "approved" ? "Approved" : "Pending"}
          helper="Supervisor step"
          icon={ShieldCheck}
          tone={oneTimeToken || accessRequest?.status === "approved" ? "emerald" : "amber"}
        />
        <MetricCard
          label="Token"
          value={accessRequest?.access_token_used_at ? "Used" : oneTimeToken ? "Issued" : "None"}
          helper="One-time access"
          icon={KeyRound}
          tone={accessRequest?.access_token_used_at ? "slate" : oneTimeToken ? "emerald" : "amber"}
        />
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-950">Controlled Access Flow</h2>

        <div className="grid gap-3 lg:grid-cols-4">
          <AccessStep
            number="1"
            title="Request"
            description="Petugas pemerintah mengajukan akses ke original berdasarkan record_id."
            active={currentStep === 1}
            done={currentStep > 1}
          />
          <AccessStep
            number="2"
            title="Approval"
            description="Supervisor/approver menyetujui request dan menerbitkan token."
            active={currentStep === 2}
            done={currentStep > 2}
          />
          <AccessStep
            number="3"
            title="One-Time Token"
            description="Token hanya berlaku sekali dan memiliki batas waktu."
            active={currentStep === 3}
            done={currentStep > 3}
          />
          <AccessStep
            number="4"
            title="Secure Download"
            description="Original didekripsi hanya melalui Vault Gateway dan dicatat audit."
            active={currentStep === 4}
            done={currentStep > 4}
          />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Select Vault Record</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Pilih record yang original-nya ingin diakses secara legal melalui Government Access API.
              </p>
            </div>

            <RecordPicker
              records={records}
              selectedRecordId={selectedRecordId}
              onSelect={(recordId) => {
                setSelectedRecordId(recordId);
                setRequestId("");
                setOneTimeToken("");
                setAccessRequest(null);
                setMessage("");
                setError("");
              }}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="sky">Government only</Badge>
                <Badge tone="violet">Vault Gateway</Badge>
              </div>
              <h2 className="text-lg font-bold text-slate-950">Access Request Form</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Form ini mensimulasikan petugas pemerintah yang mengajukan akses ke original untuk kepentingan legal atau verifikasi.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Requester"
                value={requester}
                onChange={(event) => setRequester(event.target.value)}
              />
              <Input
                label="Requester role"
                value={requesterRole}
                onChange={(event) => setRequesterRole(event.target.value)}
              />
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Reason</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="Government token"
                value={governmentToken}
                onChange={(event) => setGovernmentToken(event.target.value)}
                hint="Demo token untuk request dan secure download."
              />
              <Input
                label="Approver token"
                value={approverToken}
                onChange={(event) => setApproverToken(event.target.value)}
                hint="Demo token untuk approval."
              />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Button onClick={handleCreateRequest} disabled={isBusy || !selectedRecordId}>
                <FileKey2 size={16} />
                Request
              </Button>

              <Button variant="soft" onClick={handleApproveRequest} disabled={isBusy || !requestId}>
                <ShieldCheck size={16} />
                Approve
              </Button>

              <Button variant="success" onClick={handleDownloadOriginal} disabled={isBusy || !requestId || !oneTimeToken}>
                <Download size={16} />
                Download
              </Button>
            </div>
          </Card>

          <Card className="border-sky-100 bg-sky-50/60">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
                <TimerReset size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Access Status</h2>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  Token demo ditampilkan di UI untuk kebutuhan hackathon. Dalam produksi, token dikirim melalui kanal internal yang aman.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-sky-100 bg-white/75 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Selected original reference
                </p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700">
                  {selectedRecord?.original_filename || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-white/75 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Request ID
                </p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700">
                  {requestId || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-white/75 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  One-time access token
                </p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700">
                  {oneTimeToken || "-"}
                </p>
              </div>

              {accessRequest && (
                <div className="rounded-2xl border border-sky-100 bg-white/75 p-4 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Status:</span> {accessRequest.status}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Approved by:</span>{" "}
                    {accessRequest.approved_by || "-"}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Token expires:</span>{" "}
                    {accessRequest.access_token_expires_at || "-"}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Token used:</span>{" "}
                    {accessRequest.access_token_used_at || "-"}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card className="border-emerald-100 bg-emerald-50/60">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Security Narrative</h3>
            <p className="mt-1 text-sm leading-6 text-emerald-900/80">
              User biasa tidak memiliki tombol untuk membuka original. Akses data sensitif dipisahkan melalui
              Government Access API, membutuhkan token, approval, one-time access, dan setiap decrypt dicatat
              di audit log backend.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
