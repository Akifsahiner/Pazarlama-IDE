import type { WorkSurface } from "./workSurfaces";
import { WORK_SURFACE_META } from "./workSurfaces";

export type SurfaceUnlockAction =
  | "generate_plan"
  | "preview_plan"
  | "open_plan"
  | "browser_research"
  | "draft_copy"
  | "log_kpi"
  | "connect_ga4"
  | "run_agent";

export interface SurfaceUnlockGuide {
  surface: WorkSurface;
  label: string;
  shortLabel: string;
  unlockTitle: string;
  unlockReason: string;
  steps: string[];
  primaryLabel: string;
  primaryAction: SurfaceUnlockAction;
  secondaryLabel?: string;
  secondaryAction?: SurfaceUnlockAction;
}

export const SURFACE_UNLOCK: Record<WorkSurface, SurfaceUnlockGuide> = {
  "campaign-plan": {
    surface: "campaign-plan",
    label: WORK_SURFACE_META["campaign-plan"].label,
    shortLabel: WORK_SURFACE_META["campaign-plan"].shortLabel,
    unlockTitle: "Launch plan",
    unlockReason: "Your 30-day playbook lives here — tasks, readiness, and execution.",
    steps: [
      "Generate a plan (or preview an offline outline from your scan)",
      "Open a playbook and run Day 1",
      "Track progress in the timeline",
    ],
    primaryLabel: "Generate plan",
    primaryAction: "generate_plan",
    secondaryLabel: "Preview outline",
    secondaryAction: "preview_plan",
  },
  funnel: {
    surface: "funnel",
    label: WORK_SURFACE_META.funnel.label,
    shortLabel: WORK_SURFACE_META.funnel.shortLabel,
    unlockTitle: "Funnel map",
    unlockReason: "Maps plan tasks and content across awareness → retention.",
    steps: [
      "Create a launch plan first",
      "Tasks auto-map to funnel stages",
      "Spot empty stages and bottlenecks",
    ],
    primaryLabel: "Generate plan",
    primaryAction: "generate_plan",
    secondaryLabel: "Preview outline",
    secondaryAction: "preview_plan",
  },
  "research-map": {
    surface: "research-map",
    label: WORK_SURFACE_META["research-map"].label,
    shortLabel: WORK_SURFACE_META["research-map"].shortLabel,
    unlockTitle: "Research map",
    unlockReason: "Clusters competitor intel and browser evidence by theme.",
    steps: [
      "Run a browser research task (e.g. scan competitors)",
      "Findings appear grouped by theme",
      "Use evidence in plan tasks and copy drafts",
    ],
    primaryLabel: "Research competitors",
    primaryAction: "browser_research",
  },
  "content-set": {
    surface: "content-set",
    label: WORK_SURFACE_META["content-set"].label,
    shortLabel: WORK_SURFACE_META["content-set"].shortLabel,
    unlockTitle: "Content set",
    unlockReason: "Review grid for posts, emails, ads, and landing copy.",
    steps: [
      "Ask the agent to draft copy in the composer",
      "Or generate a plan with a content calendar",
      "Open items here for review and apply",
    ],
    primaryLabel: "Draft landing copy",
    primaryAction: "draft_copy",
    secondaryLabel: "Generate plan",
    secondaryAction: "generate_plan",
  },
  "ad-preview": {
    surface: "ad-preview",
    label: WORK_SURFACE_META["ad-preview"].label,
    shortLabel: WORK_SURFACE_META["ad-preview"].shortLabel,
    unlockTitle: "Ad preview",
    unlockReason: "Meta and Search mocks from your draft creatives.",
    steps: [
      "Ask the agent for ad or social post copy",
      "Assets land in Content set and here",
      "Export or copy when ready — you publish",
    ],
    primaryLabel: "Draft ad copy",
    primaryAction: "draft_copy",
  },
  performance: {
    surface: "performance",
    label: WORK_SURFACE_META.performance.label,
    shortLabel: WORK_SURFACE_META.performance.shortLabel,
    unlockTitle: "Performance",
    unlockReason: "Targets vs actuals from manual KPIs, experiments, and GA4.",
    steps: [
      "Log KPIs in Plan Studio after tasks",
      "Record experiment outcomes",
      "Optional: connect GA4 in Settings",
    ],
    primaryLabel: "Open plan KPIs",
    primaryAction: "open_plan",
    secondaryLabel: "Connect GA4",
    secondaryAction: "connect_ga4",
  },
  experiment: {
    surface: "experiment",
    label: WORK_SURFACE_META.experiment.label,
    shortLabel: WORK_SURFACE_META.experiment.shortLabel,
    unlockTitle: "Experiments",
    unlockReason: "Hypothesis → outcome learnings on your marketing profile.",
    steps: [
      "Run a plan task or agent decision",
      "Brain records experiments automatically",
      "Mark outcomes to build your learning loop",
    ],
    primaryLabel: "Start a plan task",
    primaryAction: "open_plan",
  },
  "marketing-diff": {
    surface: "marketing-diff",
    label: WORK_SURFACE_META["marketing-diff"].label,
    shortLabel: WORK_SURFACE_META["marketing-diff"].shortLabel,
    unlockTitle: "Marketing diff",
    unlockReason: "Side-by-side review before applying copy to files.",
    steps: [
      "Agent proposes an asset in chat",
      "Review changes here",
      "Apply to project or copy to clipboard",
    ],
    primaryLabel: "Draft copy",
    primaryAction: "draft_copy",
  },
};

export function surfaceUnlockHint(surface: WorkSurface): string {
  return SURFACE_UNLOCK[surface].unlockReason;
}

export function lockedSurfaceCount(
  availability: Record<WorkSurface, boolean>,
): WorkSurface[] {
  return (Object.keys(SURFACE_UNLOCK) as WorkSurface[]).filter((s) => !availability[s]);
}
