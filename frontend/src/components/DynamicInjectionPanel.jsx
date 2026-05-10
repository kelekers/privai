import { useEffect, useState } from "react";
import { Loader2, SlidersHorizontal, RotateCcw, Save } from "lucide-react";
import {
  getRuntimePolicy,
  resetRuntimePolicy,
  updateRuntimePolicy,
} from "../api/client";

const CLASS_PRESETS = ["KTP", "SIM", "Paspor", "NIK_Teks", "Wajah", "Plat_Nomor"];

function splitClassInput(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinClassList(value) {
  return Array.isArray(value) ? value.join(",") : "";
}

export default function DynamicInjectionPanel({ onApplyToForm }) {
  const [policyName, setPolicyName] = useState("");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.35);
  const [profile, setProfile] = useState("government");
  const [redactionMode, setRedactionMode] = useState("black_box");
  const [activeClasses, setActiveClasses] = useState("");
  const [disabledClasses, setDisabledClasses] = useState("");
  const [labelText, setLabelText] = useState("REDACTED");
  const [injectionNote, setInjectionNote] = useState("");

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadPolicy() {
    setIsLoading(true);
    setError("");

    try {
      const data = await getRuntimePolicy();
      const policy = data.policy;

      setPolicyName(policy.policy_name || "");
      setConfidenceThreshold(policy.confidence_threshold ?? 0.35);
      setProfile(policy.profile || "government");
      setRedactionMode(policy.redaction_mode || "black_box");
      setActiveClasses(joinClassList(policy.active_classes));
      setDisabledClasses(joinClassList(policy.disabled_classes));
      setLabelText(policy.label_text || "REDACTED");
      setInjectionNote(policy.injection_note || "");
      setStatus("Runtime policy loaded.");
    } catch (err) {
      setError("Gagal membaca runtime policy.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPolicy();
  }, []);

  async function handleSave() {
    setIsLoading(true);
    setError("");
    setStatus("");

    try {
      const payload = {
        policy_name: policyName,
        confidence_threshold: Number(confidenceThreshold),
        profile,
        redaction_mode: redactionMode,
        active_classes: splitClassInput(activeClasses),
        disabled_classes: splitClassInput(disabledClasses),
        label_text: labelText,
        injection_note: injectionNote,
      };

      const data = await updateRuntimePolicy(payload);
      setStatus(`Saved: ${data.policy.policy_name}`);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal menyimpan runtime policy.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset() {
    setIsLoading(true);
    setError("");
    setStatus("");

    try {
      await resetRuntimePolicy();
      await loadPolicy();
      setStatus("Runtime policy reset to default.");
    } catch (err) {
      setError("Gagal reset runtime policy.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleApplyToForm() {
    onApplyToForm?.({
      confidenceThreshold: Number(confidenceThreshold),
      profile,
      redactionMode,
      activeClasses,
      disabledClasses,
    });

    setStatus("Policy applied to redaction form.");
  }

  function toggleDisabledClass(className) {
    const current = splitClassInput(disabledClasses);

    if (current.includes(className)) {
      setDisabledClasses(current.filter((item) => item !== className).join(","));
    } else {
      setDisabledClasses([...current, className].join(","));
    }
  }

  return (
    <section className="rounded-3xl border border-purple-300/20 bg-purple-400/10 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-2xl bg-purple-300/10 p-2.5 text-purple-200">
          <SlidersHorizontal size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Dynamic Injection Panel</h2>
          <p className="text-sm text-slate-400">
            Ubah runtime policy tanpa mengubah source code. Aman karena hanya menerima key yang divalidasi.
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
          <label className="mb-1 block text-sm text-slate-300">Policy name</label>
          <input
            value={policyName}
            onChange={(event) => setPolicyName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-300/60"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Confidence threshold: {Number(confidenceThreshold).toFixed(2)}
          </label>
          <input
            type="range"
            min="0.01"
            max="0.99"
            step="0.01"
            value={confidenceThreshold}
            onChange={(event) => setConfidenceThreshold(Number(event.target.value))}
            className="w-full accent-purple-300"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Profile</label>
            <select
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-300/60"
            >
              <option value="government">government</option>
              <option value="live_webcam">live_webcam</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Redaction mode</label>
            <select
              value={redactionMode}
              onChange={(event) => setRedactionMode(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-300/60"
            >
              <option value="black_box">black_box</option>
              <option value="blur">blur</option>
              <option value="pixelate">pixelate</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Active classes</label>
          <input
            value={activeClasses}
            onChange={(event) => setActiveClasses(event.target.value)}
            placeholder="KTP,SIM,Paspor,NIK_Teks,Wajah,Plat_Nomor"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-300/60"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Disabled classes</label>
          <input
            value={disabledClasses}
            onChange={(event) => setDisabledClasses(event.target.value)}
            placeholder="Contoh: Wajah,Plat_Nomor"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-300/60"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            {CLASS_PRESETS.map((className) => (
              <button
                key={className}
                type="button"
                onClick={() => toggleDisabledClass(className)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10"
              >
                {className}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Label text</label>
          <input
            value={labelText}
            onChange={(event) => setLabelText(event.target.value)}
            maxLength={30}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-300/60"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Injection note</label>
          <textarea
            value={injectionNote}
            onChange={(event) => setInjectionNote(event.target.value)}
            maxLength={240}
            rows={3}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-300/60"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-2xl bg-purple-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-purple-200 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save
          </button>

          <button
            type="button"
            onClick={handleApplyToForm}
            className="rounded-2xl border border-purple-300/30 bg-purple-300/10 px-4 py-3 text-sm font-semibold text-purple-100 hover:bg-purple-300/20"
          >
            Apply to Form
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-60"
          >
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}