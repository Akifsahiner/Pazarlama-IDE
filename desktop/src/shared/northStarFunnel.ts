/**
 * North Star funnel — single primary path: ship → seal → Week 1 ops.
 * Plan Studio is backstage during active Week 1; one next action everywhere else.
 */
import type { ChannelThesis } from "./cmoIntake";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import {
  resolveRevealPrimaryCta,
  type OnboardingTrack,
  type RevealPrimaryCta,
} from "./quickStartWedge";
import type { MarketingProfile } from "./types";

export const NORTH_STAR_TAGLINE =
  "Cursor for marketing execution — ship diffs in your repo, run one daily task until Week 1 is done.";

export const PLAN_STUDIO_WEEK1_BLOCK_REASON =
  "Week 1 ops live in Execution Record. Finish this week's tasks — the full 30-day plan unlocks in backstage after Week 1.";

export const PLAN_STUDIO_WEEK1_TAB_HINT =
  "Week 1 — use Execution Record for today's task";

export function isWeek1OpsActive(opsCadence?: CmoOpsCadence | null): boolean {
  return Boolean(opsCadence?.tasks?.length);
}

/** Block Plan Studio navigation and plan generation during active Week 1 ops. */
export function shouldBlockPlanStudio(input: {
  opsCadence?: CmoOpsCadence | null;
}): boolean {
  return isWeek1OpsActive(input.opsCadence);
}

/** Hide competing move grids — one primary action owns the screen. */
export function shouldShowSuggestedMovesGrid(input: {
  opsCadence?: CmoOpsCadence | null;
  commandSurfaceActive?: boolean;
  firstShipAt?: number | null;
  onboardingTrack?: OnboardingTrack;
}): boolean {
  if (isWeek1OpsActive(input.opsCadence)) return false;
  if (input.commandSurfaceActive) return false;
  /** Post-ship pre-Week-1: one primary action only — no plan/move grid. */
  if (input.firstShipAt != null && !isWeek1OpsActive(input.opsCadence)) return false;
  if (input.onboardingTrack !== "full_cmo" && input.firstShipAt == null) return false;
  return true;
}

export function shouldShowGtmKnowledgeStrip(input: {
  opsCadence?: CmoOpsCadence | null;
  firstShipAt?: number | null;
  onboardingTrack?: OnboardingTrack;
}): boolean {
  if (isWeek1OpsActive(input.opsCadence)) return false;
  if (input.firstShipAt != null && !isWeek1OpsActive(input.opsCadence)) return false;
  if (input.onboardingTrack !== "full_cmo" && input.firstShipAt == null) return false;
  return true;
}

export function shouldShowPlanProgressCard(input: {
  opsCadence?: CmoOpsCadence | null;
  planHourStarted?: boolean;
}): boolean {
  if (isWeek1OpsActive(input.opsCadence)) return false;
  return Boolean(input.planHourStarted);
}

export type FirstRunActionId =
  | "ship_first_patch"
  | "complete_cmo_strategy"
  | "complete_launch_setup"
  | "start_week1"
  | "continue_week1_ops"
  | "open_workspace"
  | "connect";

export interface ResolvedFirstRunAction {
  id: FirstRunActionId;
  eyebrow: string;
  title: string;
  reason: string;
  primaryLabel: string;
  /** Optional tertiary link — never competes with primary on equal visual weight. */
  tertiaryLabel?: string;
}

export interface FirstRunActionInput {
  firstShipAt?: number | null;
  heroPath?: string | null;
  channelThesis?: ChannelThesis | null;
  marketingProfile?: MarketingProfile | null;
  week1Ready?: boolean;
  onboardingTrack?: OnboardingTrack;
  opsCadence?: CmoOpsCadence | null;
  connected?: boolean;
  persona?: "marketing" | "sales";
}

function mapRevealCtaToAction(
  cta: RevealPrimaryCta,
  input: FirstRunActionInput,
): ResolvedFirstRunAction {
  const thesisTitle = input.channelThesis?.title;
  switch (cta) {
    case "ship_first_win":
      return {
        id: "ship_first_patch",
        eyebrow: "Quick Start",
        title: "Ship your first marketing patch",
        reason:
          "We read your repo — one approved diff on your landing file. Same folder as Cursor; no re-upload.",
        primaryLabel: "Ship first patch",
        tertiaryLabel: "Personalize Week 1 (optional)",
      };
    case "complete_cmo_strategy":
      return {
        id: "complete_cmo_strategy",
        eyebrow: "After first ship",
        title: "Personalize Week 1 tasks",
        reason:
          "Founder-fit intake tunes your channel thesis — then daily tasks get owners, deadlines, and done-when criteria.",
        primaryLabel: "Personalize Week 1",
      };
    case "complete_pre_week1":
      return {
        id: "complete_launch_setup",
        eyebrow: "Almost there",
        title: "Revenue intake only",
        reason:
          "Your 30-day win is paying customers — add pricing thesis, then Week 1 ops unlock automatically.",
        primaryLabel: "Add revenue intake",
      };
    case "start_week1":
      return {
        id: "start_week1",
        eyebrow: "Ready",
        title: thesisTitle ? `Start Week 1 — ${thesisTitle}` : "Start Week 1 ops",
        reason:
          "Your ops table opens with today's task — bottleneck, owner, and proof criteria.",
        primaryLabel: "Start Week 1",
      };
    case "start_plan":
      return {
        id: "ship_first_patch",
        eyebrow: "Quick Start",
        title: input.persona === "sales" ? "Build ICP and outreach drafts" : "Ship from your repo",
        reason:
          input.connected === false
            ? "Connect for AI runs — or open workspace to review scan results."
            : "No landing file detected — workspace will target README or marketing docs first.",
        primaryLabel: input.connected ? "Open workspace" : "Connect for AI",
      };
    default:
      return {
        id: "open_workspace",
        eyebrow: "Next",
        title: "Continue in workspace",
        reason: NORTH_STAR_TAGLINE,
        primaryLabel: "Open workspace",
      };
  }
}

/** Single prioritized first-run / home action — mirrors reveal CTA policy. */
export function resolveFirstRunPrimaryAction(input: FirstRunActionInput): ResolvedFirstRunAction {
  if (isWeek1OpsActive(input.opsCadence)) {
    return {
      id: "continue_week1_ops",
      eyebrow: "Week 1",
      title: "Today's ops task is waiting",
      reason:
        "Execution Record owns your one next action — bottleneck, owner, done-when, and proof.",
      primaryLabel: "Open workspace",
    };
  }

  const cta = resolveRevealPrimaryCta({
    firstShipAt: input.firstShipAt,
    heroPath: input.heroPath,
    channelThesis: input.channelThesis,
    marketingProfile: input.marketingProfile,
    week1Ready: input.week1Ready,
    onboardingTrack: input.onboardingTrack,
  });

  return mapRevealCtaToAction(cta, input);
}

/** Filter work-surface tabs during Week 1 — Plan Studio moves backstage. */
export function workSurfacesForWeek(input: {
  opsCadence?: CmoOpsCadence | null;
  all: readonly string[];
}): string[] {
  if (!shouldBlockPlanStudio(input)) return [...input.all];
  return input.all.filter((s) => s !== "campaign-plan");
}
