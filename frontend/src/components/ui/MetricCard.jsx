import Card from "./Card";

export default function MetricCard({ label, value, helper, icon: Icon, tone = "sky" }) {
  const iconTone =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : tone === "violet"
          ? "bg-violet-50 text-violet-600"
          : "bg-sky-50 text-sky-600";

  return (
    <Card compact>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
        </div>
        {Icon && (
          <div className={`rounded-2xl p-3 ${iconTone}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </Card>
  );
}
