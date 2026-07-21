/**
 * Recovery actions when first-ship pipeline fails.
 */
import type { ChannelThesis } from "./cmoIntake";
import {
  resolveThesisFirstAction,
  resolveWeek0FirstAction,
  type FirstShipTarget,
} from "./firstHourWow";
import type { ProjectProfile } from "./types";

export type ShipRecoveryKind = "no_patches" | "run_timeout" | "apply_failed" | "preview_failed";

export interface ShipRecoveryAction {
  kind: ShipRecoveryKind;
  title: string;
  detail: string;
  retryGoal?: string;
  /** if_failed playbook hint from task contract. */
  playbookHint?: string;
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
        playbookHint: "Narrow scope to a single file and one field (meta title OR hero headline).",
      };
    case "run_timeout":
      return {
        kind,
        title: "Run timed out",
        detail: "Try again with a smaller scope — meta tags only.",
        retryGoal: target?.editGoal,
        playbookHint: "Split into two runs: meta first, hero second.",
      };
    case "apply_failed":
      return {
        kind,
        title: "Apply did not write files",
        detail: "Check git status and retry apply, or run again with a single-file goal.",
        playbookHint: "Verify git is clean and the target file path exists in the repo.",
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

/** Faz 1 — thesis-aware NO_PATCHES recovery with enriched replan hint. */
export function buildNoPatchesRecovery(input: {
  project: ProjectProfile;
  thesis?: ChannelThesis | null;
  target?: FirstShipTarget;
}): ShipRecoveryAction {
  const week0 = resolveWeek0FirstAction(input.project, input.thesis);
  const thesisId = input.thesis?.id ?? week0.thesisId;

  let retryGoal = week0.runGoal;
  let detail =
    "The CMO could not produce a diff — retry with a narrower, thesis-specific goal.";

  if (week0.mode === "content_draft") {
    detail = `No marketing/ files were created. Retry: ${week0.deliverable}. Save one file at a time if needed.`;
    retryGoal = `${week0.runGoal} Start with exactly ONE file under marketing/ then stop.`;
  } else if (input.target?.heroPath) {
    detail = `No patch for @${input.target.heroPath}. Retry meta title + hero headline only — one field per run.`;
    retryGoal = `Change ONLY the meta title in @${input.target.heroPath}. Single-field patch.`;
  }

  const playbookHint =
    thesisId === "viral_short_form"
      ? "if_failed: fall back to 3 hook scripts in marketing/hooks/ instead of landing edit."
      : thesisId === "landing_conversion"
        ? "if_failed: narrow to meta title only, then hero CTA in a second run."
        : `if_failed: deliver ${week0.deliverable} as a single markdown file.`;

  return {
    kind: "no_patches",
    title: "CMO could not ship a diff yet",
    detail,
    retryGoal,
    playbookHint,
  };
}

export function buildShipRecoveryForThesis(
  kind: ShipRecoveryKind,
  input: {
    project: ProjectProfile;
    thesis?: ChannelThesis | null;
    target?: FirstShipTarget;
  },
): ShipRecoveryAction {
  if (kind === "no_patches") {
    return buildNoPatchesRecovery(input);
  }
  const week0 = input.thesis?.id
    ? resolveThesisFirstAction(input.thesis.id, input.project)
    : resolveWeek0FirstAction(input.project, input.thesis);
  const base = buildShipRecovery(kind, input.target);
  if (kind === "run_timeout" && !base.retryGoal) {
    return { ...base, retryGoal: week0.runGoal };
  }
  return base;
}
