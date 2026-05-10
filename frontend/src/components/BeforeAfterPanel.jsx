import { FileImage } from "lucide-react";
import Badge from "./ui/Badge";
import Card from "./ui/Card";

function ImageFrame({ title, badge, badgeTone, imageSrc, emptyText }) {
  return (
    <Card compact>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-950">{title}</h3>
        <Badge tone={badgeTone}>{badge}</Badge>
      </div>

      {imageSrc ? (
        <div className="rounded-[1.15rem] border border-slate-100 bg-slate-50 p-2">
          <img
            src={imageSrc}
            alt={title}
            className="max-h-[420px] w-full rounded-xl object-contain"
          />
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[1.15rem] border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
          <FileImage className="mb-3 text-slate-400" size={34} />
          {emptyText}
        </div>
      )}
    </Card>
  );
}

export default function BeforeAfterPanel({ originalPreview, redactedImageUrl }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ImageFrame
        title="Original Preview"
        badge="Browser local"
        badgeTone="slate"
        imageSrc={originalPreview}
        emptyText="Original preview akan muncul setelah file dipilih."
      />

      <ImageFrame
        title="Redacted Output"
        badge="Operational Zone"
        badgeTone="emerald"
        imageSrc={redactedImageUrl}
        emptyText="Hasil sensor akan muncul setelah pipeline dijalankan."
      />
    </div>
  );
}
