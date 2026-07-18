/**
 * First-ship execution pipeline stages (Quick Start wedge).
 */
import type { RunEvent } from "./types";

export type ShipPipelineStage =
  | "idle"
  | "run"
  | "diff"
  | "apply"
  | "preview"
  | "verify"
  | "done"
  | "failed";

export interface ShipPipelineState {
  stage: ShipPipelineStage;
  runId?: string;
  patchCount: number;
  error?: string;
  updatedAt: number;
}

export function initialShipPipelineState(): ShipPipelineState {
  return { stage: "idle", patchCount: 0, updatedAt: Date.now() };
}

export function patchCountFromEvents(events: RunEvent[]): number {
  const files = new Set<string>();
  for (const e of events) {
    if (e.type === "file.patch_created" || e.type === "file.patch_updated") {
      const p = e.payload as { file?: string } | undefined;
      if (p?.file) files.add(p.file);
    }
  }
  return files.size;
}

export function nextShipPipelineStage(
  state: ShipPipelineState,
  event: { type: string; runId?: string; events?: RunEvent[]; error?: string },
): ShipPipelineState {
  const now = Date.now();
  if (event.type === "run.started") {
    return { stage: "run", runId: event.runId, patchCount: 0, updatedAt: now };
  }
  if (event.type === "file.patch" || event.type === "file.patch_created") {
    const count =
      event.events != null ? patchCountFromEvents(event.events) : Math.max(1, state.patchCount);
    return { ...state, stage: "diff", patchCount: count, updatedAt: now };
  }
  if (event.type === "run.completed") {
    const count = event.events != null ? patchCountFromEvents(event.events) : state.patchCount;
    if (count === 0) {
      return { ...state, stage: "failed", patchCount: 0, error: "NO_PATCHES", updatedAt: now };
    }
    return { ...state, stage: "apply", patchCount: count, updatedAt: now };
  }
  if (event.type === "apply.completed") {
    return { ...state, stage: "preview", updatedAt: now };
  }
  if (event.type === "preview.ready") {
    return { ...state, stage: "verify", updatedAt: now };
  }
  if (event.type === "verify.completed" || event.type === "first_ship") {
    return { ...state, stage: "done", updatedAt: now };
  }
  if (event.type === "verify.failed") {
    return {
      ...state,
      stage: "failed",
      error: event.error ?? "VERIFY_FAILED",
      updatedAt: now,
    };
  }
  if (event.type === "run.failed" || event.type === "apply.failed") {
    return {
      ...state,
      stage: "failed",
      error: event.error ?? "FAILED",
      updatedAt: now,
    };
  }
  return state;
}

export function shipPipelineStepLabel(stage: ShipPipelineStage): string {
  switch (stage) {
    case "run":
      return "Agent run";
    case "diff":
      return "Review diff";
    case "apply":
      return "Apply to repo";
    case "preview":
      return "Local preview";
    case "verify":
      return "Browser verify";
    case "done":
      return "Shipped";
    case "failed":
      return "Needs recovery";
    default:
      return "Ready";
  }
}
