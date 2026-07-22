/**
 * Cursor-style instant wow — fast path to first marketing patch.
 * Quick Start is the default; Full CMO remains available but never blocks first value.
 */
import type { OnboardingTrack } from "./quickStartWedge";

export const CURSOR_WOW = {
  headline: "We read your repo.",
  subhead:
    "One approved patch away from a better landing — the Cursor moment, for marketing execution.",
  primaryCta: "Ship first marketing patch",
  primaryEta: "~5 min to first diff",
  secondaryCta: "Full CMO setup (optional)",
} as const;

export type RevealBeatId =
  | "name"
  | "stack"
  | "routes"
  | "readme"
  | "gaps"
  | "thesis"
  | "moves";

export const FULL_REVEAL_BEATS: RevealBeatId[] = [
  "name",
  "stack",
  "routes",
  "readme",
  "gaps",
  "thesis",
  "moves",
];

/** Quick Start skips slow beats — thesis + moves matter; routes/gaps can wait. */
export const QUICK_REVEAL_BEATS: RevealBeatId[] = ["name", "stack", "thesis", "moves"];

export function defaultOnboardingTrack(): OnboardingTrack {
  return "quick_start";
}

export function revealBeatsForTrack(track?: OnboardingTrack): RevealBeatId[] {
  return track === "full_cmo" ? FULL_REVEAL_BEATS : QUICK_REVEAL_BEATS;
}

/** ms between reveal beats — Cursor-professional pace on Quick Start. */
export function revealBeatDelayMs(track?: OnboardingTrack, reducedMotion?: boolean): number {
  if (reducedMotion) return 0;
  return track === "full_cmo" ? 520 : 180;
}

export function revealInitialDelayMs(reducedMotion?: boolean): number {
  return reducedMotion ? 0 : 280;
}

export interface Week1ReadinessInput {
  onboardingTrack?: OnboardingTrack;
  firstShipAt?: number | null;
  founderFit?: { thirty_day_win?: string } | null;
  revenueProfile?: { pricing_thesis?: unknown } | null;
  measurementReady?: boolean;
  measurementAcknowledged?: boolean;
}

/**
 * After first ship on Quick Start, defer measurement ceremony — founder already saw value.
 * Full CMO still requires explicit measurement ack unless baseline exists.
 */
export function isQuickStartWeek1Ready(input: Week1ReadinessInput): boolean {
  if (input.onboardingTrack !== "quick_start" || !input.firstShipAt) return false;
  const paying = input.founderFit?.thirty_day_win === "paying_customers";
  if (paying && !input.revenueProfile?.pricing_thesis) return false;
  return true;
}

export function shouldShowQuickStartFork(input: {
  onboardingTrack?: OnboardingTrack;
  firstShipAt?: number | null;
}): boolean {
  if (input.firstShipAt) return false;
  return input.onboardingTrack === "full_cmo";
}
