/**
 * Faz 2 — Launch readiness stepper: resolve pre-Week-1 setup steps and progress.
 */
import type { ProductActivationProfile } from "./cmoLaneD";
import type { RevenueProfile } from "./cmoRevenuePlane";
import type { FounderFitProfile } from "./types";

export type LaunchReadinessStepId = "activation" | "revenue" | "measurement" | "start";

export interface LaunchReadinessStep {
  id: LaunchReadinessStepId;
  label: string;
  estimateMinutes: number;
  optional?: boolean;
  complete: boolean;
  required: boolean;
}

export interface LaunchReadinessState {
  steps: LaunchReadinessStep[];
  completed: number;
  total: number;
  canStartWeek1: boolean;
}

export interface LaunchReadinessInput {
  founderFit?: FounderFitProfile | null;
  productActivation?: ProductActivationProfile | null;
  revenueProfile?: RevenueProfile | null;
  measurementReady?: boolean;
  /** User acknowledged measurement soft-skip (non-hard gate). */
  measurementAcknowledged?: boolean;
}

export function needsRevenueStep(founderFit?: FounderFitProfile | null): boolean {
  return founderFit?.thirty_day_win === "paying_customers";
}

export function isActivationComplete(productActivation?: ProductActivationProfile | null): boolean {
  return Boolean(productActivation?.activation_event_label?.trim());
}

export function isRevenueComplete(revenueProfile?: RevenueProfile | null): boolean {
  return Boolean(revenueProfile?.pricing_thesis);
}

export function isMeasurementComplete(
  measurementReady: boolean,
  measurementAcknowledged?: boolean,
): boolean {
  return measurementReady || Boolean(measurementAcknowledged);
}

/** Resolve ordered launch-readiness steps and progress counts. */
export function resolveLaunchReadinessSteps(input: LaunchReadinessInput): LaunchReadinessState {
  const steps: LaunchReadinessStep[] = [];
  const activationDone = isActivationComplete(input.productActivation);
  const revenueRequired = needsRevenueStep(input.founderFit);
  const revenueDone = isRevenueComplete(input.revenueProfile);
  const measurementDone = isMeasurementComplete(
    input.measurementReady ?? false,
    input.measurementAcknowledged,
  );

  steps.push({
    id: "activation",
    label: "Product activation",
    estimateMinutes: 2,
    optional: true,
    complete: activationDone,
    required: false,
  });

  if (revenueRequired) {
    steps.push({
      id: "revenue",
      label: "Revenue intake",
      estimateMinutes: 2,
      complete: revenueDone,
      required: true,
    });
  }

  steps.push({
    id: "measurement",
    label: "Measurement baseline",
    estimateMinutes: 2,
    complete: measurementDone,
    required: false,
  });

  const priorRequiredDone =
    (!revenueRequired || revenueDone) && measurementDone;

  steps.push({
    id: "start",
    label: "Start Week 1",
    estimateMinutes: 1,
    complete: false,
    required: true,
  });

  const countable = steps.filter((s) => s.id !== "start");
  const completed = countable.filter((s) => s.complete).length;
  const total = countable.length;

  return {
    steps,
    completed,
    total,
    canStartWeek1: priorRequiredDone,
  };
}

/** Week 1 can begin when revenue (if required) is set; activation is optional. */
export function isWeek1Ready(input: LaunchReadinessInput): boolean {
  const revenueRequired = needsRevenueStep(input.founderFit);
  if (revenueRequired && !isRevenueComplete(input.revenueProfile)) return false;
  return true;
}
