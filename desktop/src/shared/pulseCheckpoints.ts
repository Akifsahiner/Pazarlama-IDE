/**
 * Day 3/5/7 pulse checkpoint persistence — mandatory ritual, not display-only copy.
 */
import type { CmoOpsCadence } from "./cmoOpsCadence";
import type { PulseCheckpointDay } from "./measurementPulse";
import { resolveActivePulseCheckpoint } from "./measurementPulse";

export type PulseAnswer = "yes" | "no";

export interface PulseCheckpointRecord {
  answered_at: string;
  answer: PulseAnswer;
  metric_value?: number;
  metric_preset_id?: string;
}

export interface PulseCheckpointsState {
  day3?: PulseCheckpointRecord;
  day5?: PulseCheckpointRecord;
  day7?: PulseCheckpointRecord;
}

export type CmoOpsCadenceWithPulse = CmoOpsCadence & {
  pulse_checkpoints?: PulseCheckpointsState;
};

const CHECKPOINT_KEY: Record<PulseCheckpointDay, keyof PulseCheckpointsState> = {
  3: "day3",
  5: "day5",
  7: "day7",
};

export function pulseCheckpointKey(day: PulseCheckpointDay): keyof PulseCheckpointsState {
  return CHECKPOINT_KEY[day];
}

export function isPulseCheckpointAnswered(
  cadence: CmoOpsCadenceWithPulse | null | undefined,
  checkpoint: PulseCheckpointDay,
): boolean {
  const key = pulseCheckpointKey(checkpoint);
  return Boolean(cadence?.pulse_checkpoints?.[key]?.answered_at);
}

/** Highest active checkpoint (3/5/7) that still needs an answer. */
export function resolvePendingPulseCheckpoint(
  cadence: CmoOpsCadenceWithPulse | null | undefined,
): PulseCheckpointDay | null {
  if (!cadence) return null;
  const active = resolveActivePulseCheckpoint(cadence.day_index);
  if (!active) return null;
  if (isPulseCheckpointAnswered(cadence, active)) return null;
  return active;
}

export function isPulseRitualPending(cadence: CmoOpsCadenceWithPulse | null | undefined): boolean {
  return resolvePendingPulseCheckpoint(cadence) != null;
}

export function recordPulseCheckpoint(
  cadence: CmoOpsCadenceWithPulse,
  checkpoint: PulseCheckpointDay,
  record: Omit<PulseCheckpointRecord, "answered_at"> & { answered_at?: string },
): CmoOpsCadenceWithPulse {
  const key = pulseCheckpointKey(checkpoint);
  return {
    ...cadence,
    pulse_checkpoints: {
      ...cadence.pulse_checkpoints,
      [key]: {
        ...record,
        answered_at: record.answered_at ?? new Date().toISOString(),
      },
    },
  };
}
