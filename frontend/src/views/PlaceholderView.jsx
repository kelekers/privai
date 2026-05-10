import { AlertTriangle } from "lucide-react";
import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

export default function PlaceholderView({ eyebrow, title, subtitle }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        icon={AlertTriangle}
      />
      <Card>
        <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-3xl bg-sky-50 p-5 text-sky-600 ring-1 ring-sky-100">
            <AlertTriangle size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-950">View unavailable</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            This fallback should not appear during the normal role-based demo flow.
          </p>
        </div>
      </Card>
    </div>
  );
}
