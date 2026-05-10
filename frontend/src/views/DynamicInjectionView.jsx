import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import {
  getRuntimePolicy,
  resetRuntimePolicy,
  updateRuntimePolicy,
} from "../api/client";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import MetricCard from "../components/ui/MetricCard";
import SectionHeader from "../components/ui/SectionHeader";
import Select from "../components/ui/Select";

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

function ToggleChip({ active, children, onClick, tone = "sky" }) {
  const activeClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active ? activeClass : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SecurityRule({ title, description, ok = true }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/75 p-4">
      <div className="flex items-start gap-3">
        <div className={ok ? "text-emerald-600" : "text-amber-600"}>
          {ok ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
        </div>
        <div>
          <p className="font-bold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function DynamicInjectionView({ onNavigate }) {
  const [policyName, setPolicyName] = useState("Default Government Policy");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.35);
  const [profile, setProfile] = useState("government");
  const [redactionMode, setRedactionMode] = useState("black_box");
  const [activeClasses, setActiveClasses] = useState("KTP,SIM,Paspor,NIK_Teks,Wajah,Plat_Nomor");
  const [disabledClasses, setDisabledClasses] = useState("");
  const [labelText, setLabelText] = useState("REDACTED");
  const [injectionNote, setInjectionNote] = useState("Default policy for government-first redaction.");

  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function hydrateForm(policy) {
    if (!policy) return;

    setPolicyName(policy.policy_name || "");
    setConfidenceThreshold(policy.confidence_threshold ?? 0.35);
    setProfile(policy.profile || "government");
    setRedactionMode(policy.redaction_mode || "black_box");
    setActiveClasses(joinClassList(policy.active_classes));
    setDisabledClasses(joinClassList(policy.disabled_classes));
    setLabelText(policy.label_text || "REDACTED");
    setInjectionNote(policy.injection_note || "");
  }

  async function loadPolicy() {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await getRuntimePolicy();
      setCurrentPolicy(data.policy);
      hydrateForm(data.policy);
      setMessage("Runtime policy berhasil dimuat.");
    } catch (err) {
      setError("Gagal membaca runtime policy. Pastikan backend aktif.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSavePolicy() {
    setIsSaving(true);
    setError("");
    setMessage("");

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
      setCurrentPolicy(data.policy);
      hydrateForm(data.policy);
      setMessage("Runtime policy berhasil disimpan dan siap dipakai oleh /api/redact?use_runtime_policy=true.");
    } catch (err) {
      const detail = err?.response?.data?.detail || "Gagal menyimpan runtime policy.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPolicy() {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const data = await resetRuntimePolicy();
      setCurrentPolicy(data.policy);
      hydrateForm(data.policy);
      setMessage("Runtime policy dikembalikan ke default government policy.");
    } catch (err) {
      setError("Gagal reset runtime policy.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleClassInCsv(className, value, setter) {
    const current = splitCsv(value);

    if (current.includes(className)) {
      setter(current.filter((item) => item !== className).join(","));
    } else {
      setter([...current, className].join(","));
    }
  }

  const activeSet = useMemo(() => new Set(splitCsv(activeClasses)), [activeClasses]);
  const disabledSet = useMemo(() => new Set(splitCsv(disabledClasses)), [disabledClasses]);

  useEffect(() => {
    loadPolicy();
  }, []);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Dynamic Injection"
        title="Runtime Policy Control"
        subtitle="Dynamic Injection di PrivAI bukan menjalankan kode bebas, melainkan mengubah konfigurasi runtime yang tervalidasi seperti threshold, mode sensor, dan class policy."
        icon={SlidersHorizontal}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={loadPolicy} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => onNavigate?.("user-zone")}>
              Test in User Zone
            </Button>
          </div>
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
          label="Policy"
          value={currentPolicy?.policy_name ? "Loaded" : "Draft"}
          helper={currentPolicy?.policy_name || "Not loaded"}
          icon={SlidersHorizontal}
          tone="sky"
        />
        <MetricCard
          label="Threshold"
          value={Number(confidenceThreshold).toFixed(2)}
          helper="Runtime sensitivity"
          icon={ShieldCheck}
          tone="emerald"
        />
        <MetricCard
          label="Mode"
          value={redactionMode}
          helper="Redaction behavior"
          icon={Code2}
          tone="violet"
        />
        <MetricCard
          label="Disabled"
          value={splitCsv(disabledClasses).length}
          helper="Skipped classes"
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_430px]">
        <Card>
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600 ring-1 ring-sky-100">
              <SlidersHorizontal size={24} />
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="sky">Runtime config</Badge>
                <Badge tone="emerald">Validated</Badge>
              </div>
              <h2 className="text-lg font-bold text-slate-950">Policy Editor</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Ubah aturan tanpa redeploy dan tanpa mengubah source code. Backend hanya menerima key yang di-whitelist.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <Input
              label="Policy name"
              value={policyName}
              onChange={(event) => setPolicyName(event.target.value)}
              hint="Nama skenario, misalnya Panitia Scenario A."
            />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Confidence threshold
                </label>
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
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>More sensitive</span>
                <span>More strict</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Profile"
                value={profile}
                onChange={(event) => setProfile(event.target.value)}
              >
                <option value="government">government</option>
                <option value="live_webcam">live_webcam</option>
              </Select>

              <Select
                label="Redaction mode"
                value={redactionMode}
                onChange={(event) => setRedactionMode(event.target.value)}
              >
                <option value="black_box">black_box</option>
                <option value="blur">blur</option>
                <option value="pixelate">pixelate</option>
              </Select>
            </div>

            <div>
              <Input
                label="Active classes"
                value={activeClasses}
                onChange={(event) => setActiveClasses(event.target.value)}
                hint="Hanya class ini yang akan disensor. Kosongkan berarti tidak ada whitelist eksplisit."
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {CLASS_PRESETS.map((className) => (
                  <ToggleChip
                    key={className}
                    active={activeSet.has(className)}
                    onClick={() => toggleClassInCsv(className, activeClasses, setActiveClasses)}
                    tone="sky"
                  >
                    {activeSet.has(className) ? `Active: ${className}` : className}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <div>
              <Input
                label="Disabled classes"
                value={disabledClasses}
                onChange={(event) => setDisabledClasses(event.target.value)}
                hint="Class tetap terdeteksi, tetapi tidak ikut disensor."
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {CLASS_PRESETS.map((className) => (
                  <ToggleChip
                    key={className}
                    active={disabledSet.has(className)}
                    onClick={() => toggleClassInCsv(className, disabledClasses, setDisabledClasses)}
                    tone="amber"
                  >
                    {disabledSet.has(className) ? `Disabled: ${className}` : className}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <Input
              label="Label text"
              value={labelText}
              onChange={(event) => setLabelText(event.target.value)}
              maxLength={30}
              hint="Label pada black box, maksimal 30 karakter."
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Injection note
              </span>
              <textarea
                value={injectionNote}
                onChange={(event) => setInjectionNote(event.target.value)}
                maxLength={240}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
              <span className="mt-1.5 block text-xs text-slate-500">
                Catatan skenario untuk panitia atau demo.
              </span>
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <Button onClick={handleSavePolicy} disabled={isSaving}>
                <Save size={16} />
                {isSaving ? "Saving..." : "Save Policy"}
              </Button>

              <Button variant="secondary" onClick={handleResetPolicy} disabled={isSaving}>
                <RotateCcw size={16} />
                Reset
              </Button>

              <Button variant="soft" onClick={() => onNavigate?.("user-zone")}>
                Test in User Zone
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-emerald-100 bg-emerald-50/60">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Safety Guardrails</h2>
                <p className="mt-1 text-sm leading-6 text-emerald-900/80">
                  Semua update policy divalidasi oleh backend sebelum disimpan.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <SecurityRule
                title="No eval"
                description="Runtime policy tidak pernah dieksekusi sebagai kode JavaScript atau Python."
              />
              <SecurityRule
                title="Allowed keys only"
                description="Backend menolak key yang tidak masuk whitelist policy."
              />
              <SecurityRule
                title="Validated classes"
                description="Class harus termasuk daftar sensitif yang dikenali sistem."
              />
              <SecurityRule
                title="Validated range"
                description="Confidence threshold dibatasi antara 0.01 sampai 0.99."
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-950">Current Saved Policy</h2>

            {currentPolicy ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Policy name
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {currentPolicy.policy_name}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Profile
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {currentPolicy.profile}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Mode
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {currentPolicy.redaction_mode}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Active classes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(currentPolicy.active_classes || []).map((item) => (
                      <Badge key={item} tone="sky">{item}</Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Disabled classes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(currentPolicy.disabled_classes || []).length ? (
                      currentPolicy.disabled_classes.map((item) => (
                        <Badge key={item} tone="amber">{item}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">None</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Updated at: {currentPolicy.updated_at || "-"}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Policy belum dimuat.
              </p>
            )}
          </Card>
        </div>
      </div>

      <Card className="border-sky-100 bg-sky-50/60">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
            <Code2 size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Demo Usage</h3>
            <p className="mt-1 text-sm leading-6 text-sky-900/80">
              Setelah policy disimpan, masuk ke User Zone, centang Use Runtime Policy, lalu jalankan redaction.
              Backend akan memakai policy ini melalui query <span className="font-mono">use_runtime_policy=true</span>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
