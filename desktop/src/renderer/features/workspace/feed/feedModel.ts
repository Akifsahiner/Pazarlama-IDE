import type { FeedItem, FeedItemCategory, FeedItemSource, FeedItemStatus } from "@shared/feed";
import { mockConnectorFeedItems } from "@shared/feedMock";
import type { RunEvent, RunEventType } from "@shared/types";
import { makeEventId } from "@renderer/state/session";

export { mockConnectorFeedItems };

function categoryForRunEvent(type: RunEventType): FeedItemCategory | null {
  if (type.startsWith("browser.") || type === "evidence.captured") return "read";
  if (type === "issue.detected") return "analyze";
  if (type.startsWith("file.")) return "write";
  if (type.startsWith("preview.")) return "external";
  if (type === "approval.required") return "gate";
  if (type === "verification.completed") return "verify";
  if (type.startsWith("tool.")) return "read";
  if (type === "run.failed") return "verify";
  if (type === "run.completed") return "external";
  return null;
}

function sourceForRunEvent(type: RunEventType): FeedItemSource {
  if (type.startsWith("browser.")) return "browser";
  if (type.startsWith("tool.")) return "agent-tool";
  return "run";
}

function statusFromRunEvent(event: RunEvent): FeedItemStatus {
  if (event.type === "approval.required") return "waiting";
  if (event.status === "running") return "running";
  if (event.status === "failed") return "failed";
  if (event.status === "success") return "success";
  if (event.type === "run.failed") return "failed";
  return "success";
}

function canvasTargetForRunEvent(event: RunEvent): FeedItem["canvasTarget"] | undefined {
  if (event.type.startsWith("browser.") || event.type === "issue.detected") {
    return { mode: "research-map" };
  }
  if (event.type === "file.patch_created" || event.type === "file.patch_updated") {
    const file = (event.payload as { file?: string } | undefined)?.file;
    return { mode: "marketing-diff", payload: file ? { file } : undefined };
  }
  if (event.type.startsWith("preview.")) {
    return { mode: "preview" };
  }
  if (event.type === "run.completed" || event.type.startsWith("file.patch_applied")) {
    return { mode: "run" };
  }
  return undefined;
}

/** Convert a run/browser event into a feed row (null = skip). */
export function runEventToFeedItem(event: RunEvent): FeedItem | null {
  const category = categoryForRunEvent(event.type);
  if (!category) return null;

  const approvalPayload = event.payload as { approvalId?: string } | undefined;

  return {
    id: event.id || makeEventId(),
    ts: Date.parse(event.timestamp) || Date.now(),
    source: sourceForRunEvent(event.type),
    category,
    title: event.title,
    summary: event.summary,
    status: statusFromRunEvent(event),
    runId: event.runId,
    canvasTarget: canvasTargetForRunEvent(event),
    approvalId: approvalPayload?.approvalId,
  };
}
