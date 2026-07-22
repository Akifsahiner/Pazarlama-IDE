/**
 * Central plan-studio navigation policy — all canvas/surface paths must use this guard.
 */
import {
  PLAN_STUDIO_WEEK1_BLOCK_REASON,
  shouldBlockPlanStudio,
} from "./northStarFunnel";
import type { CmoOpsCadence } from "./cmoOpsCadence";

export { PLAN_STUDIO_WEEK1_BLOCK_REASON };

export function isPlanStudioBlocked(opsCadence?: CmoOpsCadence | null): boolean {
  return shouldBlockPlanStudio({ opsCadence });
}

export type PlanNavigationMode = "campaign-plan" | "plan";

export function isPlanNavigationTarget(
  mode: string | undefined | null,
): mode is PlanNavigationMode {
  return mode === "campaign-plan" || mode === "plan";
}
