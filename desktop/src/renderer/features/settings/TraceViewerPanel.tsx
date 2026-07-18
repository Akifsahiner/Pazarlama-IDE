/**
 * Settings Trace viewer — read local run_trace jsonl via IPC.
 */
import { useEffect, useState } from "react";
import type { RunEvent } from "@shared/types";

export function TraceViewerPanel() {
  const [rows, setRows] = useState<Array<{ runId: string; bytes: number; mtime: number }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    setError(null);
    void window.api.traces
      .list()
      .then((list) => setRows(list))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!selected) {
      setEvents([]);
      return;
    }
    void window.api.traces
      .read(selected)
      .then((ev) => setEvents(ev))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [selected]);

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-body-sm font-medium text-text">Run traces</div>
          <p className="text-caption text-text-3">
            Local jsonl event logs for debugging orchestration (Ask / Edit / Browse).
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 hover:bg-elevated"
        >
          Refresh
        </button>
      </div>
      {error && <p className="text-caption text-danger">{error}</p>}
      {loading && <p className="text-caption text-text-3">Loading…</p>}
      <div className="grid max-h-64 gap-2 overflow-hidden md:grid-cols-2">
        <ul className="overflow-y-auto rounded border border-line bg-surface/40 text-micro">
          {rows.length === 0 && !loading ? (
            <li className="px-2 py-3 text-text-3">No traces yet — run Ask or Edit first.</li>
          ) : (
            rows.map((r) => (
              <li key={r.runId}>
                <button
                  type="button"
                  onClick={() => setSelected(r.runId)}
                  className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-elevated ${
                    selected === r.runId ? "bg-elevated text-text" : "text-text-2"
                  }`}
                >
                  <span className="truncate font-mono">{r.runId.slice(0, 12)}…</span>
                  <span className="shrink-0 text-text-3">{Math.round(r.bytes / 1024)} KB</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <pre className="overflow-auto rounded border border-line bg-surface/40 p-2 font-mono text-mini text-text-2">
          {events.length === 0
            ? selected
              ? "Empty trace"
              : "Select a run"
            : events
                .slice(0, 80)
                .map((e) => `${e.seq ?? "?"} ${e.type} ${e.title ?? ""}`.trim())
                .join("\n")}
          {events.length > 80 ? `\n… +${events.length - 80} more` : ""}
        </pre>
      </div>
    </div>
  );
}
