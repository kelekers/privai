export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  action,
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-600 ring-1 ring-sky-100">
            <Icon size={24} />
          </div>
        )}
        <div>
          {eyebrow && (
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
