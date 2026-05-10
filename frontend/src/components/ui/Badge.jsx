const tones = {
  sky: "border-sky-100 bg-sky-50 text-sky-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  red: "border-red-100 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
};

export default function Badge({ children, tone = "slate", className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        tones[tone] || tones.slate,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
