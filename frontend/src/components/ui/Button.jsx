const variants = {
  primary:
    "bg-sky-600 text-white shadow-[0_10px_24px_rgba(2,132,199,0.22)] hover:bg-sky-700",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  soft:
    "border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100",
  danger:
    "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
  success:
    "border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant] || variants.primary,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
