/** Decision quality score thresholds — shared between UI and tests. */

export type DecisionQualityTone = "ok" | "accent" | "warn" | "neutral";

export function decisionQualityTone(total: number, approve?: boolean): DecisionQualityTone {
  if (approve || total >= 45) return "ok";
  if (total >= 35) return "accent";
  if (total > 0) return "warn";
  return "neutral";
}

/** Draft quality thresholds — max score 40 (Faz 7). */
export function draftQualityTone(total: number, approve?: boolean): DecisionQualityTone {
  if (approve || total >= 26) return "ok";
  if (total >= 23) return "accent";
  if (total > 0) return "warn";
  return "neutral";
}
