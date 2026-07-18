import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  MessageSquare,
  MoreHorizontal,
  PenLine,
  Plug,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import type { MarketingPlanSuite } from "@shared/planPlaybooks";
import type { PlanTask } from "@shared/types";
import {
  getPlaybook,
  nextActionableTaskInPlaybook,
  playbookDependsSatisfied,
  buildPlanTaskRunGoal,
  isBrowserPlanTask,
  isConnectorReadPlanTask,
} from "@shared/planPlaybooks";
import { isTaskBlocked, taskStatusFromSnapshot, weekForDay } from "@shared/planProgress";
import { tacticLabel, tacticTeachingFor } from "@shared/gtmCatalog";
import { AgentMarkdown } from "@renderer/features/agent/AgentMarkdown";
import { useApp } from "@renderer/state/store";
import { EffortBadge } from "@renderer/components/EffortBadge";
import { PeakDayWarning } from "@renderer/components/PeakDayWarning";
import { estimatePlanEffort } from "@shared/effortEstimate";
import { IconButton } from "@renderer/components/ui/IconButton";
import { TaskStatusBadge } from "../PlanProgressHeader";

const EXECUTION_LABEL: Record<string, string> = {
  repo: "Repo",
  browser: "Browser",
  asset: "Draft",
  run: "Run",
  connector_read: "Connector",
};

interface BlockerRef {
  depId: string;
  title: string;
  day: number;
  playbookId?: string;
}

/** Resolve blocking task refs so "Blocked" is actionable, not a mystery. */
function blockerRefs(
  task: PlanTask,
  plan: MarketingPlanSuite,
  byTaskId: Record<string, { status: string }>,
): BlockerRef[] {
  if (!task.dependsOn?.length) return [];
  return task.dependsOn
    .filter((depId) => {
      const st = byTaskId[depId]?.status;
      return st !== "done" && st !== "skipped";
    })
    .map((depId) => {
      const dep = plan.taskGraph.find((t) => t.id === depId);
      return dep
        ? { depId, title: dep.title, day: dep.day, playbookId: dep.playbookId }
        : { depId, title: depId, day: 0 };
    });
}

/** Per-mode run affordance: distinct icon + label for browser/asset/repo work. */
function RunTaskButton({
  task,
  status,
  blocked,
  connected,
  hasAgentCwd,
  onRun,
  onRetry,
}: {
  task: PlanTask;
  status: string;
  blocked: boolean;
  connected: boolean;
  hasAgentCwd: boolean;
  onRun: (canvas: "browser" | "run" | "connector") => void;
  onRetry: () => void;
}) {
  const disabled = !connected || status === "running" || status === "done" || blocked;
  const needsFolder = !hasAgentCwd;
  const folderHint =
    "Needs a local folder or cloned repo — browser tasks still work from URL projects.";

  if (status === "failed") {
    return (
      <button
        type="button"
        disabled={!connected}
        onClick={onRetry}
        className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-warn-border bg-warn-soft px-2 py-1 text-[10px] font-medium text-warn transition-colors hover:brightness-110 disabled:opacity-40"
      >
        <RefreshCw size={10} /> Retry
      </button>
    );
  }

  const mode = task.execution_mode ?? "repo";

  if (mode === "browser" || isBrowserPlanTask(task)) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRun("browser")}
        className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-accent/40 bg-accent-soft/20 px-2 py-1 text-[10px] text-accent transition-colors hover:bg-accent-soft/40 disabled:opacity-40"
      >
        <Globe size={10} /> Browser
      </button>
    );
  }

  if (mode === "connector_read") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRun("connector")}
        title="Sync GA4 when connected — otherwise opens browser research"
        className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-[10px] text-text-2 transition-colors hover:border-accent/40 hover:text-text disabled:opacity-40"
      >
        <Plug size={10} /> Sync
      </button>
    );
  }

  if (mode === "asset") {
    return (
      <button
        type="button"
        disabled={disabled || needsFolder}
        title={needsFolder ? folderHint : undefined}
        onClick={() => onRun("run")}
        className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-[10px] text-text-2 transition-colors hover:border-accent/40 hover:text-text disabled:opacity-40"
      >
        <PenLine size={10} /> Draft
      </button>
    );
  }

  if (mode === "run") {
    return (
      <button
        type="button"
        disabled={disabled || needsFolder}
        title={needsFolder ? folderHint : undefined}
        onClick={() => onRun("run")}
        className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-[10px] text-text-2 transition-colors hover:border-accent/40 hover:text-text disabled:opacity-40"
      >
        <Play size={10} /> Run
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || needsFolder}
      title={needsFolder ? folderHint : undefined}
      onClick={() => onRun("run")}
      className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-[10px] text-text-2 transition-colors hover:border-accent/40 hover:text-text disabled:opacity-40"
    >
      <Play size={10} /> Repo
    </button>
  );
}

export function PlaybookDetailPanel({
  plan,
  playbookId,
  onClose,
}: {
  plan: MarketingPlanSuite;
  playbookId: string;
  onClose: () => void;
}) {
  const playbook = getPlaybook(plan, playbookId);
  const planProgress = useApp((s) => s.planProgress);
  const project = useApp((s) => s.project);
  const connected = useApp((s) => s.runtime === "connected");
  const hasAgentCwd =
    project?.source.kind === "folder" || Boolean(project?.localPath);
  const startRun = useApp((s) => s.startRun);
  const startPlaybook = useApp((s) => s.startPlaybook);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const openRunReplay = useApp((s) => s.openRunReplay);
  const highlightPlanTaskId = useApp((s) => s.highlightPlanTaskId);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const patchPlanTaskStatus = useApp((s) => s.patchPlanTaskStatus);
  const prefillComposerForPlanTask = useApp((s) => s.prefillComposerForPlanTask);
  const planMilestones = useApp((s) => s.planMilestones);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(() => new Set());
  const [expandedInstructions, setExpandedInstructions] = useState<Set<string>>(() => new Set());

  const weekGroups = useMemo(() => {
    if (!playbook) return [];
    const maxWeeks = Math.ceil(Math.max(...plan.taskGraph.map((t) => t.day)) / 7);
    const map = new Map<number, typeof playbook.tasks>();
    for (const t of playbook.tasks) {
      const week = weekForDay(t.day, maxWeeks);
      const list = map.get(week) ?? [];
      list.push(t);
      map.set(week, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, tasks]) => ({
        week,
        tasks: [...tasks].sort((a, b) => a.day - b.day),
      }));
  }, [playbook, plan.taskGraph]);

  useEffect(() => {
    if (!playbook) return;
    const autoCollapsed = new Set<number>();
    for (const { week, tasks } of weekGroups) {
      const allDone = tasks.every((t) => {
        const st = taskStatusFromSnapshot(planProgress, t.id);
        return st === "done" || st === "skipped";
      });
      if (allDone && tasks.length > 0) autoCollapsed.add(week);
    }
    const nextKey = [...autoCollapsed].sort((a, b) => a - b).join(",");
    setCollapsedWeeks((prev) => {
      const prevKey = [...prev].sort((a, b) => a - b).join(",");
      if (prevKey === nextKey) return prev;
      return autoCollapsed;
    });
  }, [playbook, planProgress, weekGroups]);

  useEffect(() => {
    if (!highlightPlanTaskId) return;
    const el = rowRefs.current[highlightPlanTaskId];
    el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
  }, [highlightPlanTaskId, reducedMotion]);

  useEffect(() => {
    if (!menuTaskId) return;
    const close = () => setMenuTaskId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuTaskId]);

  if (!playbook) return null;

  const byTaskId = planProgress?.byTaskId ?? {};
  const next = nextActionableTaskInPlaybook(plan, playbookId, byTaskId);
  const blockedPlaybook = !playbookDependsSatisfied(plan, playbookId, byTaskId);

  const effort = estimatePlanEffort(plan, {
    playbookId,
    nextTaskId: next?.id,
    byTaskId: Object.fromEntries(
      Object.entries(byTaskId).map(([id, row]) => [id, { status: row.status }]),
    ),
  });

  const toggleWeek = (week: number) => {
    setCollapsedWeeks((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(week)) nextSet.delete(week);
      else nextSet.add(week);
      return nextSet;
    });
  };

  const runTask = (t: PlanTask, canvas: "browser" | "run" | "connector") => {
    if (canvas === "connector") {
      setActiveCanvas("performance");
      setWorkSurface("performance");
    } else {
      setActiveCanvas(canvas);
    }
    void startRun(buildPlanTaskRunGoal(t), t.id);
  };

  return (
    <AnimatePresence>
      <motion.section
        initial={reducedMotion ? false : { opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
        className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-2"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="text-h3 text-text">{playbook.title}</h3>
            <p className="mt-0.5 text-mini text-text-2">{playbook.subtitle}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EffortBadge label={effort.label} intensity={effort.intensity} />
              {effort.peakDay && <PeakDayWarning peak={effort.peakDay} compact />}
            </div>
            {playbook.dependsOnPlaybookIds.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-text-3">
                  Prerequisites
                </span>
                {playbook.dependsOnPlaybookIds.map((depId) => {
                  const dep = getPlaybook(plan, depId);
                  if (!dep) return null;
                  const depDone = playbookDependsSatisfied(plan, depId, byTaskId);
                  return (
                    <button
                      key={depId}
                      type="button"
                      onClick={() => focusPlanTask({ playbookId: depId })}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors hover:border-accent/40 ${
                        depDone ? "border-ok/30 bg-ok/10 text-ok" : "border-line text-text-2"
                      }`}
                    >
                      {depDone ? <Check size={9} /> : null}
                      {dep.title}
                    </button>
                  );
                })}
              </div>
            )}
            {blockedPlaybook && (
              <p className="mt-1 text-micro text-warn">Complete prerequisite playbooks before starting.</p>
            )}
          </div>
          <IconButton label="Close playbook" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
          <div className="agent-prose min-w-0">
            <AgentMarkdown content={playbook.executiveSummary} />
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-3">Bets</div>
              <ul className="space-y-1 text-mini text-text-2">
                {playbook.bets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-accent">→</span> {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-3">Risks</div>
              <ul className="space-y-1 text-mini text-text-2">
                {playbook.risks.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-warn">!</span> {r}
                  </li>
                ))}
              </ul>
            </div>
            {playbook.skipIf && (
              <p className="rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-micro text-text-3">
                {playbook.skipIf}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-line px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-micro font-semibold uppercase tracking-wider text-text-3">Tasks</span>
            {next && !blockedPlaybook && (
              <button
                type="button"
                disabled={!connected}
                onClick={() => startPlaybook(playbookId)}
                className="btn-accent flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini disabled:opacity-40"
              >
                <Play size={13} />
                {byTaskId[next.id]?.status === "done" ? "Continue playbook" : "Start playbook"}
              </button>
            )}
          </div>
          <div className="max-h-[420px] space-y-3 overflow-y-auto">
            {weekGroups.map(({ week, tasks }) => {
              const weekDone = tasks.every((t) => {
                const st = taskStatusFromSnapshot(planProgress, t.id);
                return st === "done" || st === "skipped";
              });
              const collapsed = collapsedWeeks.has(week);
              return (
                <div key={week} className="rounded-[var(--radius-md)] border border-line/80 bg-surface/50">
                  <button
                    type="button"
                    onClick={() => toggleWeek(week)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  >
                    {collapsed ? (
                      <ChevronRight size={14} className="shrink-0 text-text-3" />
                    ) : (
                      <ChevronDown size={14} className="shrink-0 text-text-3" />
                    )}
                    <span className="text-micro font-semibold text-text-2">Week {week}</span>
                    {weekDone && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-ok">
                        <Check size={10} /> Complete
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-text-3">{tasks.length} tasks</span>
                  </button>
                  {!collapsed && (
                    <div className="space-y-2 border-t border-line/60 px-2 pb-2 pt-1">
                      {tasks.map((t) => {
                        const status = taskStatusFromSnapshot(planProgress, t.id);
                        const blocked = status === "pending" && isTaskBlocked(t, byTaskId);
                        const blockers = blocked ? blockerRefs(t, plan, byTaskId) : [];
                        const pulseStatus =
                          planMilestones.lastTaskId === t.id &&
                          (status === "done" || status === "running");
                        const lastRunId = byTaskId[t.id]?.lastRunId;
                        const highlighted = highlightPlanTaskId === t.id;
                        return (
                          <div
                            key={t.id}
                            ref={(el) => {
                              rowRefs.current[t.id] = el;
                            }}
                            className={`flex items-start justify-between gap-2 rounded-[var(--radius-sm)] border px-3 py-2 transition-colors ${
                              highlighted ? "border-accent/40 bg-accent-soft/10" : "border-line bg-surface"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => focusPlanTask({ playbookId, taskId: t.id })}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-medium text-accent">Day {t.day}</span>
                                <span className="text-body-sm text-text">{t.title}</span>
                                {t.execution_mode && (
                                  <span className="rounded-full border border-line bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-text-3">
                                    {EXECUTION_LABEL[t.execution_mode] ?? t.execution_mode}
                                  </span>
                                )}
                                <TaskStatusBadge
                                  status={blocked ? "blocked" : status}
                                  pulse={pulseStatus}
                                />
                              </div>
                              {blockers.length > 0 && (
                                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-micro text-warn">
                                  <span>Blocked by</span>
                                  {blockers.map((b, i) => (
                                    <span key={b.depId} className="inline-flex items-center gap-1">
                                      {i > 0 && <span>·</span>}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          focusPlanTask({
                                            taskId: b.depId,
                                            playbookId: b.playbookId ?? playbookId,
                                          });
                                        }}
                                        className="underline hover:text-warn/80"
                                      >
                                        {b.title}
                                        {b.day > 0 ? ` (Day ${b.day})` : ""}
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {t.deliverable && (
                                <div className="mt-0.5 text-micro text-text-2">Deliver · {t.deliverable}</div>
                              )}
                              {t.acceptance_criteria && (
                                <div className="mt-0.5 text-micro text-text-3">
                                  Done when · {t.acceptance_criteria}
                                </div>
                              )}
                              {(t.tactic || t.phaseLabel || t.channel || t.kpi) && (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {t.phaseLabel && (
                                    <span
                                      className="rounded-full border border-accent/30 bg-accent-soft/20 px-1.5 py-0.5 font-mono text-[9px] text-accent"
                                      title="Launch phase"
                                    >
                                      {t.phaseLabel}
                                    </span>
                                  )}
                                  {t.tactic && (
                                    <span
                                      className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-2"
                                      title={tacticTeachingFor(t.tactic)?.why ?? `Registry tactic: ${t.tactic}`}
                                    >
                                      {tacticLabel(t.tactic)}
                                    </span>
                                  )}
                                  {t.channel && (
                                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-3">
                                      {t.channel}
                                    </span>
                                  )}
                                  {t.kpi && (
                                    <span className="rounded-full bg-accent-soft/30 px-1.5 py-0.5 text-[9px] text-accent">
                                      {t.kpi.name}: {t.kpi.target}
                                    </span>
                                  )}
                                </div>
                              )}
                              {t.instructions_md && (
                                <div className="mt-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedInstructions((prev) => {
                                        const nextSet = new Set(prev);
                                        if (nextSet.has(t.id)) nextSet.delete(t.id);
                                        else nextSet.add(t.id);
                                        return nextSet;
                                      });
                                    }}
                                    className="text-[10px] text-accent hover:underline"
                                  >
                                    {expandedInstructions.has(t.id) ? "Hide instructions" : "Show instructions"}
                                  </button>
                                  {expandedInstructions.has(t.id) && (
                                    <div className="agent-prose mt-1 rounded-[var(--radius-sm)] border border-line bg-surface-2 p-2 text-micro">
                                      <AgentMarkdown content={t.instructions_md} />
                                    </div>
                                  )}
                                </div>
                              )}
                              {lastRunId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void openRunReplay(lastRunId);
                                  }}
                                  className="mt-1 inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
                                >
                                  <ExternalLink size={10} /> View run
                                </button>
                              )}
                            </button>
                            <div className="relative flex shrink-0 flex-col items-end gap-1">
                              <RunTaskButton
                                task={t}
                                status={status}
                                blocked={blocked}
                                connected={connected}
                                hasAgentCwd={hasAgentCwd}
                                onRun={(canvas) => runTask(t, canvas)}
                                onRetry={() => {
                                  void patchPlanTaskStatus(t.id, "running");
                                  runTask(
                                    t,
                                    isConnectorReadPlanTask(t)
                                      ? "connector"
                                      : isBrowserPlanTask(t)
                                        ? "browser"
                                        : "run",
                                  );
                                }}
                              />
                              {(status === "pending" || status === "skipped") && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuTaskId(menuTaskId === t.id ? null : t.id);
                                    }}
                                    className="rounded-[var(--radius-sm)] p-1 text-text-3 hover:bg-elevated hover:text-text-2"
                                    aria-label="Task actions"
                                  >
                                    <MoreHorizontal size={14} />
                                  </button>
                                  {menuTaskId === t.id && (
                                    <div
                                      className="absolute right-0 top-full z-10 mt-1 min-w-[120px] rounded-[var(--radius-sm)] border border-line bg-surface py-1 shadow-lg"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        disabled={!connected}
                                        onClick={() => {
                                          prefillComposerForPlanTask({
                                            day: t.day,
                                            title: t.title,
                                            goal: buildPlanTaskRunGoal(t),
                                          });
                                          setMenuTaskId(null);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-micro text-text-2 hover:bg-elevated"
                                      >
                                        <MessageSquare size={12} /> Agent&apos;a sor
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!connected}
                                        onClick={() => {
                                          void patchPlanTaskStatus(
                                            t.id,
                                            status === "skipped" ? "pending" : "skipped",
                                          );
                                          setMenuTaskId(null);
                                        }}
                                        className="block w-full px-3 py-1.5 text-left text-micro text-text-2 hover:bg-elevated"
                                      >
                                        {status === "skipped" ? "Reopen task" : "Skip task"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
