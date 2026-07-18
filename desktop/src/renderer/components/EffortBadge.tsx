import { Clock, Flame } from "lucide-react";
import type { EffortIntensity } from "@shared/effortEstimate";

const INTENSITY_CLASS: Record<EffortIntensity, string> = {
  sprint: "border-warn/35 bg-warn/10 text-warn",
  standard: "border-accent/30 bg-accent-soft/25 text-accent",
  minimum: "border-line bg-surface-2 text-text-2",
};

export function EffortBadge({
  label,
  intensity = "standard",
  compact = false,
  title,
}: {
  label: string;
  intensity?: EffortIntensity;
  compact?: boolean;
  title?: string;
}) {
  const Icon = intensity === "sprint" ? Flame : Clock;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${INTENSITY_CLASS[intensity]}`}
      title={title ?? "Estimated founder execution time — not AI token usage"}
    >
      <Icon size={10} className="shrink-0" />
      <span className={compact ? "truncate" : ""}>{label}</span>
    </span>
  );
}
