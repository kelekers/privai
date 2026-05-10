import { useState } from "react";
import { Download, FileKey2, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import {
  approveGovernmentAccessRequest,
  createGovernmentAccessRequest,
  downloadGovernmentOriginal,
} from "../api/client";

export default function GovernmentAccessConsole({ latestRecordId }) {
  const [recordId, setRecordId] = useState(latestRecordId || "");
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

  function useLatestRecord() {
    if (latestRecordId) {
      setRecordId(latestRecordId);
      setStatus("Latest record_id copied.");
    }
  }

  return (
    <section className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-2xl bg-amber-300/10 p-2.5 text-amber-200">
          <ShieldAlert size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Government Access Console</h2>
          <p className="text-sm text-slate-400">
            Simulasi akses raw original melalui Vault Gateway. Ini bukan akses user biasa.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {status && (
        <div className="mb-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
          {status}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Record ID</label>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={recordId}
              onChange={(event) => setRecordId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/60"
            />
            <button
              type="button"
              onClick={useLatestRecord}
              className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/20"
            >
              Use Latest
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Requester</label>
            <input
              value={requester}
              onChange={(event) => setRequester(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/60"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Requester role</label>
            <input
              value={requesterRole}
              onChange={(event) => setRequesterRole(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/60"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Reason</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/60"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Government token</label>
            <input
              value={governmentToken}
              onChange={(event) => setGovernmentToken(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/60"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Approver token</label>
            <input
              value={approverToken}
              onChange={(event) => setApproverToken(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/60"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={handleCreateRequest}
            disabled={isBusy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
          >
            {isBusy ? <Loader2 className="animate-spin" size={18} /> : <FileKey2 size={18} />}
            Request
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={isBusy || !requestId}
            className="flex items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/20 disabled:opacity-60"
          >
            <KeyRound size={18} />
            Approve
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isBusy || !requestId || !oneTimeToken}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-60"
          >
            <Download size={18} />
            Download
          </button>
        </div>

        {requestId && (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-400">
            <p>request_id: {requestId}</p>
            <p className="mt-1 break-all">one_time_token: {oneTimeToken || "-"}</p>
          </div>
        )}
      </div>
    </section>
  );
}