import { AlertTriangle } from "lucide-react";
import type { PeakDayInfo } from "@shared/effortEstimate";
import { formatEffortMinutes } from "@shared/effortEstimate";

export function PeakDayWarning({
  peak,
  compact = false,
}: {
  peak: PeakDayInfo;
  compact?: boolean;
}) {
  if (!peak.warning) return null;

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-warn/35 bg-warn/10 px-2 py-0.5 text-[10px] font-medium text-warn"
        title={peak.warning}
      >
        <AlertTriangle size={10} />
        Peak D{peak.day} · ~{formatEffortMinutes(peak.minutes)}
      </span>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-warn/35 bg-warn/[0.07] px-3 py-2 text-mini text-text-2">
      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warn" />
      <div>
        <span className="font-medium text-warn">Peak day (D{peak.day}):</span> {peak.warning}
      </div>
    </div>
  );
}
