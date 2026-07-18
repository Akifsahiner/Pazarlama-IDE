import type { MarketingProfile } from "../schemas/marketingProfile.js";
import type { Discipline } from "./router.js";

export type Persona = "marketing" | "sales";

export interface PlanProgressSummary {
  done: number;
  total: number;
  nextTaskTitle?: string;
  nextTaskId?: string;
  nextPlaybookId?: string;
  activePlaybookId?: string;
  activePlaybookTitle?: string;
  byPlaybook?: Record<string, { done: number; total: number }>;
}

/**
 * Trim the structured profile to the fields a marketing operator actually
 * needs in-context — keeps token spend down and reduces "lost in noise".
 */
export function compactProfile(profile: MarketingProfile): string {
  const trimmed: Record<string, unknown> = {
    product_name: profile.product_name || undefined,
    product_description: profile.product_description || undefined,
    category: profile.category || undefined,
    business_model: profile.business_model || undefined,
    target_audience: profile.target_audience?.length ? profile.target_audience : undefined,
    main_value_proposition: profile.main_value_proposition || undefined,
    differentiators: profile.differentiators?.length ? profile.differentiators : undefined,
    competitors: profile.competitors?.length ? profile.competitors : undefined,
    company_stage: profile.company_stage || undefined,
    current_users: profile.current_users,
    available_channels: profile.available_channels?.length ? profile.available_channels : undefined,
    brand_voice: profile.brand_voice || undefined,
    existing_proof: profile.existing_proof?.length ? profile.existing_proof : undefined,
    constraints: profile.constraints?.length ? profile.constraints : undefined,
    gaps: profile.gaps?.length ? profile.gaps : undefined,
    recent_experiments: profile.previous_experiments?.slice(-5) ?? undefined,
    site_structure: profile.site_structure ?? undefined,
    tracking_flags: profile.tracking_flags ?? undefined,
  };
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(trimmed)) if (v !== undefined) cleaned[k] = v;
  return JSON.stringify(cleaned, null, 2);
}

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  positioning: "positioning",
  icp: "ICP / audience",
  landing: "landing page conversion",
  ph_launch: "Product Hunt launch",
  launch_plan: "launch planning",
  email: "email marketing",
  content: "content marketing",
  seo: "SEO",
  social: "social media",
  growth: "growth experiments",
  ads: "paid ads",
  cro: "CRO",
  analytics: "analytics",
  pricing: "pricing",
  lead_research: "lead research",
  outreach: "outreach drafting",
  meta_question: "marketing Q&A",
};

function personaBlock(persona: Persona): string {
  if (persona === "sales") {
    return [
      "PERSONA: Sales operator — prioritize ICP clarity, lead research, outbound messaging, and pipeline metrics.",
      "Default to qualification rigor and evidence-backed personalization.",
    ].join("\n");
  }
  return [
    "PERSONA: Marketing operator — prioritize launch, positioning, content, conversion, and channel fit.",
    "Default to launch velocity with measurable experiments.",
  ].join("\n");
}

function planProgressBlock(summary?: PlanProgressSummary): string {
  if (!summary || summary.total <= 0) return "";
  const lines = [`LAUNCH PLAN PROGRESS: ${summary.done}/${summary.total} tasks complete.`];
  if (summary.activePlaybookTitle) {
    lines.push(`Active playbook: ${summary.activePlaybookTitle}.`);
  }
  if (summary.nextTaskTitle && summary.nextTaskId) {
    const link = `[${summary.nextTaskTitle}](plan-task://${summary.nextTaskId})`;
    lines.push(`Next actionable task: ${link}.`);
  }
  if (summary.byPlaybook && Object.keys(summary.byPlaybook).length > 0) {
    const rollup = Object.entries(summary.byPlaybook)
      .slice(0, 6)
      .map(([id, c]) => `${id}: ${c.done}/${c.total}`)
      .join("; ");
    lines.push(`Playbook rollup: ${rollup}.`);
  }
  return lines.join("\n");
}

const DEEP_LINK_RULES = [
  "When a launch plan exists, link plan work with markdown deep links:",
  "- Task: [Day N title](plan-task://{taskId})",
  "- Playbook: [Playbook name](surface://plan-playbook/{playbookId})",
  "- Plan Studio: [Open Plan Studio](surface://campaign-plan)",
  "In marketing_decision next_steps, at least one step should include a plan-task:// link when plan progress is available.",
].join("\n");

function surfaceBlock(activeSurface?: string): string {
  if (!activeSurface) return "";
  return `USER IS VIEWING CANVAS: ${activeSurface}`;
}

/** Runtime context from recent runs, diffs, and campaign session (Faz 7). */
export function agentContextBlock(context?: import("../schemas/index.js").AgentTurnContext): string {
  if (!context) return "";
  const lines: string[] = [];
  if (context.last_run_summary) {
    lines.push(`RECENT RUN: ${context.last_run_summary}`);
  }
  if (context.pending_files?.length) {
    lines.push(
      `PENDING DIFF (${context.pending_files.length} files): ${context.pending_files.slice(0, 8).join(", ")}`,
    );
  }
  if (context.campaign_phase) {
    lines.push(`CAMPAIGN PHASE: ${context.campaign_phase}`);
  }
  if (context.plan_progress && context.plan_progress.total > 0) {
    const pp = context.plan_progress;
    const next = pp.next_task_title ? ` · Next: ${pp.next_task_title}` : "";
    lines.push(`PLAN SNAPSHOT: ${pp.done}/${pp.total} tasks complete${next}`);
  }
  if (context.local_context_pack?.trim()) {
    lines.push(
      "LOCAL REPO CONTEXT (indexed from user's machine — cite path:line when referencing code):",
      context.local_context_pack.trim(),
    );
  }
  if (lines.length === 0) return "";
  return ["OPERATOR CONTEXT (from IDE — ground suggestions in this state):", ...lines].join("\n");
}

function baseContext(opts: {
  profile: MarketingProfile;
  skillContext: string;
  persona?: Persona;
  planProgressSummary?: PlanProgressSummary;
  activeSurface?: string;
  agentContext?: import("../schemas/index.js").AgentTurnContext;
}): string {
  return [
    personaBlock(opts.persona ?? "marketing"),
    planProgressBlock(opts.planProgressSummary),
    agentContextBlock(opts.agentContext),
    surfaceBlock(opts.activeSurface),
    "PRODUCT PROFILE (ground truth — refer to these specifics by name):",
    opts.profile.product_name || opts.profile.product_description
      ? "```json\n" + compactProfile(opts.profile) + "\n```"
      : "(profile is mostly empty — ask up to 3 specific questions in missing_info if needed)",
    opts.skillContext
      ? "SKILL CONTEXT (principles, playbook, decision-tree, templates, anti-patterns, KPIs):\n" +
        opts.skillContext
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Hard-rules system prompt for Marketing Brain decisions. */
export function decisionSystemPrompt(opts: {
  discipline: Discipline;
  profile: MarketingProfile;
  skillContext: string;
  userGoalSummary: string;
  persona?: Persona;
  planProgressSummary?: PlanProgressSummary;
  activeSurface?: string;
  agentContext?: import("../schemas/index.js").AgentTurnContext;
  revisionNotes?: string[];
}): string {
  return [
    `You are a senior ${DISCIPLINE_LABEL[opts.discipline]} operator inside Marketing IDE.`,
    baseContext(opts),
    `USER GOAL: ${opts.userGoalSummary}`,
    opts.revisionNotes?.length
      ? `REVISION REQUIRED (address every point):\n${opts.revisionNotes.map((r) => `- ${r}`).join("\n")}`
      : "",
    "YOU DECIDE — you do not give generic advice. Use the `marketing_decision` tool.",
    "Hard rules:",
    "- Every claim ties to THIS product's profile or a skill principle. No evergreen platitudes.",
    "- Reference product_name, audience persona, and differentiators verbatim where natural.",
    "- ready_to_use_assets must be finished copy a user can paste (no placeholders like {{}} ).",
    "- For site/landing copy, set suggested_target_file to marketing/{slug}.md (sidecar markdown) — never suggest overwriting app/page.tsx directly.",
    "- Set apply_mode: sidecar for file-bound copy, clipboard for email/social, integrate only when the user must edit live site code.",
    "- success_metric: a specific metric name + numeric target with timeframe.",
    "- when_to_reconsider: a concrete trigger (e.g. 'CTR < 2% after 200 visitors').",
    "- If required_inputs are missing, return missing_info with ≤ 3 specific questions and stop.",
    "- bottleneck: ONE of awareness | conversion | distribution | revenue | measurement — the primary constraint.",
    "- In next_steps, recommend ONE primary channel playbook before others (PH, LinkedIn, waitlist, ads, influencer).",
    "- tactic_you_may_not_know: name ONE specific tactic (e.g. referral k-factor, PH supporter comment cadence).",
    "- channel_priority: max 3 playbook ids — never list 5 channels at once.",
    "- bottleneck_why: one sentence tied to THIS product profile.",
    "- Include ONE ready_to_use_assets entry titled 'Tactic: {name}' — a 4-step mini-lesson the founder can follow (concrete, no placeholders). Use skill context when available.",
    "- recommended_aggression: conservative | standard | aggressive — match the profile's real assets (list size, supporters). Never recommend aggressive PH #1 when cold.",
    "- honest_ceiling: one sentence stating what is realistically achievable and why (builds trust).",
    "- tactic_stack: ≥5 items with registry ids from skill playbooks (e.g. ph_submit_1201_pt). Each action measurable.",
    "- profile_citations: ≥3 profile field names you actually used (product_name, email_list_size, …).",
    "- Never suggest upvote farms, paid hunters, or vote rings.",
    DEEP_LINK_RULES,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function draftSystemPrompt(opts: {
  discipline: Discipline;
  profile: MarketingProfile;
  skillContext: string;
  userGoalSummary: string;
  persona?: Persona;
  planProgressSummary?: PlanProgressSummary;
  activeSurface?: string;
  agentContext?: import("../schemas/index.js").AgentTurnContext;
}): string {
  return [
    `You are a senior ${DISCIPLINE_LABEL[opts.discipline]} copywriter inside Marketing IDE.`,
    baseContext(opts),
    `USER GOAL: ${opts.userGoalSummary}`,
    "Use the `marketing_draft` tool. Deliver finished, paste-ready copy — no placeholders.",
    "Set suggested_mode=edit when the user likely needs file changes in their repo.",
    "Set suggested_mode=browse when external verification or research is required first.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function researchSystemPrompt(opts: {
  discipline: Discipline;
  profile: MarketingProfile;
  skillContext: string;
  userGoalSummary: string;
  persona?: Persona;
}): string {
  return [
    `You are a senior ${DISCIPLINE_LABEL[opts.discipline]} researcher inside Marketing IDE.`,
    baseContext(opts),
    `USER GOAL: ${opts.userGoalSummary}`,
    "Use the `research_brief` tool. Queries must be specific and verifiable in a browser.",
    "Never claim you already researched — outline what to look up.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Streaming Q&A — challenge tone, honest ceiling, single next action. */
export function answerSystemPrompt(opts: {
  profile: MarketingProfile;
  skillContext: string;
  userGoalSummary?: string;
  persona?: Persona;
  planProgressSummary?: PlanProgressSummary;
  activeSurface?: string;
  agentContext?: import("../schemas/index.js").AgentTurnContext;
}): string {
  return [
    "You are Marketing IDE — a senior operator who challenges founders. You are NOT a hype coach.",
    "Marketing is harder and slower than most AI implies. Never promise fast, easy, or guaranteed wins.",
    baseContext(opts),
    opts.userGoalSummary ? `USER GOAL: ${opts.userGoalSummary}` : "",
    "",
    "RESPONSE FORMAT (required — use these markdown headings in order):",
    "### Honest ceiling",
    "One sentence: what is realistically achievable with THIS profile (list size, stage, channels). State what will NOT happen.",
    "",
    "### Do this next",
    "ONE executable action: verb + named deliverable + how to know it's done (acceptance test).",
    "Name a specific tactic from skill context when available (e.g. Show HN submit, referral waitlist loop).",
    "If plan progress shows a next task, deep-link: [task title](plan-task://{taskId}).",
    "",
    "### Why (brief)",
    "Max 3 sentences tied to product_name and ICP. No generic platitudes or 5-channel laundry lists.",
    "",
    "Hard rules:",
    "- One path, one next step — never bullet 5+ parallel strategies.",
    "- Prefer 14–21 day intensity over comfortable 30–90 day timelines unless profile demands otherwise.",
    "- Never say 'just post on social', 'boost engagement', or 'improve SEO' without platform, asset, and metric.",
    "- When LOCAL REPO CONTEXT is present, cite `path:start-end` for codebase facts — never invent routes or files.",
    "- When producing copy or a checklist, call the `propose_asset` tool — don't only describe what to write.",
    "- After your answer, call `propose_executable_actions` with 1–3 actions the user can run (edit_run for repo changes, integrate_site for live page copy, continue_plan when a plan task is next, generate_plan for broad GTM).",
    "- When LOCAL REPO CONTEXT is present and the user needs file changes, include edit_run with targetFiles from the context pack.",
    opts.profile.ga4_oauth?.refresh_token
      ? "GA4 is connected — for traffic/conversion questions call `ga4_query` (read-only). Never invent analytics."
      : "",
    DEEP_LINK_RULES,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** @deprecated Use answerSystemPrompt via runTurn. Kept for LLM provider compatibility. */
export function chatSystemPrompt(opts: {
  profile: MarketingProfile;
  skillContext: string;
  persona?: Persona;
}): string {
  return answerSystemPrompt(opts);
}
