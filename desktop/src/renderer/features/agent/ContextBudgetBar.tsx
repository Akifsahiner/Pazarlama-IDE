import { buildContextBudget, type ContextBudget } from "@shared/contextBudget";
import { cx } from "@renderer/components/ui/cx";

export function ContextBudgetBar({
  budget,
  className,
}: {
  budget: ContextBudget;
  className?: string;
}) {
  const warn = budget.pct >= 80;
  const danger = budget.pct >= 95;

  return (
    <div className={cx("space-y-1", className)} title="Estimated context window usage">
      <div className="flex items-center justify-between gap-2 text-[10px] text-text-3">
        <span>Context</span>
        <span className={cx("tabular-nums", danger && "text-danger", warn && !danger && "text-warn")}>
          {budget.pct}% · {Math.round(budget.used / 1000)}k / {Math.round(budget.limit / 1000)}k
        </span>
      </div>
      <div className="flex h-1 overflow-hidden rounded-full bg-elevated">
        {budget.segments.map((seg) => {
          const width = budget.used > 0 ? (seg.tokens / budget.limit) * 100 : 0;
          if (width <= 0) return null;
          const color =
            seg.id === "message"
              ? "var(--accent)"
              : seg.id === "history"
                ? "color-mix(in srgb, var(--accent) 60%, transparent)"
                : seg.id === "plan"
                  ? "var(--iris-500)"
                  : seg.id === "profile"
                    ? "var(--emerald-400)"
                    : "var(--text-3)";
          return (
            <div
              key={seg.id}
              className="h-full"
              style={{ width: `${Math.min(100, width)}%`, background: color }}
              title={`${seg.label}: ~${seg.tokens} tokens`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function useComposerContextBudget(input: {
  message: string;
  history?: { role: string; content: string }[];
  profileJson?: unknown;
  contextJson?: unknown;
  planSnapshotJson?: unknown;
}): ContextBudget {
  return buildContextBudget({
    message: input.message,
    history: input.history,
    profileJson: input.profileJson,
    contextJson: input.contextJson,
    planSnapshotJson: input.planSnapshotJson,
  });
}
