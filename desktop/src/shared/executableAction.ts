/**
 * Unified executable action contract — Brain SSE → desktop UI → edit/browse/plan runs.
 */
import type { ConversationIntent } from "./conversationIntent";

export type ExecutableAction =
  | {
      kind: "edit_run";
      goal: string;
      targetFiles?: string[];
      sourceAssetId?: string;
      citations?: string[];
      label?: string;
    }
  | { kind: "apply_sidecar"; assetId: string; targetFile: string; label?: string }
  | { kind: "integrate_site"; assetId: string; route: string; goal: string; label?: string }
  | { kind: "browser_run"; goal: string; label?: string }
  | { kind: "continue_plan"; taskId: string; playbookId?: string; label?: string }
  | { kind: "generate_plan"; label?: string };

export interface ExecutableActionBundle {
  primary?: ExecutableAction;
  secondary?: ExecutableAction[];
}

export function executableActionToIntent(action: ExecutableAction): ConversationIntent | null {
  switch (action.kind) {
    case "edit_run":
      return { kind: "start_edit_run", goal: action.goal };
    case "apply_sidecar":
      return { kind: "integrate_asset", assetId: action.assetId };
    case "integrate_site":
      return {
        kind: "integrate_asset",
        assetId: action.assetId,
        route: action.route,
      };
    case "browser_run":
      return { kind: "start_browser_task", goal: action.goal };
    case "continue_plan":
      return { kind: "run_plan_task", taskId: action.taskId };
    case "generate_plan":
      return { kind: "generate_plan" };
    default:
      return null;
  }
}

export function actionButtonLabel(action: ExecutableAction): string {
  if (action.label) return action.label;
  switch (action.kind) {
    case "edit_run":
      return "Run in project";
    case "apply_sidecar":
      return "Save to marketing/";
    case "integrate_site":
      return "Apply to site";
    case "browser_run":
      return "Run in browser";
    case "continue_plan":
      return "Run plan task";
    case "generate_plan":
      return "Generate plan";
    default:
      return "Continue";
  }
}

export function parseExecutableAction(raw: unknown): ExecutableAction | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const kind = o.kind;
  if (kind === "edit_run" && typeof o.goal === "string") {
    return {
      kind: "edit_run",
      goal: o.goal,
      targetFiles: Array.isArray(o.targetFiles)
        ? o.targetFiles.filter((p): p is string => typeof p === "string")
        : undefined,
      sourceAssetId: typeof o.sourceAssetId === "string" ? o.sourceAssetId : undefined,
      citations: Array.isArray(o.citations)
        ? o.citations.filter((p): p is string => typeof p === "string")
        : undefined,
      label: typeof o.label === "string" ? o.label : undefined,
    };
  }
  if (kind === "apply_sidecar" && typeof o.assetId === "string" && typeof o.targetFile === "string") {
    return {
      kind: "apply_sidecar",
      assetId: o.assetId,
      targetFile: o.targetFile,
      label: typeof o.label === "string" ? o.label : undefined,
    };
  }
  if (
    kind === "integrate_site" &&
    typeof o.assetId === "string" &&
    typeof o.route === "string" &&
    typeof o.goal === "string"
  ) {
    return {
      kind: "integrate_site",
      assetId: o.assetId,
      route: o.route,
      goal: o.goal,
      label: typeof o.label === "string" ? o.label : undefined,
    };
  }
  if (kind === "browser_run" && typeof o.goal === "string") {
    return {
      kind: "browser_run",
      goal: o.goal,
      label: typeof o.label === "string" ? o.label : undefined,
    };
  }
  if (kind === "continue_plan" && typeof o.taskId === "string") {
    return {
      kind: "continue_plan",
      taskId: o.taskId,
      playbookId: typeof o.playbookId === "string" ? o.playbookId : undefined,
      label: typeof o.label === "string" ? o.label : undefined,
    };
  }
  if (kind === "generate_plan") {
    return { kind: "generate_plan", label: typeof o.label === "string" ? o.label : undefined };
  }
  return null;
}

export function parseExecutableActionBundle(raw: unknown): ExecutableActionBundle {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const primary = parseExecutableAction(o.primary ?? o);
  const secondary = Array.isArray(o.secondary)
    ? o.secondary.map(parseExecutableAction).filter((a): a is ExecutableAction => a != null)
    : Array.isArray(o.actions)
      ? o.actions.map(parseExecutableAction).filter((a): a is ExecutableAction => a != null).slice(1)
      : undefined;
  if (!primary && Array.isArray(o.actions)) {
    const all = o.actions.map(parseExecutableAction).filter((a): a is ExecutableAction => a != null);
    return { primary: all[0], secondary: all.slice(1) };
  }
  return { primary: primary ?? undefined, secondary };
}
