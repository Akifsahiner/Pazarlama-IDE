/**
 * Faz 2 — "Our contract" view model from sealed strategic decision.
 */
import { isStrategicDecisionSealed } from "./cmoStrategicOptions";
import type { MarketingProfile, StrategicOption } from "./types";

export interface ContractView {
  optionId: string;
  posture: StrategicOption["posture"];
  postureLabel: string;
  title: string;
  mechanismLabel?: string;
  sealedAt: string;
  cmoCommits: string[];
  founderCommits: string[];
  thirtyDayTarget: StrategicOption["thirty_day_target"];
}

const POSTURE_LABEL: Record<StrategicOption["posture"], string> = {
  safe: "Safe foundation",
  balanced: "Balanced bet",
  category_attack: "Category attack",
};

export function buildContractView(
  profile?: Pick<MarketingProfile, "strategic_decision"> | null,
): ContractView | null {
  if (!profile || !isStrategicDecisionSealed(profile)) return null;
  const decision = profile.strategic_decision;
  if (!decision?.sealed_at || !decision.selected_id) return null;
  const option = decision.options.find((o) => o.id === decision.selected_id);
  if (!option) return null;
  return {
    optionId: option.id,
    posture: option.posture,
    postureLabel: POSTURE_LABEL[option.posture],
    title: option.title,
    mechanismLabel: option.mechanism_label,
    sealedAt: decision.sealed_at,
    cmoCommits: option.cmo_commits,
    founderCommits: option.founder_commits,
    thirtyDayTarget: option.thirty_day_target,
  };
}

/** Default expanded for first 7 days after seal. */
export function isContractDefaultExpanded(sealedAt: string, now = Date.now()): boolean {
  const sealedMs = Date.parse(sealedAt);
  if (!Number.isFinite(sealedMs)) return true;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return now - sealedMs < sevenDaysMs;
}

export function formatThirtyDayTarget(
  target: StrategicOption["thirty_day_target"],
): { headline: string; detail?: string } {
  const confidence = target.confidence;
  if (target.target != null) {
    const unit = target.unit ?? target.metric_label;
    return {
      headline: `${target.metric_label}: ${target.target} ${unit} (${confidence})`,
      detail: target.calibration_note,
    };
  }
  return {
    headline: `${target.metric_label} (${confidence})`,
    detail: target.calibration_note,
  };
}
