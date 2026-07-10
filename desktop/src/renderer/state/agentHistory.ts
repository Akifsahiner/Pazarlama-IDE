import type { AgentTurnPersist, MarketingDecisionAsset } from "@shared/types";
import { resolveSidecarTarget } from "@shared/assetTarget";
import type { SessionEvent } from "./session";

/** Build assistant history text for the API — never send raw JSON blobs. */
export function historyContentFromEvent(event: SessionEvent): string | null {
  if (event.kind === "decision" && event.decision) {
    const d = event.decision;
    return `Decision: ${d.decision}. ${d.rationale.slice(0, 400)}`;
  }
  if (event.kind === "draft" && event.draftSummary) {
    return `Draft: ${event.draftSummary}`;
  }
  if (event.kind === "text" && event.text) {
    return event.text;
  }
  return null;
}

export function buildAgentHistory(thread: SessionEvent[]): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const e of thread) {
    if (e.role === "user" && e.kind === "text" && e.text) {
      out.push({ role: "user", content: e.text });
    } else if (e.role === "agent") {
      const content = historyContentFromEvent(e);
      if (content) out.push({ role: "assistant", content });
    }
  }
  return out.slice(-6);
}

export function restoreEventsFromPersist(
  content: AgentTurnPersist,
  makeId: () => string,
): SessionEvent[] {
  const base = { role: "agent" as const, ts: Date.now() };
  if (content.kind === "decision" && content.decision) {
    return [
      {
        ...base,
        id: makeId(),
        kind: "decision",
        decision: content.decision,
        critique: content.critique,
        summary: content.summary,
        text: content.summary,
      },
    ];
  }
  if (content.kind === "draft") {
    return [
      {
        ...base,
        id: makeId(),
        kind: "draft",
        draftSummary: content.summary,
        draftAssets: content.draftAssets,
        text: content.summary,
      },
    ];
  }
  if (content.kind === "missing_info" && content.questions?.length) {
    return [
      {
        ...base,
        id: makeId(),
        kind: "missing_info",
        missingQuestions: content.questions,
      },
    ];
  }
  if (content.kind === "answer" && content.text) {
    const events: SessionEvent[] = [
      { ...base, id: makeId(), kind: "text", text: content.text },
    ];
    for (const asset of content.assets ?? []) {
      events.push({ ...base, id: makeId(), kind: "asset", asset });
    }
    return events;
  }
  return [];
}

export function draftAssetsToMarketingAssets(
  assets: MarketingDecisionAsset[] | undefined,
): import("@shared/types").MarketingAsset[] {
  if (!assets?.length) return [];
  return assets.map((a, i) => ({
    id: `draft_${Date.now()}_${i}`,
    type:
      a.kind === "email"
        ? "email"
        : a.kind === "post"
          ? "tweet"
          : a.kind === "ad"
            ? "ad"
            : "landing-copy",
    targetFile:
      a.suggested_target_file && a.suggested_target_file.length > 0
        ? a.suggested_target_file
        : resolveSidecarTarget(a.title),
    after: a.content,
  }));
}
