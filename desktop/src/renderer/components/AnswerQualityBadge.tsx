import { ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import type { MarketingAnswerCritique } from "@shared/types";
import { answerQualityTone, type DecisionQualityTone } from "@shared/decisionQuality";

const TONE_CLASS: Record<DecisionQualityTone, string> = {
  ok: "border-ok/35 bg-ok/10 text-ok",
  accent: "border-accent/35 bg-accent-soft text-accent",
  warn: "border-warn/35 bg-warn-soft text-warn",
  neutral: "border-line bg-surface-2 text-text-3",
};

export function AnswerQualityBadge({
  critique,
}: {
  critique?: MarketingAnswerCritique | null;
}) {
  if (!critique) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] text-text-3"
        title="Answer quality gate skipped"
      >
        <ShieldOff size={10} /> Unreviewed
      </span>
    );
  }

  const tone = answerQualityTone(critique.total, critique.approve);
  const Icon = critique.approve ? ShieldCheck : ShieldAlert;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TONE_CLASS[tone]}`}
      title={
        critique.approve
          ? `Answer passed quality gate · ${critique.total}/40`
          : `Answer reviewed · ${critique.total}/40 · generality ${critique.generality_penalty}/10`
      }
    >
      <Icon size={10} />
      {critique.approve ? `Grounded · ${critique.total}/40` : `Polished · ${critique.total}/40`}
    </span>
  );
}
