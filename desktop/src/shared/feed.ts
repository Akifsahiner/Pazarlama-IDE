import type { CanvasMode } from "./workSurfaces";
import type { PlanTaskCompletionGate } from "./types";

export type FeedItemCategory = "read" | "analyze" | "write" | "external" | "verify" | "gate";

export type FeedItemSource = "run" | "browser" | "agent-tool" | "connector" | "system";

export type FeedItemStatus = "running" | "success" | "failed" | "waiting";

export type FeedFilter = "all" | "needs-you" | "risks" | "external";

export interface FeedItem {
  id: string;
  ts: number;
  source: FeedItemSource;
  category: FeedItemCategory;
  title: string;
  summary?: string;
  status: FeedItemStatus;
  runId?: string;
  /** Thread user message that spawned this execution (Faz 5). */
  sourceMessageId?: string;
  canvasTarget?: { mode: CanvasMode; payload?: Record<string, string> };
  approvalId?: string;
  /** When category is gate — plan task completion subtype (e.g. apply-pending). */
  planGate?: PlanTaskCompletionGate;
  /** Dev/demo only — never treat as real connector activity. */
  isDemo?: boolean;
}

export const FEED_FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs-you", label: "Needs you" },
  { id: "risks", label: "Risks" },
  { id: "external", label: "External" },
];

export function filterFeedItems(items: FeedItem[], filter: FeedFilter): FeedItem[] {
  switch (filter) {
    case "needs-you":
      return items.filter((i) => i.category === "gate" || i.status === "waiting");
    case "risks":
      return items.filter(
        (i) => i.category === "analyze" || i.category === "verify" || i.status === "failed",
      );
    case "external":
      return items.filter((i) => i.category === "external" || i.source === "connector");
    default:
      return items;
  }
}

export function countPendingApprovals(items: FeedItem[]): number {
  return items.filter((i) => i.category === "gate" && i.status === "waiting" && !i.isDemo).length;
}

export function countApplyPendingGates(items: FeedItem[]): number {
  return items.filter(
    (i) =>
      i.category === "gate" &&
      i.status === "waiting" &&
      !i.isDemo &&
      (i.planGate === "apply-pending" || i.id.startsWith("apply-pending-")),
  ).length;
}
