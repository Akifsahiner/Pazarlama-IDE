import type { SessionEvent } from "@renderer/state/session";

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeTime(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatTime(ts);
}

export function isSystemLine(event: SessionEvent): boolean {
  return (
    event.kind === "status" ||
    event.kind === "tool" ||
    event.kind === "feed_link" ||
    (event.kind === "text" && event.role === "system")
  );
}

export function isTurnLine(event: SessionEvent): boolean {
  return event.kind === "text" && (event.role === "user" || event.role === "agent");
}

export type ThreadBlock =
  | { type: "turn"; role: "user" | "agent"; events: SessionEvent[]; ts: number }
  | { type: "system"; events: SessionEvent[]; ts: number }
  | { type: "single"; event: SessionEvent };

export function groupThread(thread: SessionEvent[]): ThreadBlock[] {
  const blocks: ThreadBlock[] = [];
  for (const event of thread) {
    if (isSystemLine(event)) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "system") {
        last.events.push(event);
      } else {
        blocks.push({ type: "system", events: [event], ts: event.ts });
      }
      continue;
    }
    if (isTurnLine(event)) {
      const role = event.role as "user" | "agent";
      const last = blocks[blocks.length - 1];
      if (last?.type === "turn" && last.role === role) {
        last.events.push(event);
      } else {
        blocks.push({ type: "turn", role, events: [event], ts: event.ts });
      }
      continue;
    }
    blocks.push({ type: "single", event });
  }
  return blocks;
}

export function systemEventLabel(event: SessionEvent): string {
  if (event.kind === "status") return event.text ?? "Working…";
  if (event.kind === "tool") {
    if (event.tool?.startsWith("brain.")) return "Strategy context";
    return event.tool ? `${event.tool}${event.text ? ` · ${event.text}` : ""}` : event.text ?? "tool";
  }
  if (event.kind === "feed_link") return event.text ?? "Execution feed";
  return event.text ?? "Update";
}

export function blockKey(block: ThreadBlock, index: number): string {
  if (block.type === "single") return block.event.id;
  return `${block.type}-${block.events[0]?.id ?? index}`;
}

export const TIME_GAP_MS = 10 * 60_000;
export const NEAR_BOTTOM_PX = 96;
export const VIRTUAL_THRESHOLD = 40;

export function estimateBlockSize(block: ThreadBlock): number {
  if (block.type === "turn") return 120;
  if (block.type === "system") return block.events.length > 1 ? 36 : 48;
  switch (block.event.kind) {
    case "decision":
    case "draft":
    case "plan_task_complete":
    case "plan_complete":
      return 200;
    case "browser_frame":
      return 180;
    case "asset":
      return 72;
    case "missing_info":
      return 80;
    default:
      return 96;
  }
}
