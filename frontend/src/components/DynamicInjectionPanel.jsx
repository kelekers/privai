import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import {
  getRuntimePolicy,
  resetRuntimePolicy,
  updateRuntimePolicy,
} from "../api/client";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";

const CLASS_PRESETS = ["KTP", "SIM", "Paspor", "NIK_Teks", "Wajah", "Plat_Nomor"];

function splitCsv(value) {
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

  const loadPolicy = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getRuntimePolicy();
      const policy = data.policy || {};

      setPolicyName(policy.policy_name || "");
      setConfidenceThreshold(policy.confidence_threshold ?? 0.35);
      setProfile(policy.profile || "government");
      setRedactionMode(policy.redaction_mode || "black_box");
      setActiveClasses(joinClassList(policy.active_classes));
      setDisabledClasses(joinClassList(policy.disabled_classes));
      setLabelText(policy.label_text || "REDACTED");
      setInjectionNote(policy.injection_note || "");
      setStatus("Runtime policy loaded.");
    } catch {
      setError("Gagal membaca runtime policy.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadPolicy, 0);
    return () => window.clearTimeout(timer);
  }, [loadPolicy]);

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
        active_classes: splitCsv(activeClasses),
        disabled_classes: splitCsv(disabledClasses),
        label_text: labelText,
        injection_note: injectionNote,
      };

      const data = await updateRuntimePolicy(payload);
      setStatus(`Saved: ${data.policy?.policy_name || policyName}`);
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
    } catch {
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

  return (
    <Card>
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-600 ring-1 ring-sky-100">
          <SlidersHorizontal size={24} />
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-950">Runtime Policy Editor</h2>
            <Badge tone="sky">Whitelist keys only</Badge>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Mengubah threshold, mode redaction, class policy, dan label tanpa eval atau arbitrary code execution.
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
        <Input label="Policy name" value={policyName} onChange={(event) => setPolicyName(event.target.value)} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Confidence threshold</label>
            <Badge tone="slate">{Number(confidenceThreshold).toFixed(2)}</Badge>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.99"
            step="0.01"
            value={confidenceThreshold}
            onChange={(event) => setConfidenceThreshold(Number(event.target.value))}
            className="w-full accent-sky-600"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Profile" value={profile} onChange={(event) => setProfile(event.target.value)}>
            <option value="government">government</option>
            <option value="live_webcam">live_webcam</option>
          </Select>

          <Select label="Redaction mode" value={redactionMode} onChange={(event) => setRedactionMode(event.target.value)}>
            <option value="black_box">black_box</option>
            <option value="blur">blur</option>
            <option value="pixelate">pixelate</option>
          </Select>
        </div>

        <Input
          label="Active classes"
          value={activeClasses}
          onChange={(event) => setActiveClasses(event.target.value)}
          placeholder="KTP,SIM,Paspor,NIK_Teks,Wajah,Plat_Nomor"
        />

        <Input
          label="Disabled classes"
          value={disabledClasses}
          onChange={(event) => setDisabledClasses(event.target.value)}
          placeholder="Contoh: Wajah,Plat_Nomor"
        />

        <div className="flex flex-wrap gap-2">
          {CLASS_PRESETS.map((className) => (
            <button
              key={className}
              type="button"
              onClick={() => {
                const current = splitCsv(disabledClasses);
                setDisabledClasses(
                  current.includes(className)
                    ? current.filter((item) => item !== className).join(",")
                    : [...current, className].join(","),
                );
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {className}
            </button>
          ))}
        </div>

        <Input label="Label text" value={labelText} onChange={(event) => setLabelText(event.target.value)} maxLength={30} />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Injection note</span>
          <textarea
            value={injectionNote}
            onChange={(event) => setInjectionNote(event.target.value)}
            maxLength={240}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
        </label>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          Security note: no eval, no arbitrary code, validated fields only.
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            Save Policy
          </Button>

          <Button variant="secondary" onClick={handleReset} disabled={isLoading}>
            <RefreshCw size={18} />
            Reset
          </Button>

          {onApplyToForm && (
            <Button variant="soft" onClick={handleApplyToForm}>
              <SlidersHorizontal size={18} />
              Apply to Form
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
