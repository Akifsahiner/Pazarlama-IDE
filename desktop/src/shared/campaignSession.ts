import type { Persona } from "./types";
import type { PlanProgressSnapshot } from "./planProgress";

/** Lifecycle phase for a single marketing campaign thread. */
export type CampaignPhase = "intake" | "planning" | "executing" | "reviewing" | "measuring";

export type CampaignMilestoneKind =
  | "phase"
  | "plan"
  | "run"
  | "apply"
  | "asset"
  | "kpi"
  | "complete";

export interface CampaignMilestone {
  label: string;
  at: string;
  kind: CampaignMilestoneKind;
}

export interface CampaignSession {
  id: string;
  projectId: string;
  goal: string;
  persona: Persona;
  startedAt: string;
  planId?: string;
  activeTaskId?: string;
  phase: CampaignPhase;
  milestones: CampaignMilestone[];
  runIds: string[];
  assetIds: string[];
}

export type CampaignPhaseEvent =
  | { type: "plan_generate_start" }
  | { type: "plan_generate_success"; planId: string }
  | { type: "awaiting_apply"; taskId: string }
  | { type: "task_done"; taskId: string; allTasksDone: boolean }
  | { type: "log_kpi" }
  | { type: "cmo_cycle_restart"; cycleIndex: number; thesisTitle: string };

export const CAMPAIGN_PHASE_LABELS: Record<CampaignPhase, string> = {
  intake: "Intake",
  planning: "Planning",
  executing: "Executing",
  reviewing: "Reviewing",
  measuring: "Measuring",
};

/** Thread header timeline: intake → plan → execute → measure */
export const CAMPAIGN_TIMELINE_STEPS = [
  { key: "intake", label: "Intake", phases: ["intake"] as CampaignPhase[] },
  { key: "plan", label: "Plan", phases: ["planning"] as CampaignPhase[] },
  { key: "execute", label: "Execute", phases: ["executing", "reviewing"] as CampaignPhase[] },
  { key: "measure", label: "Measure", phases: ["measuring"] as CampaignPhase[] },
] as const;

const MAX_MILESTONES = 48;

export function createCampaignSession(opts: {
  projectId: string;
  persona: Persona;
  goal?: string;
  planHorizon?: number;
}): CampaignSession {
  const horizon = opts.planHorizon ?? 30;
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectId: opts.projectId,
    goal: opts.goal?.trim() || `${horizon}-day launch`,
    persona: opts.persona,
    startedAt: now,
    phase: "intake",
    milestones: [{ label: "Campaign started", at: now, kind: "phase" }],
    runIds: [],
    assetIds: [],
  };
}

function appendMilestone(
  session: CampaignSession,
  label: string,
  kind: CampaignMilestoneKind,
): CampaignSession {
  const at = new Date().toISOString();
  const last = session.milestones[session.milestones.length - 1];
  if (last?.label === label && last.kind === kind) return session;
  return {
    ...session,
    milestones: [...session.milestones, { label, at, kind }].slice(-MAX_MILESTONES),
  };
}

/** Apply automatic phase transitions driven by plan/run/KPI events. */
export function applyCampaignPhaseEvent(
  session: CampaignSession,
  event: CampaignPhaseEvent,
): CampaignSession {
  switch (event.type) {
    case "plan_generate_start": {
      if (session.phase !== "intake" && session.phase !== "planning") return session;
      return appendMilestone(
        { ...session, phase: "planning" },
        "Planning launch",
        "phase",
      );
    }
    case "plan_generate_success":
      return appendMilestone(
        {
          ...session,
          phase: "executing",
          planId: event.planId,
        },
        "Launch plan ready",
        "plan",
      );
    case "awaiting_apply":
      return appendMilestone(
        {
          ...session,
          phase: "reviewing",
          activeTaskId: event.taskId,
        },
        "Review & apply changes",
        "apply",
      );
    case "task_done": {
      let next: CampaignSession = {
        ...session,
        activeTaskId: undefined,
        phase: event.allTasksDone ? "measuring" : "executing",
      };
      if (event.allTasksDone) {
        next = appendMilestone(next, "Launch cycle complete", "complete");
      } else if (session.phase === "reviewing") {
        next = appendMilestone(next, "Task complete — next up", "apply");
      }
      return next;
    }
    case "log_kpi":
      return appendMilestone({ ...session, phase: "measuring" }, "KPI logged", "kpi");
    case "cmo_cycle_restart":
      return appendMilestone(
        { ...session, phase: "executing", activeTaskId: undefined },
        `Week ${event.cycleIndex} — ${event.thesisTitle}`,
        "phase",
      );
    default:
      return session;
  }
}

export function appendCampaignRun(
  session: CampaignSession,
  runId: string,
  taskId?: string,
): CampaignSession {
  if (!runId || session.runIds.includes(runId)) {
    return taskId && taskId !== session.activeTaskId
      ? { ...session, activeTaskId: taskId }
      : session;
  }
  return appendMilestone(
    {
      ...session,
      runIds: [...session.runIds, runId],
      activeTaskId: taskId ?? session.activeTaskId,
    },
    taskId ? "Plan task run started" : "Agent run started",
    "run",
  );
}

export function appendCampaignAsset(session: CampaignSession, assetId: string): CampaignSession {
  if (!assetId || session.assetIds.includes(assetId)) return session;
  return appendMilestone(
    { ...session, assetIds: [...session.assetIds, assetId] },
    "Asset applied",
    "asset",
  );
}

export function campaignProgressPercent(
  session: CampaignSession,
  planProgress?: PlanProgressSnapshot | null,
): number {
  if (planProgress?.computed.total) {
    const { done, total } = planProgress.computed;
    return Math.min(100, Math.round((done / total) * 100));
  }
  switch (session.phase) {
    case "intake":
      return 0;
    case "planning":
      return 10;
    case "executing":
      return 25;
    case "reviewing":
      return 50;
    case "measuring":
      return 100;
    default:
      return 0;
  }
}

export function campaignTimelineStepIndex(phase: CampaignPhase): number {
  const idx = CAMPAIGN_TIMELINE_STEPS.findIndex((s) => s.phases.includes(phase));
  return idx >= 0 ? idx : 0;
}

export function isCampaignTimelineStepComplete(
  stepIndex: number,
  phase: CampaignPhase,
): boolean {
  const current = campaignTimelineStepIndex(phase);
  return stepIndex < current;
}

export function isCampaignTimelineStepActive(
  stepIndex: number,
  phase: CampaignPhase,
): boolean {
  return campaignTimelineStepIndex(phase) === stepIndex;
}

export function allPlanTasksDone(planProgress?: PlanProgressSnapshot | null): boolean {
  if (!planProgress?.computed.total) return false;
  return planProgress.computed.done >= planProgress.computed.total;
}

/** Session-aware next-action eyebrow (Faz 6). */
export function campaignNextActionEyebrow(
  session: CampaignSession | null | undefined,
  fallback: string,
): string {
  if (!session) return fallback;
  return `Campaign · ${CAMPAIGN_PHASE_LABELS[session.phase]}`;
}

export function campaignNextActionReason(
  session: CampaignSession | null | undefined,
  reason: string,
): string {
  if (!session) return reason;
  return `${session.goal} — ${reason}`;
}

/** Parse persisted JSON safely (localStorage / profile reload). */
export function hydrateCampaignSessionFromJson(raw: unknown): CampaignSession | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.projectId !== "string") return null;
  if (typeof o.goal !== "string" || typeof o.startedAt !== "string") return null;
  const phase = o.phase;
  if (
    phase !== "intake" &&
    phase !== "planning" &&
    phase !== "executing" &&
    phase !== "reviewing" &&
    phase !== "measuring"
  ) {
    return null;
  }
  const persona = o.persona === "sales" ? "sales" : "marketing";
  return {
    id: o.id,
    projectId: o.projectId,
    goal: o.goal,
    persona,
    startedAt: o.startedAt,
    planId: typeof o.planId === "string" ? o.planId : undefined,
    activeTaskId: typeof o.activeTaskId === "string" ? o.activeTaskId : undefined,
    phase,
    milestones: Array.isArray(o.milestones)
      ? o.milestones
          .filter((m): m is CampaignMilestone => {
            if (!m || typeof m !== "object") return false;
            const row = m as Record<string, unknown>;
            return typeof row.label === "string" && typeof row.at === "string";
          })
          .map((m) => ({
            label: m.label,
            at: m.at,
            kind: (m as CampaignMilestone).kind ?? "phase",
          }))
      : [],
    runIds: Array.isArray(o.runIds) ? o.runIds.filter((id): id is string => typeof id === "string") : [],
    assetIds: Array.isArray(o.assetIds)
      ? o.assetIds.filter((id): id is string => typeof id === "string")
      : [],
  };
}
