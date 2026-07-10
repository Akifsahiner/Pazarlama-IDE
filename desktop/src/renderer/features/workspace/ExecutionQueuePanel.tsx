import { ListOrdered, Play, Trash2 } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";

/** Queued browse + edit tasks — runs sequentially when one finishes (Faz 11). */
export function ExecutionQueuePanel() {
  const queue = useApp((s) => s.executionQueue);
  const cancelQueuedExecution = useApp((s) => s.cancelQueuedExecution);
  const processExecutionQueue = useApp((s) => s.processExecutionQueue);
  const isExecutionActive = useApp((s) => {
    const run = s.run;
    const browser = s.browser;
    if (run && (run.status === "running" || run.status === "planning" || run.status === "created")) {
      return true;
    }
    return browser.running;
  });

  if (queue.length === 0) return null;

  return (
    <div
      className="border-b border-line bg-surface-2/80 px-3 py-2"
      data-testid="execution-queue-panel"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-mini font-medium text-text">
          <ListOrdered size={13} className="text-accent" />
          Execution queue
          <Badge tone="neutral">{queue.length}</Badge>
        </div>
        {!isExecutionActive && (
          <Button variant="ghost" size="sm" onClick={() => void processExecutionQueue()}>
            <Play size={12} /> Run next
          </Button>
        )}
      </div>
      <ul className="space-y-1">
        {queue.map((item, idx) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1.5"
          >
            <span className="w-5 shrink-0 text-center text-micro text-text-3">{idx + 1}</span>
            <Badge tone={item.kind === "browse" ? "marketing" : "accent"}>{item.kind}</Badge>
            <span className="min-w-0 flex-1 truncate text-mini text-text-2">{item.label}</span>
            <button
              type="button"
              onClick={() => cancelQueuedExecution(item.id)}
              className="shrink-0 rounded p-1 text-text-3 hover:bg-elevated hover:text-danger"
              title="Remove from queue"
            >
              <Trash2 size={12} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-micro text-text-3">
        {isExecutionActive
          ? "Active task in progress — next queued task starts automatically when idle."
          : "Idle — next queued task starts automatically."}
      </p>
    </div>
  );
}
