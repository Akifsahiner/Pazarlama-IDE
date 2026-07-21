import type { ExecutionRecordLifecycle } from "@shared/executionRecord";
import { executionLifecycleLabel } from "@shared/executionRecord";

/** Split "what — why" experiment string into hero headline + subline. */
export function parseExperimentHeadline(experiment: string): {
  headline: string;
  subline?: string;
} {
  const sep = experiment.indexOf(" — ");
  if (sep < 0) return { headline: experiment.trim() };
  return {
    headline: experiment.slice(0, sep).trim(),
    subline: experiment.slice(sep + 3).trim(),
  };
}

/** Parse bottleneck sentence into constraint + next move. */
export function parseBottleneckSentence(sentence: string): {
  constraint?: string;
  move?: string;
} {
  const match = sentence.match(/^Bottleneck (.+?) → next move (.+)$/);
  if (!match) return {};
  return { constraint: match[1]?.trim(), move: match[2]?.trim() };
}

export type StatusTone = "accent" | "warn" | "ok" | "neutral";

export function lifecycleStatusTone(lifecycle: ExecutionRecordLifecycle): StatusTone {
  switch (lifecycle) {
    case "running":
      return "accent";
    case "awaiting_approval":
    case "awaiting_proof":
      return "warn";
    case "applied":
    case "measured":
    case "learned":
      return "ok";
    default:
      return "neutral";
  }
}

export function lifecycleStatusLabel(lifecycle: ExecutionRecordLifecycle): string {
  return executionLifecycleLabel(lifecycle);
}
