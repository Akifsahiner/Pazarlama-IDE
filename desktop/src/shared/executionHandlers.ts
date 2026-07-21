/**
 * Part 10 — Handler registry: maps MarketingExecutionMode → execution surface.
 */
import type { MarketingExecutionMode } from "./marketingTaskContract";
import type { CmoOpsTask } from "./cmoOpsCadence";
import type { ExecutionInstance } from "./executionKernel";
import type { LaneARunPlan } from "./cmoLaneA";
import type { HumanExecutionRef } from "./humanExecutionPlan";

export type ExecutionHandlerKind =
  | "lane_run"
  | "browser_research"
  | "browser_verify"
  | "human_handoff"
  | "delegate_handoff"
  | "export"
  | "measurement"
  | "week_review"
  | "product_request";

export interface ExecutionHandlerDescriptor {
  kind: ExecutionHandlerKind;
  modes: MarketingExecutionMode[];
  label: string;
}

export const EXECUTION_HANDLER_REGISTRY: ExecutionHandlerDescriptor[] = [
  {
    kind: "lane_run",
    modes: ["repo_edit", "scout_then_edit", "content_draft"],
    label: "Lane A repo run",
  },
  {
    kind: "browser_research",
    modes: ["browser_research"],
    label: "Browser research",
  },
  {
    kind: "browser_verify",
    modes: ["repo_edit", "content_draft"],
    label: "Post-apply browser verify (sub-phase)",
  },
  {
    kind: "human_handoff",
    modes: ["human_post", "human_outreach", "human_launch", "human_log"],
    label: "Human proof handoff",
  },
  {
    kind: "delegate_handoff",
    modes: ["delegate_rubric", "delegate_brief"],
    label: "Delegate rubric / brief",
  },
  { kind: "export", modes: ["export_csv"], label: "Outreach CSV export" },
  { kind: "measurement", modes: ["measurement_sync"], label: "GA4 / KPI sync" },
  { kind: "week_review", modes: ["week_review"], label: "Week review close" },
  { kind: "product_request", modes: ["product_request"], label: "Lane D product loop" },
];

const MODE_TO_KIND = new Map<MarketingExecutionMode, ExecutionHandlerKind>();
for (const desc of EXECUTION_HANDLER_REGISTRY) {
  for (const mode of desc.modes) {
    MODE_TO_KIND.set(mode, desc.kind);
  }
}

export function resolveHandlerKind(mode: MarketingExecutionMode): ExecutionHandlerKind {
  return MODE_TO_KIND.get(mode) ?? "human_handoff";
}

export function allRegisteredModes(): MarketingExecutionMode[] {
  const modes = new Set<MarketingExecutionMode>();
  for (const desc of EXECUTION_HANDLER_REGISTRY) {
    for (const m of desc.modes) modes.add(m);
  }
  return [...modes];
}

export interface LaneRunDispatchPayload {
  kind: "lane_run";
  plan: LaneARunPlan;
  taskId: string;
}

export interface BrowserResearchDispatchPayload {
  kind: "browser_research";
  goal: string;
  taskId: string;
}

export interface HumanHandoffDispatchPayload {
  kind: "human_handoff";
  ref: HumanExecutionRef;
  taskId: string;
}

export interface ExportDispatchPayload {
  kind: "export";
  taskId: string;
  exportKind?: string;
}

export interface MeasurementDispatchPayload {
  kind: "measurement";
  taskId: string;
}

export interface WeekReviewDispatchPayload {
  kind: "week_review";
  cadenceId: string;
}

export interface ProductRequestDispatchPayload {
  kind: "product_request";
  taskId: string;
}

export type ExecutionDispatchPayload =
  | LaneRunDispatchPayload
  | BrowserResearchDispatchPayload
  | HumanHandoffDispatchPayload
  | ExportDispatchPayload
  | MeasurementDispatchPayload
  | WeekReviewDispatchPayload
  | ProductRequestDispatchPayload;

/** Resolve runtime dispatch payload from ops task + handler kind. */
export function resolveDispatchPayload(input: {
  task: CmoOpsTask;
  instance: ExecutionInstance;
  cadenceId?: string;
  resolveLanePlan?: (taskId: string) => LaneARunPlan | null;
}): ExecutionDispatchPayload | null {
  const { task, instance } = input;
  const kind = resolveHandlerKind(instance.execution_mode);

  switch (kind) {
    case "lane_run": {
      const plan = input.resolveLanePlan?.(task.id);
      if (!plan) return null;
      return { kind: "lane_run", plan, taskId: task.id };
    }
    case "browser_research":
      return {
        kind: "browser_research",
        goal: task.execution_plan?.goal ?? task.what,
        taskId: task.id,
      };
    case "human_handoff":
    case "delegate_handoff":
      if (!task.human_execution_ref) return null;
      return { kind: "human_handoff", ref: task.human_execution_ref, taskId: task.id };
    case "export":
      return {
        kind: "export",
        taskId: task.id,
        exportKind: task.human_execution_ref?.export_kind,
      };
    case "measurement":
      return { kind: "measurement", taskId: task.id };
    case "week_review":
      return { kind: "week_review", cadenceId: input.cadenceId ?? "" };
    case "product_request":
      return { kind: "product_request", taskId: task.id };
    default:
      return null;
  }
}

export function isBrowserVerifyPhase(task: CmoOpsTask, instance: ExecutionInstance): boolean {
  return (
    resolveHandlerKind(instance.execution_mode) === "lane_run" &&
    Boolean(
      task.expected_proof_kind === "browser_evidence" ||
        task.required_proof?.includes("browser_evidence"),
    )
  );
}
