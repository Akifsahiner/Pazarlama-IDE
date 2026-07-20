import { ChevronDown, ChevronUp, History } from "lucide-react";
import type { ExecutionHistoryEntry } from "@shared/executionRecord";
import { executionLifecycleLabel } from "@shared/executionRecord";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} sa önce`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ExecutionHistoryTimeline({
  entries,
  expanded,
  onToggle,
}: {
  entries: ExecutionHistoryEntry[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (entries.length === 0) return null;

  return (
    <div
      className="mx-auto w-full max-w-3xl rounded-[var(--radius-lg)] border border-line/70 bg-surface/40"
      data-testid="execution-history-timeline"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-elevated/40"
      >
        <span className="flex items-center gap-2 text-mini font-semibold text-text">
          <History size={14} className="text-accent" />
          Geçmiş executions ({entries.length})
        </span>
        {expanded ? <ChevronUp size={14} className="text-text-3" /> : <ChevronDown size={14} className="text-text-3" />}
      </button>

      {expanded && (
        <ul className="max-h-[240px] space-y-2 overflow-y-auto border-t border-line/60 px-4 py-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-[var(--radius-md)] border border-line/60 bg-elevated/30 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium text-text">{entry.experiment}</p>
                  <p className="mt-0.5 text-micro text-text-3">
                    Hafta {entry.weekIndex} · {executionLifecycleLabel(entry.lifecycle)} ·{" "}
                    {formatWhen(entry.closedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {entry.results
                    .filter((r) => r.tone === "ok")
                    .slice(0, 2)
                    .map((r) => (
                      <span
                        key={r.id}
                        className="rounded-full bg-ok/10 px-2 py-0.5 text-[10px] text-ok"
                      >
                        {r.label}: {r.value}
                      </span>
                    ))}
                </div>
              </div>
              {entry.learned && (
                <p className="mt-2 line-clamp-2 text-mini italic text-text-2">{entry.learned}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
