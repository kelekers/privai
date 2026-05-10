import Badge from "./ui/Badge";
import Card from "./ui/Card";

function makeDetectionKey(item) {
  const box = item.box || {};
  return `${item.class_name}-${box.x1}-${box.y1}-${box.x2}-${box.y2}`;
}

export default function DetectionTable({ detections = [], redactedDetections = [] }) {
  const redactedKeys = new Set(redactedDetections.map(makeDetectionKey));

  if (!detections.length) {
    return (
      <Card compact className="border-amber-100 bg-amber-50/80">
        <p className="text-sm font-medium text-amber-800">
          Tidak ada objek terdeteksi pada threshold saat ini.
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-700">
          Turunkan confidence threshold atau gunakan gambar yang lebih jelas.
        </p>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Bounding Box</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {detections.map((item, index) => {
              const box = item.box || {};
              const key = makeDetectionKey(item);
              const isRedacted = redactedKeys.has(key);

              return (
                <tr key={`${key}-${index}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    {item.class_name}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {(Number(item.confidence || 0) * 100).toFixed(2)}%
                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    x1:{box.x1} y1:{box.y1} x2:{box.x2} y2:{box.y2}
                  </td>

                  <td className="px-4 py-3">
                    {isRedacted ? (
                      <Badge tone="emerald">Redacted</Badge>
                    ) : (
                      <Badge tone="slate">Skipped</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
