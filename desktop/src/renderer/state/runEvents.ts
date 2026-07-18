import type {
  BrowserFramePayload,
  PermissionScope,
  RunEvent,
  RunStatus,
} from "@shared/types";
import type { CanvasMode, RunInfo } from "./session";

const MAX_EVENTS = 400;
const FRAME_KEEP = 1; // keep base64 only on the latest frame event in the list

/** Result of folding one RunEvent into the run state. */
export interface RunReduction {
  run: RunInfo;
  /** If set, the Execution Canvas should switch to this renderer. */
  canvas?: CanvasMode;
}

const RUN_STATUS_BY_TYPE: Partial<Record<RunEvent["type"], RunStatus>> = {
  "run.created": "running",
  "run.planning": "planning",
  "run.paused": "paused",
  "run.completed": "completed",
  "run.failed": "failed",
};

/**
 * Pure reducer: fold a RunEvent into RunInfo. Keeps the event log bounded,
 * tracks the latest intent/frame, manages the pending approval, and tells the
 * caller which Execution Canvas renderer to surface.
 */
export function applyRunEvent(prev: RunInfo, event: RunEvent): RunReduction {
  const events = trimFrames([...prev.events, event]);
  const run: RunInfo = { ...prev, events, lastSeq: Math.max(prev.lastSeq, event.seq) };

  const status = RUN_STATUS_BY_TYPE[event.type];
  if (status) run.status = status;

  if (event.runId && (!prev.runId || prev.runId === "")) {
    run.runId = event.runId;
  }

  let canvas: CanvasMode | undefined;

  switch (event.type) {
    case "agent.status":
    case "agent.message":
      run.intent = event.title;
      break;

    case "browser.frame": {
      const payload = event.payload as BrowserFramePayload | undefined;
      if (payload?.pngBase64) run.frame = payload.pngBase64;
      run.intent = payload?.action ?? run.intent;
      canvas = "run";
      break;
    }

    case "file.patch_created":
    case "file.patch_updated":
      canvas = "preview";
      break;

    case "preview.ready":
      canvas = "preview";
      break;

    case "approval.required": {
      const p = event.payload as
        | { approvalId?: string; scope?: PermissionScope; intent?: string }
        | undefined;
      if (p?.approvalId && p.scope) {
        run.pendingApproval = {
          approvalId: p.approvalId,
          scope: p.scope,
          intent: p.intent ?? event.summary ?? event.title,
        };
      }
      canvas = "run";
      break;
    }

    case "tool.started":
      run.intent = event.title;
      break;

    case "evidence.captured":
    case "issue.detected":
    case "verification.completed":
      run.intent = event.title;
      break;

    case "tool.completed":
    case "tool.failed":
      // Clearing the approval once the gated tool resolves.
      run.pendingApproval = undefined;
      break;

    case "run.completed":
    case "run.failed":
    case "run.paused":
      run.pendingApproval = undefined;
      break;

    default:
      break;
  }

  return { run, canvas };
}

/** Clears the pending approval matching an id (after the user decides). */
export function clearApproval(run: RunInfo, approvalId: string): RunInfo {
  if (run.pendingApproval?.approvalId !== approvalId) return run;
  return { ...run, pendingApproval: undefined };
}

function trimFrames(events: RunEvent[]): RunEvent[] {
  const bounded = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;
  // Strip base64 from all but the last FRAME_KEEP frame events to bound memory.
  const frameIdx: number[] = [];
  bounded.forEach((e, i) => {
    if (e.type === "browser.frame") frameIdx.push(i);
  });
  const keep = new Set(frameIdx.slice(-FRAME_KEEP));
  return bounded.map((e, i) => {
    if (e.type === "browser.frame" && !keep.has(i) && e.payload?.pngBase64) {
      return { ...e, payload: { ...e.payload, pngBase64: undefined } };
    }
    return e;
  });
}
