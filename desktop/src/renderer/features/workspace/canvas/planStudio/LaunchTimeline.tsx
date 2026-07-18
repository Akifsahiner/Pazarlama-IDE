import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Play, RefreshCw } from "lucide-react";
import type { MarketingPlanSuite } from "@shared/planPlaybooks";
import type { PlanTask } from "@shared/types";
import {
  isDepSatisfied,
  nextActionableTask,
  type PlanProgressSnapshot,
  type PlanTaskStatus,
} from "@shared/planProgress";
import { peakLaunchDayFromTasks } from "@shared/effortEstimate";
import { milestonePop, statusPulse } from "@renderer/design/animations";
import { useApp } from "@renderer/state/store";
import { PeakDayWarning } from "@renderer/components/PeakDayWarning";
import { PLAYBOOK_ACCENT_VAR } from "./PlaybookCard";

interface LaneTask {
  task: PlanTask;
  status: PlanTaskStatus;
  isNext: boolean;
}

interface Lane {
  id: string;
  title: string;
  accent: string;
  tasks: LaneTask[];
}

function statusFor(
  snapshot: PlanProgressSnapshot | null,
  task: PlanTask,
): PlanTaskStatus {
  const st = snapshot?.byTaskId[task.id]?.status ?? "pending";
  if (st !== "pending") return st;
  const blocked = task.dependsOn.some(
    (dep) => !isDepSatisfied(snapshot?.byTaskId[dep]?.status),
  );
  return blocked ? "blocked" : "pending";
}

/** Visual treatment per task status on the timeline. */
function nodeStyle(status: PlanTaskStatus, accent: string): React.CSSProperties {
  switch (status) {
    case "done":
      return { backgroundColor: accent, borderColor: accent };
    case "running":
      return { backgroundColor: "transparent", borderColor: accent };
    case "awaiting_apply":
    case "partial":
      return { backgroundColor: "var(--warn)", borderColor: "var(--warn)", opacity: 0.85 };
    case "awaiting_review":
      return {
        backgroundColor: "transparent",
        borderColor: "var(--warn)",
        borderStyle: "dashed",
      };
    case "failed":
      return { backgroundColor: "var(--danger)", borderColor: "var(--danger)" };
    case "skipped":
      return { backgroundColor: "var(--surface-3)", borderColor: "var(--line-2)" };
    case "blocked":
      return { backgroundColor: "transparent", borderColor: "var(--warn)" };
    default:
      return { backgroundColor: "transparent", borderColor: accent, opacity: 0.65 };
  }
}

/**
 * LaunchTimeline — the "executable plan" identity view. Every playbook is a
 * horizontal lane; every task is a positioned, clickable node on a day axis;
 * week headers surface the (previously never-rendered) weekDone/weekTotal.
 */
export function LaunchTimeline({ plan }: { plan: MarketingPlanSuite }) {
  const planProgress = useApp((s) => s.planProgress);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const highlightPlanTaskId = useApp((s) => s.highlightPlanTaskId);
  const planMilestones = useApp((s) => s.planMilestones);
  const clearPlanMilestone = useApp((s) => s.clearPlanMilestone);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);

  const maxDay = useMemo(() => {
    const m = Math.max(7, ...plan.taskGraph.map((t) => t.day));
    return Math.ceil(m / 7) * 7;
  }, [plan.taskGraph]);

  const weeks = maxDay / 7;

  useEffect(() => {
    if (!planMilestones.lastTaskId && planMilestones.lastWeek == null) return;
    const t = window.setTimeout(() => {
      if (planMilestones.lastTaskId) clearPlanMilestone("lastTaskId");
      if (planMilestones.lastWeek != null) clearPlanMilestone("lastWeek");
    }, 900);
    return () => window.clearTimeout(t);
  }, [planMilestones.lastTaskId, planMilestones.lastWeek, clearPlanMilestone]);

  const todayDay = useMemo(() => {
    const anchor = planProgress?.launchAnchorAt;
    if (!anchor) return null;
    const start = new Date(anchor).getTime();
    if (Number.isNaN(start)) return null;
    const day = Math.floor((Date.now() - start) / 86_400_000) + 1;
    if (day < 1 || day > maxDay) return null;
    return day;
  }, [planProgress?.launchAnchorAt, maxDay]);

  const nextTask = useMemo(
    () => (planProgress ? nextActionableTask(plan, planProgress.byTaskId) : null),
    [plan, planProgress],
  );

  const lanes = useMemo<Lane[]>(() => {
    return [...plan.playbooks]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((pb) => ({
        id: pb.id,
        title: pb.title,
        accent: PLAYBOOK_ACCENT_VAR[pb.iconKey] ?? "var(--accent)",
        tasks: [...pb.tasks]
          .sort((a, b) => a.day - b.day)
          .map((task) => ({
            task,
            status: statusFor(planProgress, task),
            isNext: nextTask?.id === task.id,
          })),
      }));
  }, [plan.playbooks, planProgress, nextTask]);

  const computed = planProgress?.computed;

  const peakDay = useMemo(() => peakLaunchDayFromTasks(plan.taskGraph), [plan.taskGraph]);

  const pctForDay = (day: number) => `${((day - 0.5) / maxDay) * 100}%`;

  return (
    <section className="surface rounded-[var(--radius-lg)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-mini font-semibold uppercase tracking-wider text-text-3">
          Launch timeline
        </h3>
        <span className="text-micro text-text-3">
          {maxDay} days · {plan.taskGraph.length} tasks — click a node to focus it
        </span>
      </div>

      {peakDay && (
        <div className="mb-4">
          <PeakDayWarning peak={peakDay} />
        </div>
      )}

      {/* Week headers with real weekDone/weekTotal counts. */}
      <div className="mb-1 flex pl-32">
        {Array.from({ length: weeks }).map((_, i) => {
          const week = i + 1;
          const done = computed?.weekDone[week] ?? 0;
          const total = computed?.weekTotal[week] ?? 0;
          const complete = total > 0 && done >= total;
          const celebrate = planMilestones.lastWeek === week;
          return (
            <motion.div
              key={week}
              variants={celebrate && !reducedMotion ? milestonePop : undefined}
              initial={celebrate && !reducedMotion ? "hidden" : false}
              animate={celebrate && !reducedMotion ? "visible" : undefined}
              className="flex-1 border-l border-line/60 pl-2 first:border-l-0 first:pl-0"
            >
              <span
                className={`inline-flex items-center gap-1 text-micro ${
                  complete ? "text-ok" : "text-text-3"
                }`}
              >
                {complete && <Check size={10} />}
                Week {week}
                {total > 0 && (
                  <span className="tabular-nums opacity-80">
                    {done}/{total}
                  </span>
                )}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Day axis ticks */}
      <div className="relative mb-2 flex pl-32">
        <div className="relative h-4 flex-1">
          {[1, 7, 14, 21, 28]
            .filter((d) => d <= maxDay)
            .map((day) => (
              <span
                key={day}
                className={`absolute top-0 -translate-x-1/2 text-[9px] tabular-nums ${
                  peakDay?.day === day ? "font-semibold text-warn" : "text-text-3"
                }`}
                style={{ left: `${((day - 0.5) / maxDay) * 100}%` }}
              >
                D{day}
                {peakDay?.day === day && peakDay.minutes >= 90 ? " ⚡" : ""}
              </span>
            ))}
          {peakDay &&
            peakDay.minutes >= 90 &&
            ![1, 7, 14, 21, 28].includes(peakDay.day) &&
            peakDay.day <= maxDay && (
              <span
                className="absolute top-0 z-[1] -translate-x-1/2 rounded-full border border-warn/40 bg-warn/10 px-1.5 py-px text-[9px] font-semibold text-warn"
                style={{ left: `${((peakDay.day - 0.5) / maxDay) * 100}%` }}
                title={peakDay.warning}
              >
                D{peakDay.day} peak
              </span>
            )}
          {todayDay != null && (
            <span
              className="absolute -top-0.5 z-[2] -translate-x-1/2 rounded-full bg-accent px-1.5 py-px text-[9px] font-semibold text-white"
              style={{ left: `${((todayDay - 0.5) / maxDay) * 100}%` }}
            >
              Today
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {lanes.map((lane) => (
          <div key={lane.id} className="group flex items-center">
            <button
              type="button"
              onClick={() => focusPlanTask({ playbookId: lane.id })}
              className="flex w-32 shrink-0 items-center gap-1.5 pr-2 text-left"
              title={lane.title}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: lane.accent }}
              />
              <span className="truncate text-micro text-text-2 transition-colors group-hover:text-text">
                {lane.title}
              </span>
            </button>

            <div className="relative h-8 flex-1">
              <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-line/50" />
              {todayDay != null && (
                <span
                  className="absolute top-0 z-0 h-full w-px bg-accent/50"
                  style={{ left: `${((todayDay - 0.5) / maxDay) * 100}%` }}
                  aria-hidden
                />
              )}
              {peakDay && peakDay.minutes >= 90 && (
                <span
                  className="absolute top-0 z-0 h-full w-px bg-warn/45"
                  style={{ left: `${((peakDay.day - 0.5) / maxDay) * 100}%` }}
                  aria-hidden
                  title={`Peak day D${peakDay.day}`}
                />
              )}
              {Array.from({ length: weeks - 1 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute top-0 h-full w-px bg-line/40"
                  style={{ left: `${((i + 1) / weeks) * 100}%` }}
                />
              ))}

              {lane.tasks.map(({ task, status, isNext }) => {
                const highlighted = highlightPlanTaskId === task.id;
                const pulseTask = planMilestones.lastTaskId === task.id && status === "done";
                return (
                  <div
                    key={task.id}
                    className="absolute top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: pctForDay(task.day) }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => focusPlanTask({ playbookId: lane.id, taskId: task.id })}
                      aria-label={`Day ${task.day} — ${task.title} (${status})`}
                      title={`Day ${task.day} · ${task.title} — ${status}`}
                      className="relative"
                      whileHover={reducedMotion ? undefined : { scale: 1.45 }}
                    >
                      <motion.span
                        animate={
                          pulseTask && !reducedMotion ? statusPulse : { scale: 1, opacity: 1 }
                        }
                        className={`block h-3 w-3 rounded-full border-2 ${
                          status === "skipped" ? "border-dashed" : ""
                        } ${highlighted ? "ring-2 ring-[var(--accent-ring)]" : ""}`}
                        style={nodeStyle(status, lane.accent)}
                      />
                      {status === "running" && !reducedMotion && (
                        <motion.span
                          className="absolute inset-0 rounded-full border-2"
                          style={{ borderColor: lane.accent }}
                          animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      {(status === "awaiting_apply" || status === "partial") && (
                        <span
                          className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-warn text-[7px] font-bold text-white"
                          aria-hidden
                        >
                          !
                        </span>
                      )}
                      {status === "failed" && (
                        <span
                          className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-danger text-[7px] font-bold text-white"
                          aria-hidden
                        >
                          ×
                        </span>
                      )}
                      {status === "failed" && (
                        <button
                          type="button"
                          title="Retry task"
                          onClick={(e) => {
                            e.stopPropagation();
                            focusPlanTask({ playbookId: lane.id, taskId: task.id, startRun: true });
                          }}
                          className="absolute -bottom-[14px] left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border border-danger/40 bg-surface text-danger hover:bg-danger/10"
                        >
                          <RefreshCw size={8} />
                        </button>
                      )}
                      {isNext && status === "pending" && (
                        <span
                          className="absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-1.5 py-px text-[9px] font-semibold text-white"
                          aria-hidden
                        >
                          Next
                        </span>
                      )}
                    </motion.button>
                    {isNext && status === "pending" && (
                      <button
                        type="button"
                        title="Run next task"
                        onClick={() =>
                          focusPlanTask({ playbookId: lane.id, taskId: task.id, startRun: true })
                        }
                        className="absolute -bottom-[14px] left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border border-accent/40 bg-surface text-accent hover:bg-accent-soft"
                      >
                        <Play size={8} fill="currentColor" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-[10px] text-text-3">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-accent bg-accent" /> Done
        </span>
        <span className="flex items-center gap-1">
          <span className="relative h-2 w-2 rounded-full border-2 border-accent">
            <span className="absolute inset-0 animate-ping rounded-full border border-accent opacity-40" />
          </span>{" "}
          Running
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-accent opacity-65" /> Pending
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-warn bg-warn/80" /> Awaiting apply
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-dashed border-warn" /> Needs confirm
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-warn" /> Blocked
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-danger bg-danger" /> Failed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-line-2 bg-surface-3" /> Skipped
        </span>
      </div>
    </section>
  );
}
