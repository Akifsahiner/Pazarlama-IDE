/** User-facing active work surfaces in the center stage (marketing IDE). */
export type WorkSurface =
  | "research-map"
  | "campaign-plan"
  | "funnel"
  | "content-set"
  | "ad-preview"
  | "performance"
  | "experiment"
  | "marketing-diff";

/** All canvas mode strings (execution + work surfaces + legacy). */
export type CanvasMode =
  | "empty"
  | "plan"
  | "diff"
  | "browser"
  | "assets"
  | "file"
  | "run"
  | "preview"
  | "taskgraph"
  | WorkSurface;

export const WORK_SURFACES: WorkSurface[] = [
  "research-map",
  "campaign-plan",
  "funnel",
  "content-set",
  "ad-preview",
  "performance",
  "experiment",
  "marketing-diff",
];

export interface WorkSurfaceMeta {
  id: WorkSurface;
  label: string;
  shortLabel: string;
  description: string;
}

export const WORK_SURFACE_META: Record<WorkSurface, WorkSurfaceMeta> = {
  "research-map": {
    id: "research-map",
    label: "Research map",
    shortLabel: "Research",
    description: "Competitors, browser findings, and evidence clustered by theme.",
  },
  "campaign-plan": {
    id: "campaign-plan",
    label: "Campaign plan",
    shortLabel: "Plan",
    description: "30-day plan reference with runnable tasks — backstage during Week 1.",
  },
  funnel: {
    id: "funnel",
    label: "Funnel",
    shortLabel: "Funnel",
    description: "Awareness to conversion mapped to your plan and channels.",
  },
  "content-set": {
    id: "content-set",
    label: "Content set",
    shortLabel: "Content",
    description: "Calendar items and generated copy in one review grid.",
  },
  "ad-preview": {
    id: "ad-preview",
    label: "Ad preview",
    shortLabel: "Ads",
    description: "Meta and search ad mockups from your draft creatives.",
  },
  performance: {
    id: "performance",
    label: "Performance",
    shortLabel: "Metrics",
    description: "Targets vs actuals across experiments and plan metrics.",
  },
  experiment: {
    id: "experiment",
    label: "Experiment result",
    shortLabel: "Experiment",
    description: "Hypothesis, outcome, and learnings from a single test.",
  },
  "marketing-diff": {
    id: "marketing-diff",
    label: "Marketing diff",
    shortLabel: "Diff",
    description: "Before/after review for landing copy and site changes.",
  },
};

/** Legacy canvas modes → canonical work surface. */
export function normalizeToWorkSurface(mode: CanvasMode): WorkSurface | null {
  switch (mode) {
    case "plan":
      return "campaign-plan";
    case "diff":
      return "marketing-diff";
    case "assets":
      return "content-set";
    case "research-map":
    case "campaign-plan":
    case "funnel":
    case "content-set":
    case "ad-preview":
    case "performance":
    case "experiment":
    case "marketing-diff":
      return mode;
    default:
      return null;
  }
}

export function workSurfaceToCanvasMode(surface: WorkSurface): CanvasMode {
  return surface;
}

export function normalizeCanvasMode(mode: CanvasMode): CanvasMode {
  const ws = normalizeToWorkSurface(mode);
  return ws ?? mode;
}

export const EXECUTION_CANVAS_MODES: CanvasMode[] = ["run", "preview", "taskgraph", "browser"];

export function isExecutionCanvasMode(mode: CanvasMode): boolean {
  return EXECUTION_CANVAS_MODES.includes(mode);
}

export function isWorkSurfaceMode(mode: CanvasMode): boolean {
  return normalizeToWorkSurface(mode) !== null;
}
