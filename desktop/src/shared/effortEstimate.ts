import type { MarketingDecision, MarketingPlan, PlanTask } from "./types";
import type { PlanTaskStatus } from "./planProgress";
import { normalizePlan } from "./planPlaybooks";

export type EffortIntensity = "minimum" | "standard" | "sprint";

export interface PeakDayInfo {
  day: number;
  minutes: number;
  taskCount: number;
  week: number;
  /** Set when day load is high enough to warn founders */
  warning?: string;
}

export interface EffortEstimate {
  horizonDays: number;
  totalMinutes: number;
  remainingMinutes: number;
  nextTaskMinutes?: number;
  dailyPeakMinutes: number;
  peakDay: PeakDayInfo | null;
  intensity: EffortIntensity;
  /** e.g. "21d sprint · ~14h total · ~75m next" */
  label: string;
  shortLabel: string;
}

const MODE_MINUTES: Record<NonNullable<PlanTask["execution_mode"]>, number> = {
  browser: 75,
  repo: 90,
  asset: 45,
  run: 60,
  connector_read: 30,
};

const PEAK_WARN_MINUTES = 90;

function inferMode(task: PlanTask): keyof typeof MODE_MINUTES {
  if (task.action_type === "browser_research") return "browser";
  if (task.action_type === "edit_files") return "repo";
  if (task.action_type === "draft_copy") return "asset";
  if (task.action_type === "analyze") return "connector_read";
  return "run";
}

export function taskEffortMinutes(task: PlanTask): number {
  const mode = task.execution_mode ?? inferMode(task);
  let minutes = MODE_MINUTES[mode] ?? 55;
  const phase = task.phaseLabel ?? "";
  if (/^H0|^H\+/i.test(phase) || (task.day <= 1 && /launch/i.test(task.title))) {
    minutes = Math.round(minutes * 1.35);
  }
  return minutes;
}

export function formatEffortMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function intensityFor(horizonDays: number, totalMinutes: number): EffortIntensity {
  const dailyAvg = horizonDays > 0 ? totalMinutes / horizonDays : totalMinutes;
  if (horizonDays <= 14 && dailyAvg >= 45) return "sprint";
  if (horizonDays <= 21 && totalMinutes >= 480) return "standard";
  return "minimum";
}

function peakWarning(day: number, minutes: number, taskCount: number): string | undefined {
  if (minutes < PEAK_WARN_MINUTES) return undefined;
  const week = Math.ceil(day / 7);
  const weekNote = week <= 2 ? " — launch week stacks fast" : "";
  return `Day ${day} needs ~${formatEffortMinutes(minutes)} (${taskCount} task${taskCount === 1 ? "" : "s"}). Block the calendar; don't add deep work that day${weekNote}.`;
}

/** Busiest calendar day from a task graph. */
export function peakLaunchDayFromTasks(tasks: PlanTask[]): PeakDayInfo | null {
  const byDay = new Map<number, { minutes: number; count: number }>();
  for (const t of tasks) {
    const cur = byDay.get(t.day) ?? { minutes: 0, count: 0 };
    byDay.set(t.day, {
      minutes: cur.minutes + taskEffortMinutes(t),
      count: cur.count + 1,
    });
  }
  if (byDay.size === 0) return null;

  let best: PeakDayInfo | null = null;
  for (const [day, row] of byDay) {
    if (!best || row.minutes > best.minutes) {
      best = {
        day,
        minutes: row.minutes,
        taskCount: row.count,
        week: Math.ceil(day / 7),
      };
    }
  }
  if (best) {
    best.warning = peakWarning(best.day, best.minutes, best.taskCount);
  }
  return best;
}

export interface EffortEstimateOpts {
  playbookId?: string;
  byTaskId?: Record<string, { status: PlanTaskStatus }>;
  nextTaskId?: string;
}

function buildEffortEstimate(
  tasks: PlanTask[],
  horizonDays: number,
  remainingMinutes: number,
  totalMinutes: number,
  nextTaskMinutes?: number,
): EffortEstimate {
  const intensity = intensityFor(horizonDays, totalMinutes);
  const peakDay = peakLaunchDayFromTasks(tasks);
  const peak = peakDay?.minutes ?? 0;
  const intensityWord = intensity === "sprint" ? "sprint" : intensity === "standard" ? "plan" : "pace";

  const labelParts = [
    `${horizonDays}d ${intensityWord}`,
    `~${formatEffortMinutes(remainingMinutes > 0 ? remainingMinutes : totalMinutes)} left`,
  ];
  if (nextTaskMinutes) labelParts.push(`~${nextTaskMinutes}m next`);
  if (peak >= PEAK_WARN_MINUTES) labelParts.push(`peak D${peakDay!.day} ~${formatEffortMinutes(peak)}`);

  return {
    horizonDays,
    totalMinutes,
    remainingMinutes,
    nextTaskMinutes,
    dailyPeakMinutes: peak,
    peakDay,
    intensity,
    label: labelParts.join(" · "),
    shortLabel: `~${formatEffortMinutes(remainingMinutes > 0 ? remainingMinutes : totalMinutes)} over ${horizonDays}d`,
  };
}

/** Honest effort model for plan UI — not fake productivity theater. */
export function estimatePlanEffort(
  plan: MarketingPlan,
  opts: EffortEstimateOpts = {},
): EffortEstimate {
  const suite = normalizePlan(plan);
  const allTasks = suite?.playbooks?.length
    ? opts.playbookId
      ? (suite.playbooks.find((p) => p.id === opts.playbookId)?.tasks ?? plan.taskGraph)
      : suite.playbooks.flatMap((p) => p.tasks)
    : plan.taskGraph;

  const tasks = allTasks.length ? allTasks : plan.taskGraph;
  const horizonDays = Math.max(1, ...tasks.map((t) => t.day), 14);
  const totalMinutes = tasks.reduce((sum, t) => sum + taskEffortMinutes(t), 0);

  const terminal = new Set<PlanTaskStatus>(["done", "skipped"]);
  const remaining = opts.byTaskId
    ? tasks.filter((t) => !terminal.has(opts.byTaskId![t.id]?.status ?? "pending"))
    : tasks;
  const remainingMinutes = remaining.reduce((sum, t) => sum + taskEffortMinutes(t), 0);

  const nextId = opts.nextTaskId ?? remaining.sort((a, b) => a.day - b.day)[0]?.id;
  const nextTask = nextId ? tasks.find((t) => t.id === nextId) : undefined;
  const nextTaskMinutes = nextTask ? taskEffortMinutes(nextTask) : undefined;

  return buildEffortEstimate(tasks, horizonDays, remainingMinutes, totalMinutes, nextTaskMinutes);
}

/** Map skill phase labels (T-7, H0, D+1) to plan day numbers. */
export function parseTacticPhaseDay(phase: string | undefined, launchDay: number): number | null {
  if (!phase) return null;
  const t = phase.trim();
  const tMinus = /^T-(\d+)/i.exec(t);
  if (tMinus) return Math.max(1, launchDay - Number(tMinus[1]));
  if (/^H0|^H\+/i.test(t)) return launchDay;
  const dPlus = /^D\+(\d+)/i.exec(t);
  if (dPlus) return launchDay + Number(dPlus[1]);
  const week = /^W(\d+)/i.exec(t);
  if (week) return Number(week[1]) * 7;
  const day = /^D(\d+)/i.exec(t);
  if (day) return Number(day[1]);
  return null;
}

function tacticMinutesFromStack(id: string, phase?: string): number {
  const key = `${id} ${phase ?? ""}`.toLowerCase();
  let minutes = 55;
  if (/browser|community|hn|reddit|show|research|ih\b/.test(key)) minutes = MODE_MINUTES.browser;
  else if (/seo|repo|page|edit|ship|comparison|programmatic/.test(key)) minutes = MODE_MINUTES.repo;
  else if (/email|copy|post|newsletter|nurture|draft/.test(key)) minutes = MODE_MINUTES.asset;
  else if (/analyze|metric|ga4|kpi/.test(key)) minutes = MODE_MINUTES.connector_read;
  if (/^H0|^H\+/i.test(phase ?? "") || /\bh0\b/.test(key)) {
    minutes = Math.round(minutes * 1.35);
  }
  return minutes;
}

interface DayLoad {
  day: number;
  minutes: number;
  count: number;
}

function peakFromDayLoads(loads: DayLoad[]): PeakDayInfo | null {
  if (loads.length === 0) return null;
  const byDay = new Map<number, { minutes: number; count: number }>();
  for (const row of loads) {
    const cur = byDay.get(row.day) ?? { minutes: 0, count: 0 };
    byDay.set(row.day, {
      minutes: cur.minutes + row.minutes,
      count: cur.count + row.count,
    });
  }
  let best: PeakDayInfo | null = null;
  for (const [day, row] of byDay) {
    if (!best || row.minutes > best.minutes) {
      best = { day, minutes: row.minutes, taskCount: row.count, week: Math.ceil(day / 7) };
    }
  }
  if (best) best.warning = peakWarning(best.day, best.minutes, best.taskCount);
  return best;
}

export interface DecisionEffortOpts {
  daysUntilLaunch?: number;
  plan?: MarketingPlan | null;
  byTaskId?: Record<string, { status: PlanTaskStatus }>;
  nextTaskId?: string;
}

/** Effort for a MarketingDecision — uses live plan when present, else infers from tactic stack. */
export function estimateDecisionEffort(
  decision: MarketingDecision,
  opts: DecisionEffortOpts = {},
): EffortEstimate {
  if (opts.plan?.taskGraph?.length) {
    return estimatePlanEffort(opts.plan, {
      byTaskId: opts.byTaskId,
      nextTaskId: opts.nextTaskId,
    });
  }

  const launchDay =
    opts.daysUntilLaunch && opts.daysUntilLaunch > 0
      ? Math.min(opts.daysUntilLaunch, 30)
      : 14;
  const loads: DayLoad[] = [];
  const stack = decision.tactic_stack ?? [];

  stack.forEach((t, i) => {
    const day =
      parseTacticPhaseDay(t.phase, launchDay) ??
      Math.max(1, Math.round((launchDay * (i + 1)) / Math.max(stack.length, 1)));
    loads.push({ day, minutes: tacticMinutesFromStack(t.id, t.phase), count: 1 });
  });

  for (const _step of decision.next_steps) {
    loads.push({ day: 1, minutes: 35, count: 1 });
  }

  if (loads.length === 0) {
    const hintDays = launchDay;
    const hintMinutes = decision.recommended_aggression === "aggressive" ? 720 : 480;
    const intensity =
      decision.recommended_aggression === "aggressive"
        ? "sprint"
        : decision.recommended_aggression === "conservative"
          ? "minimum"
          : "standard";
    return {
      horizonDays: hintDays,
      totalMinutes: hintMinutes,
      remainingMinutes: hintMinutes,
      dailyPeakMinutes: 0,
      peakDay: null,
      intensity,
      label: estimateProfileEffortHint(hintDays),
      shortLabel: `~${formatEffortMinutes(hintMinutes)} over ${hintDays}d`,
    };
  }

  const horizonDays = Math.max(launchDay, ...loads.map((l) => l.day), 7);
  const totalMinutes = loads.reduce((s, l) => s + l.minutes, 0);
  const peakDay = peakFromDayLoads(loads);
  let intensity = intensityFor(horizonDays, totalMinutes);
  if (decision.recommended_aggression === "aggressive" && intensity === "minimum") {
    intensity = "standard";
  }
  if (decision.recommended_aggression === "conservative" && intensity === "sprint") {
    intensity = "standard";
  }

  const intensityWord = intensity === "sprint" ? "sprint" : intensity === "standard" ? "plan" : "pace";
  const labelParts = [
    `${horizonDays}d ${intensityWord}`,
    `~${formatEffortMinutes(totalMinutes)} to execute stack`,
  ];
  if (peakDay && peakDay.minutes >= PEAK_WARN_MINUTES) {
    labelParts.push(`peak D${peakDay.day} ~${formatEffortMinutes(peakDay.minutes)}`);
  }

  return {
    horizonDays,
    totalMinutes,
    remainingMinutes: totalMinutes,
    nextTaskMinutes: loads.sort((a, b) => a.day - b.day)[0]?.minutes,
    dailyPeakMinutes: peakDay?.minutes ?? 0,
    peakDay,
    intensity,
    label: labelParts.join(" · "),
    shortLabel: `~${formatEffortMinutes(totalMinutes)} over ${horizonDays}d`,
  };
}

/** Pre-plan profile hint when user has no task graph yet. */
export function estimateProfileEffortHint(daysUntilLaunch?: number): string {
  const d = daysUntilLaunch && daysUntilLaunch > 0 ? Math.min(daysUntilLaunch, 30) : 21;
  return `${d}d launch runway · plan for ~45–90m/day execution`;
}
