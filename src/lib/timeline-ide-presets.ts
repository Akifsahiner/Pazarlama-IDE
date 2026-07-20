import { sections } from "@/lib/tokens";
import { HERO_DEMO_WEEKS_INITIAL, HERO_DEMO_WEEKS_APPROVED } from "@/lib/hero-ide-demo";

export type TimelinePresetId =
  | "connect"
  | "open"
  | "understand"
  | "gaps"
  | "plan"
  | "approve"
  | "shipped";

export type TimelinePresetMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
};

export type TimelinePresetView = "plan" | "snapshot" | "readiness";

export type TimelinePreset = {
  id: TimelinePresetId;
  view: TimelinePresetView;
  explorerHighlight: string | null;
  messages: TimelinePresetMessage[];
  weekProgress: readonly number[];
  activeTaskIndex: number;
  statusText: string;
  activityLines: readonly string[];
  statusTone: "idle" | "working" | "success" | "waiting";
};

const { snapshot, readiness } = sections.workspace;

export const TIMELINE_PRESET_IDS: TimelinePresetId[] = [
  "connect",
  "open",
  "understand",
  "gaps",
  "plan",
  "approve",
  "shipped",
];

export const timelinePresets: Record<TimelinePresetId, TimelinePreset> = {
  connect: {
    id: "connect",
    view: "plan",
    explorerHighlight: null,
    messages: [
      {
        id: "c1",
        role: "agent",
        text: "Start the local AI stack or sign in — preview mode works offline too.",
      },
    ],
    weekProgress: [0, 0, 0, 0],
    activeTaskIndex: -1,
    statusText: "Connecting…",
    activityLines: ["Stack ready in 90s"],
    statusTone: "working",
  },
  open: {
    id: "open",
    view: "plan",
    explorerHighlight: "Launch plan",
    messages: [
      {
        id: "o1",
        role: "user",
        text: "Open my project folder — same repo I built in Cursor.",
      },
      {
        id: "o2",
        role: "agent",
        text: "847 files indexed. Secrets in .env are never read.",
      },
    ],
    weekProgress: [5, 0, 0, 0],
    activeTaskIndex: 0,
    statusText: "Indexing project",
    activityLines: ["847 files indexed", "Local-first"],
    statusTone: "working",
  },
  understand: {
    id: "understand",
    view: "snapshot",
    explorerHighlight: "Product brief",
    messages: [
      {
        id: "u1",
        role: "agent",
        text: "Product understood — B2B SaaS, Next.js, agencies and founders.",
      },
    ],
    weekProgress: [15, 5, 0, 0],
    activeTaskIndex: 0,
    statusText: "Building product model",
    activityLines: ["847 files scanned", "8 competitors compared"],
    statusTone: "working",
  },
  gaps: {
    id: "gaps",
    view: "readiness",
    explorerHighlight: "Launch plan",
    messages: [
      {
        id: "g1",
        role: "agent",
        text: "4 positioning gaps detected. Conversion tracking is the main blocker.",
      },
    ],
    weekProgress: [20, 8, 0, 0],
    activeTaskIndex: 1,
    statusText: "Gap analysis complete",
    activityLines: ["Readiness score computed", "4 gaps detected"],
    statusTone: "waiting",
  },
  plan: {
    id: "plan",
    view: "plan",
    explorerHighlight: "Launch plan",
    messages: [
      {
        id: "p1",
        role: "user",
        text: "Launch on Product Hunt in two weeks. Budget $1,000.",
      },
      {
        id: "p2",
        role: "agent",
        text: "30-day task graph ready — Day 1 task queued.",
      },
    ],
    weekProgress: [...HERO_DEMO_WEEKS_INITIAL],
    activeTaskIndex: -1,
    statusText: "Waiting for approval",
    activityLines: ["30-day graph generated", "Day 1 task ready"],
    statusTone: "waiting",
  },
  approve: {
    id: "approve",
    view: "plan",
    explorerHighlight: "Launch plan",
    messages: [
      {
        id: "a1",
        role: "agent",
        text: "First task: landing hero diff ready. Preview before apply.",
      },
    ],
    weekProgress: [...HERO_DEMO_WEEKS_INITIAL],
    activeTaskIndex: 2,
    statusText: "Waiting for approval",
    activityLines: ["Diff preview ready", "Live preview open"],
    statusTone: "waiting",
  },
  shipped: {
    id: "shipped",
    view: "plan",
    explorerHighlight: "Launch plan",
    messages: [
      {
        id: "s1",
        role: "agent",
        text: "Landing patch applied on branch launch/week-1. Roll back anytime.",
      },
    ],
    weekProgress: [...HERO_DEMO_WEEKS_APPROVED],
    activeTaskIndex: 2,
    statusText: "Executing Week 1 · 3 tasks in progress",
    activityLines: ["Branch created", "Live preview verified"],
    statusTone: "success",
  },
};

export const workbenchPresetIds: TimelinePresetId[] = [
  "open",
  "understand",
  "gaps",
  "plan",
  "approve",
  "shipped",
  "shipped",
];

export function presetByTimelineIndex(index: number): TimelinePreset {
  const id = TIMELINE_PRESET_IDS[Math.min(index, TIMELINE_PRESET_IDS.length - 1)] ?? "connect";
  return timelinePresets[id];
}

export function snapshotRows() {
  return [
    ["Product type", snapshot.productType],
    ["Framework", snapshot.framework],
    ["Core action", snapshot.coreAction],
    ["Audience", snapshot.audience],
  ] as const;
}

export { readiness };
