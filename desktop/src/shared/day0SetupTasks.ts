/**
 * Day 0 launch setup as ops tasks — replaces modal stepper ceremony.
 */
import type { CmoOpsCadence, CmoOpsTask } from "./cmoOpsCadence";
import {
  isActivationComplete,
  isRevenueComplete,
  needsRevenueStep,
  type LaunchReadinessInput,
} from "./launchReadiness";

function day0TaskBase(cadenceId: string, suffix: string, index: number, now: string): Pick<CmoOpsTask, "id" | "priority_index" | "status" | "day_slot" | "unlocked_at" | "day_offset"> {
  return {
    id: `${cadenceId}.day0.${suffix}`,
    priority_index: index,
    status: index === 0 ? "in_progress" : "pending",
    day_slot: index === 0 ? "now" : "today",
    unlocked_at: index === 0 ? now : undefined,
    day_offset: 0,
  };
}

/** Prepend Day 0 setup tasks; re-index thesis tasks after setup queue clears. */
export function injectDay0SetupTasks(
  cadence: CmoOpsCadence,
  input: LaunchReadinessInput,
): CmoOpsCadence {
  const now = new Date().toISOString();
  const setup: CmoOpsTask[] = [];
  let idx = 0;

  if (!isActivationComplete(input.productActivation)) {
    setup.push({
      ...day0TaskBase(cadence.id, "activation", idx, now),
      what: "Confirm product activation event",
      why: "Week 1 KPI proof needs one measurable activation signal — defaults from scan are fine.",
      owner: "user",
      done_when: "Activation event label saved in product settings.",
      expected_proof_kind: "note",
    });
    idx += 1;
  }

  if (needsRevenueStep(input.founderFit) && !isRevenueComplete(input.revenueProfile)) {
    setup.push({
      ...day0TaskBase(cadence.id, "revenue", idx, now),
      what: "Complete revenue intake",
      why: "Your 30-day win is paying customers — pricing thesis unlocks monetization ops.",
      owner: "user",
      done_when: "Pricing thesis and revenue target saved.",
      expected_proof_kind: "note",
    });
    idx += 1;
  }

  if (setup.length === 0) return cadence;

  const shifted = cadence.tasks.map((t, i) => ({
    ...t,
    priority_index: setup.length + i,
    status: t.status === "in_progress" ? ("pending" as const) : t.status,
    day_slot: "later" as const,
    unlocked_at: undefined,
  }));

  return {
    ...cadence,
    day_index: 0,
    tasks: [...setup, ...shifted],
    last_focus_reset_at: now,
  };
}

export function hasPendingDay0Setup(cadence: CmoOpsCadence): boolean {
  return cadence.tasks.some(
    (t) => t.id.includes(".day0.") && t.status !== "done" && t.status !== "skipped",
  );
}
