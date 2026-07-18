/**
 * Map Marketing Brain SSE events onto RunEvent with full payload preserved.
 * Renderer reconstructs thread cards from payload.streamEvent.
 */
import { randomUUID } from "node:crypto";
import type { AgentStreamEvent, RunEvent, RunEventType } from "./types";

export function brainStreamToRunEvent(
  runId: string,
  event: AgentStreamEvent,
  seq: number,
): RunEvent {
  const base = {
    id: randomUUID(),
    runId,
    seq,
    timestamp: new Date().toISOString(),
    payload: { streamEvent: event } as Record<string, unknown>,
  };

  switch (event.type) {
    case "token":
      return {
        ...base,
        type: "agent.message" as RunEventType,
        status: "running",
        title: "Assistant",
        summary: event.text,
        payload: { ...base.payload, delta: event.text, stream: true },
      };
    case "brain.retrieved":
      return {
        ...base,
        type: "agent.status" as RunEventType,
        status: "running",
        title: event.type,
        summary: event.playbookId
          ? `${event.skills.join(", ")} — ${event.playbookId}${
              event.aggressionLevel ? ` (${event.aggressionLevel})` : ""
            }${event.tacticCount ? ` · ${event.tacticCount} tactics` : ""}`
          : event.skills.join(", "),
      };
    case "brain.status":
    case "brain.intent":
    case "brain.profile":
    case "brain.critique":
    case "brain.answer_critique":
      return {
        ...base,
        type: "agent.status" as RunEventType,
        status: "running",
        title: event.type,
        summary:
          event.type === "brain.status"
            ? event.text
            : event.type === "brain.intent"
              ? event.discipline
              : event.type === "brain.answer_critique"
                ? `Answer quality ${event.critique.total}/40`
                : undefined,
      };
    case "decision":
      return {
        ...base,
        type: "evidence.captured" as RunEventType,
        status: "success",
        title: "Decision",
        summary: event.summary ?? event.decision.decision,
      };
    case "draft":
      return {
        ...base,
        type: "evidence.captured" as RunEventType,
        status: "success",
        title: "Draft",
        summary: event.summary,
      };
    case "proactive_suggestion":
      return {
        ...base,
        type: "issue.detected" as RunEventType,
        status: "pending",
        title: event.title,
        summary: event.body,
      };
    case "missing_info":
      return {
        ...base,
        type: "approval.required" as RunEventType,
        status: "pending",
        title: "Missing info",
        summary: event.questions.join("; "),
      };
    case "suggested_mode":
      return {
        ...base,
        type: "agent.status" as RunEventType,
        status: "success",
        title: `Suggest ${event.mode}`,
        summary: event.reason,
      };
    case "executable_action":
      return {
        ...base,
        type: "agent.executable_action" as RunEventType,
        status: "success",
        title: "Executable action",
        summary:
          event.primary?.kind === "edit_run"
            ? event.primary.goal.slice(0, 120)
            : event.primary?.kind ?? "action",
      };
    case "tool":
      return {
        ...base,
        type: (event.status === "start" ? "tool.started" : "tool.completed") as RunEventType,
        status: event.status === "start" ? "running" : "success",
        title: event.name,
        summary: event.detail,
      };
    case "asset":
      return {
        ...base,
        type: "evidence.captured" as RunEventType,
        status: "success",
        title: "Asset",
        summary: event.asset.type,
      };
    case "plan_revision":
      return {
        ...base,
        type: "run.planning" as RunEventType,
        status: "success",
        title: "Plan revision",
        summary: event.summary,
      };
    case "usage":
      return {
        ...base,
        type: "agent.status" as RunEventType,
        status: "success",
        title: "Usage",
        summary: `${event.tokens_in + event.tokens_out} tokens`,
        payload: {
          streamEvent: event,
          usage: {
            tokens_in: event.tokens_in,
            tokens_out: event.tokens_out,
            cost_cents: event.cost_cents,
          },
        },
      };
    case "error":
      return {
        ...base,
        type: "run.failed" as RunEventType,
        status: "failed",
        title: "Error",
        summary: event.message,
      };
    case "done":
      return {
        ...base,
        type: "run.completed" as RunEventType,
        status: "success",
        title: "Done",
      };
    default:
      return {
        ...base,
        type: "agent.status" as RunEventType,
        title: "Brain event",
      };
  }
}
