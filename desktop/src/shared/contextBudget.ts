/** Rough token estimate: ~4 chars per token (Cursor-style budget UI). */
export function estimateTokens(text: string | undefined | null): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export const DEFAULT_CONTEXT_LIMIT = 180_000;

export type ContextBudgetSegmentId =
  | "system"
  | "profile"
  | "history"
  | "message"
  | "plan"
  | "context";

export interface ContextBudgetSegment {
  id: ContextBudgetSegmentId;
  label: string;
  tokens: number;
}

export interface ContextBudget {
  used: number;
  limit: number;
  pct: number;
  segments: ContextBudgetSegment[];
}

export interface ContextBudgetInput {
  systemEstimate?: number;
  profileJson?: unknown;
  history?: { role: string; content: string }[];
  message?: string;
  contextJson?: unknown;
  planSnapshotJson?: unknown;
  limit?: number;
}

function jsonTokens(value: unknown): number {
  if (value == null) return 0;
  try {
    return estimateTokens(JSON.stringify(value));
  } catch {
    return 0;
  }
}

export function buildContextBudget(input: ContextBudgetInput): ContextBudget {
  const limit = input.limit ?? DEFAULT_CONTEXT_LIMIT;
  const segments: ContextBudgetSegment[] = [
    {
      id: "system",
      label: "System",
      tokens: Math.max(0, input.systemEstimate ?? 2_500),
    },
    {
      id: "profile",
      label: "Profile",
      tokens: jsonTokens(input.profileJson),
    },
    {
      id: "history",
      label: "History",
      tokens: (input.history ?? []).reduce((n, m) => n + estimateTokens(m.content), 0),
    },
    {
      id: "message",
      label: "Message",
      tokens: estimateTokens(input.message),
    },
    {
      id: "context",
      label: "Context",
      tokens: jsonTokens(input.contextJson),
    },
    {
      id: "plan",
      label: "Plan",
      tokens: jsonTokens(input.planSnapshotJson),
    },
  ];
  const used = segments.reduce((n, s) => n + s.tokens, 0);
  return {
    used,
    limit,
    pct: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
    segments: segments.filter((s) => s.tokens > 0),
  };
}

/**
 * Drop oldest history messages until estimated tokens fit under `maxTokens`.
 * Always keeps the last message when present.
 */
export function trimHistoryToBudget<T extends { content: string }>(
  history: T[],
  maxTokens: number,
): T[] {
  if (history.length === 0) return history;
  let tokens = history.reduce((n, m) => n + estimateTokens(m.content), 0);
  if (tokens <= maxTokens) return history;

  const next = [...history];
  while (next.length > 1 && tokens > maxTokens) {
    const removed = next.shift()!;
    tokens -= estimateTokens(removed.content);
  }
  return next;
}

/** Compact plan snapshot for agent turns when over budget. */
export function compactPlanSnapshot(plan: unknown): unknown {
  if (!plan || typeof plan !== "object") return plan;
  const p = plan as Record<string, unknown>;
  const playbooks = Array.isArray(p.playbooks) ? p.playbooks : [];
  return {
    id: p.id,
    thesis: typeof p.thesis === "string" ? p.thesis.slice(0, 400) : p.thesis,
    primaryPlaybookId: p.primaryPlaybookId,
    primaryBottleneck: p.primaryBottleneck,
    playbooks: playbooks.slice(0, 3).map((pb) => {
      if (!pb || typeof pb !== "object") return pb;
      const book = pb as Record<string, unknown>;
      const tasks = Array.isArray(book.tasks) ? book.tasks : [];
      return {
        id: book.id,
        title: book.title,
        tasks: tasks.slice(0, 5).map((t) => {
          if (!t || typeof t !== "object") return t;
          const task = t as Record<string, unknown>;
          return { id: task.id, title: task.title, day: task.day };
        }),
      };
    }),
  };
}

export function formatCostCents(costCents: number): string {
  if (!Number.isFinite(costCents) || costCents <= 0) return "$0.00";
  if (costCents < 1) return `$${(costCents / 100).toFixed(4)}`;
  return `$${(costCents / 100).toFixed(2)}`;
}

export function formatTokenCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
