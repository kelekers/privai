export default function Card({ children, className = "", compact = false }) {
  return (
    <section
      className={[
        "rounded-[1.35rem] border border-slate-200/80 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur",
        compact ? "p-4" : "p-5 md:p-6",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
