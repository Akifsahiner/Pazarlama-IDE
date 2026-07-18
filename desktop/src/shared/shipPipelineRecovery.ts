/**
 * Recovery actions when first-ship pipeline fails.
 */
import type { FirstShipTarget } from "./firstHourWow";

export type ShipRecoveryKind = "no_patches" | "run_timeout" | "apply_failed" | "preview_failed";

export interface ShipRecoveryAction {
  kind: ShipRecoveryKind;
  title: string;
  detail: string;
  retryGoal?: string;
}

export function buildShipRecovery(
  kind: ShipRecoveryKind,
  target?: FirstShipTarget,
): ShipRecoveryAction {
  switch (kind) {
    case "no_patches":
      return {
        kind,
        title: "No file changes yet",
        detail: "Retry with a narrower goal focused on meta title and hero CTA only.",
        retryGoal: target
          ? `Update only meta title, meta description, and hero headline in @${target.heroPath ?? "landing page"}. One small patch.`
          : undefined,
      };
    case "run_timeout":
      return {
        kind,
        title: "Run timed out",
        detail: "Try again with a smaller scope — meta tags only.",
        retryGoal: target?.editGoal,
      };
    case "apply_failed":
      return {
        kind,
        title: "Apply did not write files",
        detail: "Check git status and retry apply, or run again with a single-file goal.",
      };
    case "preview_failed":
      return {
        kind,
        title: "Preview server did not start",
        detail: "Your changes may still be applied — open the edited file or retry preview.",
      };
    default:
      return { kind, title: "Something went wrong", detail: "Retry the ship pipeline." };
  }
}
