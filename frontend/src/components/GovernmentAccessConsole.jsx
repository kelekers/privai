import { useState } from "react";
import { KeyRound, Landmark, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  approveGovernmentAccessRequest,
  createGovernmentAccessRequest,
  downloadGovernmentOriginal,
} from "../api/client";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";

export default function GovernmentAccessConsole({ latestRecordId = "" }) {
  const [recordId, setRecordId] = useState(latestRecordId);
  const [requestId, setRequestId] = useState("");
  const [oneTimeToken, setOneTimeToken] = useState("");
  const [requester, setRequester] = useState("petugas_dukcapil");
  const [requesterRole, setRequesterRole] = useState("identity_verification_officer");
  const [reason, setReason] = useState("Verifikasi legal dokumen.");
  const [approvedBy, setApprovedBy] = useState("supervisor_dukcapil");
  const [governmentToken, setGovernmentToken] = useState("privai-government-demo-token");
  const [approverToken, setApproverToken] = useState("privai-approver-demo-token");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleCreateRequest() {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await createGovernmentAccessRequest({
        recordId,
        requester,
        requesterRole,
        reason,
        governmentToken,
      });

      setRequestId(data.request_id);
      setOneTimeToken("");
      setStatus(`Access request created: ${data.request_id}`);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal membuat access request.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleApprove() {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await approveGovernmentAccessRequest({
        requestId,
        approvedBy,
        approverToken,
      });

      setOneTimeToken(data.one_time_access_token);
      setStatus("Request approved. One-time token issued.");
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal approve request.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDownload() {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await downloadGovernmentOriginal({
        requestId,
        accessToken: oneTimeToken,
        governmentToken,
      });

      setStatus(`Downloaded: ${data.filename}. Token ini sekarang sudah terpakai.`);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal download original.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 ring-1 ring-amber-100">
          <Landmark size={24} />
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-950">Government Access Console</h2>
            <Badge tone="amber">Vault Gateway</Badge>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Controlled access simulation: request, approval, one-time token, secure download, audit.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {status && (
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
          {status}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input label="Record ID" value={recordId} onChange={(event) => setRecordId(event.target.value)} />
          <div className="flex items-end">
            <Button variant="soft" onClick={() => setRecordId(latestRecordId)} disabled={!latestRecordId}>
              Use Latest
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Requester" value={requester} onChange={(event) => setRequester(event.target.value)} />
          <Input label="Requester role" value={requesterRole} onChange={(event) => setRequesterRole(event.target.value)} />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-3">
          <Input label="Government token" value={governmentToken} onChange={(event) => setGovernmentToken(event.target.value)} />
          <Input label="Approver token" value={approverToken} onChange={(event) => setApproverToken(event.target.value)} />
          <Input label="Approved by" value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Button onClick={handleCreateRequest} disabled={isBusy || !recordId}>
            {isBusy ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
            Request Access
          </Button>

          <Button variant="soft" onClick={handleApprove} disabled={isBusy || !requestId}>
            <ShieldCheck size={18} />
            Approve
          </Button>

          <Button variant="secondary" onClick={handleDownload} disabled={isBusy || !requestId || !oneTimeToken}>
            <LockKeyhole size={18} />
            Secure Download
          </Button>
        </div>

        {requestId && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="break-all">request_id: {requestId}</p>
            <p className="mt-1 break-all">one_time_token: {oneTimeToken || "-"}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
