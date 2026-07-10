import { ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import type { MarketingCritique } from "@shared/types";
import { decisionQualityTone, type DecisionQualityTone } from "@shared/decisionQuality";

export type { DecisionQualityTone };
export { decisionQualityTone } from "@shared/decisionQuality";

const TONE_CLASS: Record<DecisionQualityTone, string> = {
  ok: "border-ok/35 bg-ok/10 text-ok",
  accent: "border-accent/35 bg-accent-soft text-accent",
  warn: "border-warn/35 bg-warn-soft text-warn",
  neutral: "border-line bg-surface-2 text-text-3",
};

/** Compact quality score for decision cards and run history. */
export function DecisionQualityBadge({
  critique,
  compact = false,
}: {
  critique?: MarketingCritique | null;
  compact?: boolean;
}) {
  if (!critique) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] normal-case text-text-3"
        title="Quality review was not available for this decision"
      >
        <ShieldOff size={10} /> Review skipped
      </span>
    );
  }

  const tone = decisionQualityTone(critique.total, critique.approve);
  const Icon = critique.approve ? ShieldCheck : ShieldAlert;
  const label = critique.approve ? "Approved" : "Needs polish";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium normal-case ${TONE_CLASS[tone]}`}
      title={`Quality review · ${label} · ${critique.total}/60`}
    >
      <Icon size={10} />
      {compact ? `${critique.total}/60` : `Reviewed · ${critique.total}/60`}
      {!compact && critique.approve && <span className="opacity-80">· ✓</span>}
    </span>
  );
}
