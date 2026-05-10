import { Construction } from "lucide-react";
import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

export default function PlaceholderView({ eyebrow, title, subtitle }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        icon={Construction}
      />
      <Card>
        <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-3xl bg-sky-50 p-5 text-sky-600 ring-1 ring-sky-100">
            <Construction size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-950">View sedang disusun modular</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Di sub-sprint berikutnya, fitur dari Legacy Console akan dipindahkan ke halaman ini agar alur demo lebih rapi dan role-based.
          </p>
        </div>
      </Card>
    </div>
  );
}
