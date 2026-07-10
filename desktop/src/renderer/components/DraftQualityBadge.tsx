import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { MarketingDraftCritique } from "@shared/types";
import { draftQualityTone, type DecisionQualityTone } from "@shared/decisionQuality";

const TONE_CLASS: Record<DecisionQualityTone, string> = {
  ok: "border-ok/35 bg-ok/10 text-ok",
  accent: "border-accent/35 bg-accent-soft text-accent",
  warn: "border-warn/35 bg-warn-soft text-warn",
  neutral: "border-line bg-surface-2 text-text-3",
};

/** Draft copy quality badge (Faz 7). */
export function DraftQualityBadge({
  critique,
  qualityWarn,
  compact = false,
}: {
  critique?: MarketingDraftCritique | null;
  qualityWarn?: boolean;
  compact?: boolean;
}) {
  if (!critique) {
    if (!qualityWarn) return null;
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warn/35 bg-warn-soft px-2 py-0.5 text-[10px] text-warn">
        <ShieldAlert size={10} /> Needs polish
      </span>
    );
  }

  const tone = draftQualityTone(critique.total, critique.approve);
  const Icon = critique.approve ? ShieldCheck : ShieldAlert;
  const label = critique.approve ? "Paste-ready" : qualityWarn ? "Needs polish" : "Reviewed";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium normal-case ${TONE_CLASS[tone]}`}
      title={`Draft review · ${label} · ${critique.total}/40`}
      data-testid="draft-quality-badge"
    >
      <Icon size={10} />
      {compact ? `${critique.total}/40` : `Draft · ${critique.total}/40`}
    </span>
  );
}
