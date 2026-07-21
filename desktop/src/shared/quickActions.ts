/** Composer motor modes — user-facing labels live in Composer.tsx. */
export type ComposerMode = "ask" | "edit" | "browse" | "auto";

export type QuickActionCanvas = "run" | "browser" | "plan";

export type QuickActionId =
  | "launch"
  | "scan"
  | "plan"
  | "landing_copy"
  | "competitors"
  | "icp"
  | "leads"
  | "outreach";

export type QuickActionRequires = "connected" | "folder" | "folder+connected";

export interface QuickActionDef {
  id: QuickActionId;
  mode: ComposerMode | "plan";
  draft: string;
  canvas?: QuickActionCanvas;
  requires?: QuickActionRequires;
  disabledReason?: string;
}

export const QUICK_ACTION_GOALS = {
  LAUNCH:
    "Prepare this project for launch. First understand the product (read package.json, README and the main pages). Then audit the landing/home page for conversion and propose specific copy/CTA edits as file changes. Finally produce a concise launch plan and Product Hunt assets. Use your marketing skills. Do not publish or send anything — drafts only.",
  SCAN:
    "Scan this project: read package.json, README and the main pages, then produce a concise product summary (what it does, who it's for, the core value) for marketing.",
  ICP:
    "Define the Ideal Customer Profile (ICP) for this product: firmographics, the buyer persona/role, and the 'why now' trigger signals. Ground it in the product profile. Use the lead-research skill's qualification rules. Do not contact anyone.",
  LEADS_BROWSER:
    "Research up to 20 ICP-matching leads on the web. For each, attach a source URL, a fit rationale, and a 'why now' signal. Verify from a real source. Use the lead-research skill. Never contact anyone — research only.",
  OUTREACH:
    "Draft personalized first-touch and two follow-up messages for the researched leads, each citing the specific evidence used. Use the outreach-drafting skill. Drafts only — never send or schedule anything.",
  LANDING_COPY: "Write landing page copy for this product.",
  COMPETITORS: "Research 5 competitors and summarize their positioning",
} as const;

export const COMPOSER_HINTS: Record<ComposerMode, string> = {
  auto: "Type naturally — we pick Ask, Edit, or Browse and show a preview before you send.",
  ask: "Strategic answers, copy drafts, and decisions — no file edits.",
  edit: "Runs the local agent on your project — edits files, preview, and validate.",
  browse: "Live browser research — competitors, leads, and verification.",
};

export const COMPOSER_PLACEHOLDERS: Record<ComposerMode, { connected: string; offline: string }> = {
  auto: {
    connected: "Bu execution'ı yönlendir — diff, kanıt ve sonuç Record'da…",
    offline: "Enable AI to chat and run tasks…",
  },
  ask: {
    connected: "Ask for a plan, copy, or marketing decision…",
    offline: "Enable AI to chat with the agent…",
  },
  edit: {
    connected: "Describe what to change in your project…",
    offline: "Enable AI to run the agent…",
  },
  browse: {
    connected: "Describe a browser research task…",
    offline: "Enable AI for live browser tasks…",
  },
};

/** Default composer mode for new sessions (Faz 5). */
export const DEFAULT_COMPOSER_MODE: ComposerMode = "auto";

const QUICK_ACTIONS: Record<QuickActionId, QuickActionDef> = {
  launch: {
    id: "launch",
    mode: "edit",
    draft: QUICK_ACTION_GOALS.LAUNCH,
    canvas: "run",
    requires: "folder+connected",
    disabledReason: "Open a local folder and connect a backend to run the agent.",
  },
  scan: {
    id: "scan",
    mode: "edit",
    draft: QUICK_ACTION_GOALS.SCAN,
    canvas: "run",
    requires: "folder+connected",
    disabledReason: "Open a local folder and connect a backend to run the agent.",
  },
  plan: {
    id: "plan",
    mode: "plan",
    draft: "",
    canvas: "plan",
    requires: "connected",
    disabledReason: "Enable AI to generate a plan.",
  },
  landing_copy: {
    id: "landing_copy",
    mode: "auto",
    draft: QUICK_ACTION_GOALS.LANDING_COPY,
    requires: "connected",
    disabledReason: "Enable AI first.",
  },
  competitors: {
    id: "competitors",
    mode: "browse",
    draft: QUICK_ACTION_GOALS.COMPETITORS,
    canvas: "browser",
    requires: "connected",
    disabledReason: "Enable AI for live browser research.",
  },
  icp: {
    id: "icp",
    mode: "edit",
    draft: QUICK_ACTION_GOALS.ICP,
    canvas: "run",
    requires: "folder",
    disabledReason: "Open a local folder to edit project files.",
  },
  leads: {
    id: "leads",
    mode: "browse",
    draft: QUICK_ACTION_GOALS.LEADS_BROWSER,
    canvas: "browser",
    requires: "connected",
    disabledReason: "Enable AI for live browser research.",
  },
  outreach: {
    id: "outreach",
    mode: "ask",
    draft: QUICK_ACTION_GOALS.OUTREACH,
    requires: "connected",
    disabledReason: "Enable AI first.",
  },
};

export function resolveQuickAction(id: QuickActionId): QuickActionDef {
  return QUICK_ACTIONS[id];
}

/** Whether a quick action is blocked for the current project/connection state. */
export function isQuickActionDisabled(
  action: QuickActionDef,
  opts: { connected: boolean; hasFolder: boolean },
): string | null {
  if (action.requires === "connected" && !opts.connected) {
    return action.disabledReason ?? "Enable AI first.";
  }
  if (action.requires === "folder" && !opts.hasFolder) {
    return action.disabledReason ?? "Open a local folder to edit project files.";
  }
  if (action.requires === "folder+connected") {
    if (!opts.hasFolder) return "Open a local folder to edit project files.";
    if (!opts.connected) return "Enable AI to run the agent.";
  }
  return null;
}

/** Registry-driven composer quick-action UI (primary pills + More menu). */
export const COMPOSER_QUICK_UI: {
  id: QuickActionId | "plan_pill";
  label: string;
  tier: "primary" | "more";
  icon: string;
}[] = [
  { id: "plan_pill", label: "Generate plan", tier: "primary", icon: "Wand2" },
  { id: "landing_copy", label: "Landing copy", tier: "primary", icon: "PenLine" },
  { id: "competitors", label: "Live research", tier: "primary", icon: "Compass" },
  { id: "launch", label: "Prepare for launch", tier: "more", icon: "Rocket" },
  { id: "scan", label: "Scan & summarize product", tier: "more", icon: "Search" },
  { id: "icp", label: "Build my ICP", tier: "more", icon: "Target" },
  { id: "leads", label: "Research leads", tier: "more", icon: "Search" },
  { id: "outreach", label: "Draft outreach (you send)", tier: "more", icon: "Mail" },
];
