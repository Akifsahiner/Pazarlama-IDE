import type { ConversationIntent, ResolvedConversationIntent } from "./conversationIntent";

/** One-shot banner after onboarding reveal → workspace, or agent-suggested handoff. */
export type WorkspaceHandoffAction =
  | "generate_plan"
  | "preview_plan"
  | "open_plan"
  | "composer"
  | "home"
  | "first_move"
  | "execute_intent";

export interface HandoffPayload {
  intent: ConversationIntent;
  planTaskDay?: number;
  planTaskTitle?: string;
  patchCount?: number;
  modeLabel?: string;
}

export interface WorkspaceHandoff {
  eyebrow: string;
  title: string;
  reason: string;
  primaryLabel: string;
  primaryAction: WorkspaceHandoffAction;
  secondaryLabel?: string;
  secondaryAction?: WorkspaceHandoffAction;
  payload?: HandoffPayload;
  /** Edit runs show acknowledgement checkbox before execute. */
  requireAcknowledge?: boolean;
}

export interface HandoffConfirmState {
  intent: ConversationIntent;
  title: string;
  detail: string;
  mode: "edit" | "apply" | "integrate";
  patchCount?: number;
  planTaskLabel?: string;
  sourceMessageId?: string;
}

/** Build a dismissible workspace banner from a resolved intent. */
export function handoffFromResolved(resolved: ResolvedConversationIntent): WorkspaceHandoff | null {
  const { intent, label, reason } = resolved;

  switch (intent.kind) {
    case "start_edit_run":
      return {
        eyebrow: "Ready to run",
        title: label ?? "Run in project",
        reason: reason ?? intent.goal.slice(0, 160),
        primaryLabel: "Run",
        primaryAction: "execute_intent",
        requireAcknowledge: true,
        payload: {
          intent,
          modeLabel: "Edit project",
          planTaskTitle: intent.planTaskId,
        },
      };
    case "start_browser_task":
      return {
        eyebrow: "Browser research",
        title: label ?? "Run in browser",
        reason: reason ?? intent.goal.slice(0, 160),
        primaryLabel: "Run in browser",
        primaryAction: "execute_intent",
        payload: { intent, modeLabel: "Browse" },
      };
    case "apply_pending":
      return {
        eyebrow: "Needs you",
        title: label ?? "Apply changes",
        reason: reason ?? "Review diff and apply to mark this task done.",
        primaryLabel: "Review & apply",
        primaryAction: "execute_intent",
        payload: { intent, modeLabel: "Apply" },
      };
    case "run_plan_task":
    case "run_next_plan_task":
      return {
        eyebrow: "Plan task",
        title: label ?? "Run plan task",
        reason: reason ?? "Continue your launch plan.",
        primaryLabel: "Run task",
        primaryAction: "execute_intent",
        payload: { intent, modeLabel: "Plan" },
      };
    case "generate_plan":
      return {
        eyebrow: "Next up",
        title: label ?? "Generate launch plan",
        reason: reason ?? "Build your 30-day executable playbook.",
        primaryLabel: "Generate plan",
        primaryAction: "generate_plan",
      };
    case "preview_plan":
      return {
        eyebrow: "Next up",
        title: label ?? "Preview plan outline",
        reason: reason ?? "Offline outline from your scan.",
        primaryLabel: "Preview outline",
        primaryAction: "preview_plan",
      };
    case "log_kpi":
      return {
        eyebrow: "Measure",
        title: label ?? "Log KPI",
        reason: reason ?? "Record results for this launch task.",
        primaryLabel: "Log KPI",
        primaryAction: "execute_intent",
        payload: { intent, modeLabel: "KPI" },
      };
    case "integrate_asset":
      return {
        eyebrow: "Asset ready",
        title: label ?? "Apply copy to site",
        reason: reason ?? "Run an edit to weave this draft into your landing page.",
        primaryLabel: "Apply to site",
        primaryAction: "execute_intent",
        requireAcknowledge: true,
        payload: { intent, modeLabel: "Integrate" },
      };
    case "ask_only":
      return null;
    default:
      return null;
  }
}
