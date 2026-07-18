/**
 * Map legacy AgentEvent (Brain SSE / older paths) onto unified RunEvent.
 */
import { randomUUID } from "node:crypto";
import type { AgentEvent, RunEvent, RunEventType } from "./types";

let seqCounter = 0;

export function agentEventToRunEvent(
  runId: string,
  event: AgentEvent,
  opts?: { seq?: number; stepId?: string },
): RunEvent | null {
  const seq = opts?.seq ?? ++seqCounter;
  const base = {
    id: randomUUID(),
    runId,
    stepId: opts?.stepId,
    seq,
    timestamp: new Date().toISOString(),
  };

  switch (event.type) {
    case "token":
      return {
        ...base,
        type: "agent.message" as RunEventType,
        status: "running",
        title: "Assistant",
        summary: event.text,
        payload: { delta: event.text },
      };
    case "tool":
      return {
        ...base,
        type: (event.status === "start" ? "tool.started" : "tool.completed") as RunEventType,
        status: event.status === "start" ? "running" : "success",
        title: event.name,
        summary: event.detail,
        payload: { name: event.name, detail: event.detail },
      };
    case "asset":
      return {
        ...base,
        type: "evidence.captured" as RunEventType,
        status: "success",
        title: "Asset",
        summary: event.asset.type,
        payload: { asset: event.asset },
      };
    case "browser_frame":
      return {
        ...base,
        type: "browser.frame" as RunEventType,
        status: "running",
        title: event.action ?? "Browser frame",
        payload: { pngBase64: event.pngBase64, action: event.action },
      };
    case "approval_request":
      return {
        ...base,
        type: "approval.required" as RunEventType,
        status: "pending",
        title: "Approval required",
        summary: event.summary,
        payload: { approvalId: event.id },
      };
    case "done":
      return {
        ...base,
        type: "run.completed" as RunEventType,
        status: "success",
        title: "Done",
      };
    case "error":
      return {
        ...base,
        type: "run.failed" as RunEventType,
        status: "failed",
        title: "Error",
        summary: event.message,
      };
    default:
      return null;
  }
}

/** Reset seq helper for tests. */
export function resetAgentEventSeq(): void {
  seqCounter = 0;
}
