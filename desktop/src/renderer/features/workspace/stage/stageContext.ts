import type { LucideIcon } from "lucide-react";
import {
  FolderGit2,
  Globe,
  Layers,
  ListTodo,
  Play,
  Search,
} from "lucide-react";
import type { CanvasMode } from "@renderer/state/session";
import {
  WORK_SURFACE_META,
  normalizeToWorkSurface,
  type WorkSurface,
} from "@shared/workSurfaces";
import { assetFileName } from "@renderer/lib/assetDiff";
import type { MarketingAsset, MarketingPlan, ProjectProfile } from "@shared/types";
import { getPlaybook, normalizePlan } from "@shared/planPlaybooks";
import { taskStatusFromSnapshot, type PlanProgressSnapshot } from "@shared/planProgress";

export interface StageSegment {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
}

export interface StageContextInput {
  project: ProjectProfile | null;
  canvasMode: CanvasMode;
  activeAssetId?: string;
  experimentId?: string;
  highlightPlanTaskId?: string;
  activePlanTaskId?: string;
  activePlaybookId?: string;
  plan: MarketingPlan | null;
  planProgress: PlanProgressSnapshot | null;
  threadAssets: MarketingAsset[];
  runGoal?: string;
  browserRunning: boolean;
}

function projectIcon(source: ProjectProfile["source"]): LucideIcon {
  return source.kind === "url" ? Globe : FolderGit2;
}

function taskById(plan: MarketingPlan | null, id?: string) {
  if (!plan || !id) return null;
  return plan.taskGraph.find((t) => t.id === id) ?? null;
}

function assetLabel(assets: MarketingAsset[], id?: string): string | null {
  if (!id) return null;
  const a = assets.find((x) => x.id === id);
  return a ? assetFileName(a) : null;
}

/** Build breadcrumb segments (labels only — clicks wired in UI via store). */
export function resolveStageSegments(input: StageContextInput): StageSegment[] {
  const segments: StageSegment[] = [];

  if (input.project) {
    segments.push({
      id: "project",
      label: input.project.name,
      icon: projectIcon(input.project.source),
    });
  }

  const surface = normalizeToWorkSurface(input.canvasMode);
  const planTaskId = input.activePlanTaskId ?? input.highlightPlanTaskId;
  const planTask = taskById(input.plan, planTaskId);

  if (input.canvasMode === "run" && planTask) {
    segments.push({
      id: "surface-campaign-plan",
      label: WORK_SURFACE_META["campaign-plan"].label,
      shortLabel: WORK_SURFACE_META["campaign-plan"].shortLabel,
      icon: ListTodo,
    });
    segments.push({
      id: `task-${planTask.id}`,
      label: `Day ${planTask.day} · ${planTask.title}`,
    });
    return segments.slice(0, 4);
  }

  if (input.canvasMode === "browser" || (input.browserRunning && input.canvasMode === "run")) {
    segments.push({
      id: "surface-research-map",
      label: WORK_SURFACE_META["research-map"].label,
      shortLabel: "Research",
      icon: Search,
    });
    segments.push({ id: "browser", label: "Browser", icon: Play });
    return segments.slice(0, 4);
  }

  if (surface) {
    const sm = WORK_SURFACE_META[surface];
    segments.push({
      id: `surface-${surface}`,
      label: sm.label,
      shortLabel: sm.shortLabel,
      icon: surface === "marketing-diff" || surface === "content-set" ? Layers : ListTodo,
    });

    if (surface === "marketing-diff" && input.activeAssetId) {
      const name = assetLabel(input.threadAssets, input.activeAssetId);
      if (name) segments.push({ id: `asset-${input.activeAssetId}`, label: name });
    }

    if (surface === "campaign-plan" && input.activePlaybookId && input.plan) {
      const suite = normalizePlan(input.plan);
      const pb = suite ? getPlaybook(suite, input.activePlaybookId) : null;
      if (pb) segments.push({ id: `playbook-${pb.id}`, label: pb.title });
    }

    if (surface === "campaign-plan" && input.highlightPlanTaskId) {
      const t = taskById(input.plan, input.highlightPlanTaskId);
      if (t) segments.push({ id: `task-${t.id}`, label: `Day ${t.day} · ${t.title}` });
    }

    if (surface === "experiment" && input.experimentId && input.planProgress) {
      segments.push({ id: `exp-${input.experimentId}`, label: "Experiment detail" });
    }

    return segments.slice(0, 4);
  }

  if (input.canvasMode === "run") {
    segments.push({ id: "run", label: "Agent run", icon: Play });
    if (input.runGoal) {
      const short = input.runGoal.length > 48 ? `${input.runGoal.slice(0, 48)}…` : input.runGoal;
      segments.push({ id: "run-goal", label: short });
    }
    return segments.slice(0, 4);
  }

  if (input.canvasMode === "preview") {
    segments.push({ id: "preview", label: "Preview" });
  } else if (input.canvasMode === "taskgraph") {
    segments.push({ id: "taskgraph", label: "Steps" });
  } else if (input.canvasMode === "file") {
    segments.push({ id: "file", label: "File preview" });
  } else if (input.canvasMode === "empty") {
    segments.push({ id: "empty", label: "Choose work" });
  }

  return segments.slice(0, 4);
}

/** Last segment label for conversation chips. */
export function currentStageLabel(segments: StageSegment[]): string | null {
  return segments[segments.length - 1]?.label ?? null;
}

export function segmentTargetSurface(segmentId: string): WorkSurface | null {
  if (segmentId.startsWith("surface-")) {
    return segmentId.replace("surface-", "") as WorkSurface;
  }
  if (segmentId === "surface-campaign-plan") return "campaign-plan";
  if (segmentId === "surface-research-map") return "research-map";
  return null;
}

export function planTaskStatusLabel(
  snapshot: PlanProgressSnapshot | null,
  taskId: string,
): string {
  return taskStatusFromSnapshot(snapshot, taskId);
}
