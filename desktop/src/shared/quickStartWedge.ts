/**
 * Quick Start wedge — ship-first CTA policy before firstShipAt.
 * See QUICK_START_WEDGE_SPEC.md
 */
import type { ChannelThesis } from "./cmoIntake";
import { isStrategicDecisionSealed } from "./cmoStrategicOptions";
import type { MarketingProfile } from "./types";
import { inferIntegrateRoute } from "./assetTarget";

export type OnboardingTrack = "quick_start" | "full_cmo";
export type WedgePhase = "scan" | "ship" | "shipped" | "cmo_unlocked";

export type RevealPrimaryCta =
  | "ship_first_win"
  | "complete_cmo_strategy"
  | "start_week1"
  | "start_plan"
  | "complete_pre_week1";

export interface RevealCtaInput {
  firstShipAt?: number | null;
  heroPath?: string | null;
  channelThesis?: ChannelThesis | null;
  marketingProfile?: MarketingProfile | null;
  week1Ready?: boolean;
  onboardingTrack?: OnboardingTrack;
}

export function resolveRevealPrimaryCta(input: RevealCtaInput): RevealPrimaryCta {
  const { firstShipAt, heroPath, channelThesis, marketingProfile, week1Ready } = input;
  const sealed = isStrategicDecisionSealed(marketingProfile);
  const thesisReady = channelThesis && channelThesis.verdict !== "not_ready";

  if (!firstShipAt && heroPath) return "ship_first_win";

  if (firstShipAt && thesisReady && !sealed) return "complete_cmo_strategy";

  if (thesisReady && sealed && week1Ready) return "start_week1";

  if (thesisReady && sealed && !week1Ready) return "complete_pre_week1";

  if (!heroPath) return "start_plan";

  return "ship_first_win";
}

export function isQuickStartTrack(track?: OnboardingTrack): boolean {
  return track !== "full_cmo";
}

export function quickStartThesisLine(thesis?: ChannelThesis | null): string | undefined {
  if (!thesis) return undefined;
  return `${thesis.title} — ${thesis.headline}`;
}

export function heroPathFromProject(routes?: string[]): string | undefined {
  if (!routes?.length) return undefined;
  return inferIntegrateRoute(routes.map((r) => r.replace(/\\/g, "/")));
}

export function shouldDeferFullCmoIntake(input: {
  firstShipAt?: number | null;
  onboardingTrack?: OnboardingTrack;
}): boolean {
  if (input.onboardingTrack === "full_cmo") return false;
  return input.firstShipAt == null;
}
