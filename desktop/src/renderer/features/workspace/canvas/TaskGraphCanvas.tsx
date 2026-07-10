import { useApp } from "@renderer/state/store";
import type { CanvasMode } from "@renderer/state/session";
import { EmptyState } from "@renderer/components/EmptyState";
import { IntentStrip } from "@renderer/components/IntentStrip";
import { GitBranch } from "lucide-react";
import type { PlanTask, RunEvent } from "@shared/types";

/** Shared sub-mode switcher so users can navigate back from Preview/Steps. */
const CANVAS_SEGMENTS: { mode: CanvasMode; label: string }[] = [
  { mode: "run", label: "Stage" },
  { mode: "preview", label: "Diff & Preview" },
  { mode: "taskgraph", label: "Steps" },
];

/** Group plan tasks by their day, ascending. */
function byDay(tasks: PlanTask[]): { day: number; tasks: PlanTask[] }[] {
  const groups = new Map<number, PlanTask[]>();
  for (const t of tasks) {
    const list = groups.get(t.day) ?? [];
    list.push(t);
    groups.set(t.day, list);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, list]) => ({ day, tasks: list }));
}

/** Run events that represent meaningful steps of execution. */
function stepEvents(events: RunEvent[]): RunEvent[] {
  return events.filter(
    (e) =>
      e.type.startsWith("run.") ||
      e.type.startsWith("tool.") ||
      e.type.startsWith("file.") ||
      e.type.startsWith("preview.") ||
      e.type === "verification.completed",
  );
}

function StatusDot({ status }: { status: RunEvent["status"] }) {
  const cls =
    status === "running"
      ? "bg-accent animate-pulse"
      : status === "success"
        ? "bg-ok"
        : status === "failed"
          ? "bg-danger"
          : "bg-text-3";
  return <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

/**
 * Task Graph Canvas — shows the planned task graph grouped by day, or, when no
 * plan exists, an ordered timeline of the run's execution steps.
 */
export function TaskGraphCanvas() {
  const plan = useApp((s) => s.plan);
  const run = useApp((s) => s.run);
  const canvasMode = useApp((s) => s.canvas.mode);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);

  const tasks = plan?.taskGraph ?? [];
  const hasPlan = tasks.length > 0;

  return (
    <div className="flex h-full flex-col">
      <IntentStrip />

      <div className="flex items-center gap-1 border-b border-line bg-surface/60 px-4 py-1.5">
        {CANVAS_SEGMENTS.map((seg) => (
          <button
            key={seg.mode}
            onClick={() => setActiveCanvas(seg.mode)}
            className={`rounded-[var(--radius-sm)] px-3 py-1 text-micro transition-colors ${
              canvasMode === seg.mode
                ? "bg-elevated text-text"
                : "text-text-2 hover:bg-elevated/60 hover:text-text"
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {hasPlan ? (
          <div className="flex flex-col gap-5">
            {byDay(tasks).map(({ day, tasks: dayTasks }) => (
              <div key={day}>
                <div className="mb-2 text-micro font-medium uppercase tracking-wide text-text-3">
                  Day {day}
                </div>
                <div className="flex flex-col gap-2">
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3"
                    >
                      <div className="text-body-sm text-text">{t.title}</div>
                      {t.metric && (
                        <div className="mt-1 text-micro text-text-2">{t.metric}</div>
                      )}
                      {t.dependsOn.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {t.dependsOn.map((d) => (
                            <span
                              key={d}
                              className="rounded-full border border-line bg-elevated px-2 py-0.5 font-mono text-[10.5px] text-text-3"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : run && stepEvents(run.events).length > 0 ? (
          <div className="flex flex-col gap-2">
            {stepEvents(run.events).map((e) => (
              <div key={e.id} className="flex items-start gap-2.5">
                <StatusDot status={e.status} />
                <span className="min-w-0 flex-1 text-body-sm text-text-2">{e.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={GitBranch}
            title="No steps yet"
            description="Run steps and plan tasks appear here once execution starts."
            className="py-8"
          />
        )}
      </div>
    </div>
  );
}
