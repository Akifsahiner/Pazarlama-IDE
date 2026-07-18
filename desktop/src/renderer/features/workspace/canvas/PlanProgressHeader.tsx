import { motion } from "framer-motion";
import { springSoft, statusPulse } from "@renderer/design/animations";
import { Check, Circle, Loader2, Play, RotateCcw, SkipForward } from "lucide-react";
import type { MarketingPlan } from "@shared/types";
import {
  nextActionableTask,
  type PlanTaskStatus,
} from "@shared/planProgress";
import {
  getPlaybook,
  nextActionableTaskInPlaybook,
  normalizePlan,
} from "@shared/planPlaybooks";
import { useApp } from "@renderer/state/store";
import { EffortBadge } from "@renderer/components/EffortBadge";
import { PeakDayWarning } from "@renderer/components/PeakDayWarning";
import { estimatePlanEffort } from "@shared/effortEstimate";

export function PlanProgressHeader({
  plan,
  activePlaybookId,
}: {
  plan: MarketingPlan;
  activePlaybookId?: string;
}) {
  const snapshot = useApp((s) => s.planProgress);
  const connected = useApp((s) => s.runtime === "connected");
  const startPlaybook = useApp((s) => s.startPlaybook);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const setActivePlaybook = useApp((s) => s.setActivePlaybook);

  const suite = normalizePlan(plan)!;
  const computed = snapshot?.computed ?? {
    done: 0,
    terminal: 0,
    total: plan.taskGraph.length,
    failed: 0,
    skipped: 0,
    running: 0,
    awaiting: 0,
    weekDone: { 1: 0, 2: 0, 3: 0, 4: 0 },
    weekTotal: { 1: 0, 2: 0, 3: 0, 4: 0 },
    playbookDone: {},
    byPlaybookId: {} as Record<string, { done: number; total: number }>,
  };

  const scopedPlan = activePlaybookId ? getPlaybook(suite, activePlaybookId) : null;
  const scopedTotal = scopedPlan?.tasks.length ?? 0;
  const scopedDone = activePlaybookId
    ? (computed.byPlaybookId[activePlaybookId]?.done ?? 0)
    : computed.terminal;
  const scopedAll = activePlaybookId ? scopedTotal : computed.total;

  const pct = scopedAll > 0 ? Math.round((scopedDone / scopedAll) * 100) : 0;

  const next = activePlaybookId
    ? snapshot
      ? nextActionableTaskInPlaybook(suite, activePlaybookId, snapshot.byTaskId)
      : null
    : snapshot
      ? nextActionableTask(plan, snapshot.byTaskId)
      : null;

  const failedTask =
    computed.failed > 0 && snapshot
      ? [...plan.taskGraph]
          .sort((a, b) => a.day - b.day)
          .find((t) => snapshot.byTaskId[t.id]?.status === "failed")
      : null;

  const playbookLabel = scopedPlan?.title;

  const effort = estimatePlanEffort(plan, {
    playbookId: activePlaybookId,
    nextTaskId: next?.id,
    byTaskId: snapshot
      ? Object.fromEntries(
          Object.entries(snapshot.byTaskId).map(([id, row]) => [id, { status: row.status }]),
        )
      : undefined,
  });

  return (
    <div className="rounded-[var(--radius-lg)] border border-accent/25 bg-accent-soft/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-text-3">
            {playbookLabel ? `${playbookLabel} progress` : "Launch progress"}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-[15px] font-semibold text-text">
              {scopedDone} / {scopedAll}
            </span>
            <span className="text-mini text-text-2">
              tasks complete
              {activePlaybookId ? " in this playbook" : ` · ${suite.playbooks.length} playbooks`}
            </span>
            <EffortBadge
              label={effort.label}
              intensity={effort.intensity}
              compact
              title={`Founder execution estimate · peak ${effort.dailyPeakMinutes}m/day`}
            />
            {effort.peakDay && <PeakDayWarning peak={effort.peakDay} compact />}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-elevated">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={springSoft}
            />
          </div>
          {!activePlaybookId && suite.playbooks.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suite.playbooks.slice(0, 6).map((pb) => {
                const prog = computed.byPlaybookId[pb.id] ?? { done: 0, total: pb.tasks.length };
                const complete = prog.total > 0 && prog.done >= prog.total;
                return (
                  <button
                    key={pb.id}
                    type="button"
                    onClick={() => setActivePlaybook(pb.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors hover:border-accent/40 ${
                      activePlaybookId === pb.id
                        ? "border-accent/40 bg-accent-soft/30 text-accent"
                        : complete
                          ? "border-ok/30 bg-ok/10 text-ok"
                          : "border-line text-text-3"
                    }`}
                  >
                    {complete ? <Check size={10} /> : <Circle size={8} />}
                    {pb.title.split(" ")[0]}
                    {prog.total > 0 && (
                      <span className="opacity-70">
                        {prog.done}/{prog.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {failedTask && (
            <button
              type="button"
              disabled={!connected}
              onClick={() =>
                focusPlanTask({
                  playbookId: failedTask.playbookId,
                  taskId: failedTask.id,
                  startRun: true,
                })
              }
              className="flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 px-3 py-2 text-mini text-danger hover:bg-danger/10 disabled:opacity-40"
            >
              <RotateCcw size={13} /> Retry Day {failedTask.day}
            </button>
          )}
          {next && activePlaybookId && (
            <button
              type="button"
              disabled={!connected}
              onClick={() => focusPlanTask({ playbookId: activePlaybookId, taskId: next.id, startRun: true })}
              className="btn-accent flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-mini disabled:opacity-40"
            >
              <Play size={13} /> Continue · Day {next.day}
            </button>
          )}
          {next && !activePlaybookId && (
            <button
              type="button"
              disabled={!connected}
              onClick={() => {
                const pbId = next.playbookId ?? suite.playbooks[0]?.id;
                if (pbId) startPlaybook(pbId);
              }}
              className="btn-accent flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-mini disabled:opacity-40"
            >
              <Play size={13} /> Start next playbook task
            </button>
          )}
        </div>
      </div>
      {effort.peakDay && (
        <div className="mt-3">
          <PeakDayWarning peak={effort.peakDay} />
        </div>
      )}
      {computed.failed > 0 && (
        <p className="mt-2 text-micro text-warn">
          {computed.failed} task{computed.failed === 1 ? "" : "s"} need attention — reopen or skip to continue.
        </p>
      )}
    </div>
  );
}

export function TaskStatusBadge({
  status,
  pulse,
}: {
  status: PlanTaskStatus;
  pulse?: boolean;
}) {
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const wrap = (node: React.ReactNode) =>
    pulse && !reducedMotion ? (
      <motion.span animate={statusPulse} className="inline-flex">
        {node}
      </motion.span>
    ) : (
      node
    );

  if (status === "running") {
    return wrap(
      <span className="inline-flex items-center gap-1 rounded-[4px] bg-accent-soft/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
        <Loader2 size={10} className="animate-spin" /> Running
      </span>,
    );
  }
  if (status === "done") {
    return wrap(
      <span className="inline-flex items-center gap-1 rounded-[4px] bg-ok/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ok">
        <Check size={10} /> Done
      </span>,
    );
  }
  if (status === "failed") {
    return (
      <span className="rounded-[4px] bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-danger">
        Failed
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[4px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-3">
        <SkipForward size={10} /> Skipped
      </span>
    );
  }
  if (status === "awaiting_apply") {
    return (
      <span className="rounded-[4px] bg-warn/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warn">
        Awaiting apply
      </span>
    );
  }
  if (status === "awaiting_review") {
    return (
      <span className="rounded-[4px] border border-dashed border-warn/40 bg-warn/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warn">
        Needs confirm
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="rounded-[4px] bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warn">
        Partial
      </span>
    );
  }
  if (status === "blocked") {
    return (
      <span className="rounded-[4px] bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warn">
        Blocked
      </span>
    );
  }
  return null;
}
