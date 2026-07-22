/**
 * P19 — Marketing Task Contract Engine (Part 8).
 * Canonical 14-field ops task contract. See CMO_TASK_CONTRACT_SPEC.md
 */
import type { ChannelThesisId, CmoTaskOwner, CmoWeek1Priority } from "./cmoIntake";
import type { CmoOpsDaySlot, CmoOpsTask } from "./cmoOpsCadence";
import type { GrowthMechanismId } from "./cmoGrowthMechanismKnowledge";
import { getMechanismRecord } from "./cmoGrowthMechanismKnowledge";
import type { ExpectedProofKind } from "./opsExecutionPlan";
import type { HumanExecutionRef } from "./humanExecutionPlan";
import type { HumanExecutionAsset } from "./humanExecutionAsset";
import type { OpsExecutionPlan } from "./opsExecutionPlan";

export type MarketingExecutionMode =
  | "repo_edit"
  | "browser_research"
  | "content_draft"
  | "scout_then_edit"
  | "human_post"
  | "human_outreach"
  | "human_launch"
  | "human_log"
  | "delegate_rubric"
  | "delegate_brief"
  | "export_csv"
  | "measurement_sync"
  | "product_request"
  | "week_review";

export interface MarketingTaskMetric {
  id: string;
  name: string;
  target?: number;
  unit?: string;
  measurable: boolean;
  ga4_metric_name?: "sessions" | "activeUsers" | "conversions";
}

export interface MarketingTaskInput {
  label: string;
  ref?: string;
  value?: string;
}

export interface MarketingTaskWhen {
  day_offset: number;
  slot: CmoOpsDaySlot;
  due_at?: string;
}

/** Authoring + runtime contract fields (extends week1 priority + ops task). */
export interface MarketingTaskContractFields {
  deliverable: string;
  execution_mode: MarketingExecutionMode;
  estimated_effort_minutes: number;
  if_failed: string;
  day_offset: number;
  inputs: MarketingTaskInput[];
  required_proof: ExpectedProofKind[];
  metric?: MarketingTaskMetric;
  depends_on?: string[];
}

export type CmoWeek1PriorityWithContract = CmoWeek1Priority & MarketingTaskContractFields;

export interface MarketingTaskContract extends MarketingTaskContractFields {
  id: string;
  what: string;
  why: string;
  owner: CmoTaskOwner;
  done_when: string;
  when: MarketingTaskWhen;
  measure_date?: string;
  execution_plan?: OpsExecutionPlan;
  human_execution_ref?: HumanExecutionRef;
  human_execution_asset?: HumanExecutionAsset;
}

export const GENERIC_TASK_DELIVERABLE_RE =
  /\b(improve|optimize|enhance|better|generic|misc|todo|tbd|marketing task|launch plan)\b/i;

const EXECUTION_MODE_EFFORT: Record<MarketingExecutionMode, number> = {
  repo_edit: 90,
  browser_research: 75,
  content_draft: 45,
  scout_then_edit: 120,
  human_post: 40,
  human_outreach: 50,
  human_launch: 60,
  human_log: 25,
  delegate_rubric: 35,
  delegate_brief: 45,
  export_csv: 20,
  measurement_sync: 15,
  product_request: 90,
  week_review: 30,
};

export function taskContractEffortMinutes(mode: MarketingExecutionMode): number {
  return EXECUTION_MODE_EFFORT[mode] ?? 55;
}

export function defaultRequiredProof(
  owner: CmoTaskOwner,
  doneWhen: string,
  metric?: MarketingTaskMetric,
): ExpectedProofKind[] {
  if (owner === "system") {
    if (/browser|preview|verify/i.test(doneWhen)) return ["browser_evidence"];
    return ["note"];
  }
  const kinds: ExpectedProofKind[] = [];
  if (/URL|link|live post|published|posted/i.test(doneWhen)) kinds.push("live_url");
  if (metric?.measurable || /\bkpi\b|\bmetric\b|\b%|\bviews\b|\bsignup/i.test(doneWhen)) {
    kinds.push("kpi");
  }
  if (kinds.length === 0) kinds.push("note");
  return kinds;
}

export function inferExecutionModeFromTask(
  owner: CmoTaskOwner,
  doneWhen: string,
  what: string,
  thesisId?: ChannelThesisId,
): MarketingExecutionMode {
  if (owner === "delegate") {
    return /brief|hire|sow/i.test(what) ? "delegate_brief" : "delegate_rubric";
  }
  if (owner === "system") {
    if (/browser|research|audit|scout/i.test(what)) return "browser_research";
    if (/draft|script|copy|post grid|template|pack/i.test(what)) return "content_draft";
    if (/landing|hero|seo|readme|patch|wire|tracking|event/i.test(what)) return "repo_edit";
    return "repo_edit";
  }
  if (/export|csv|list/i.test(what)) return "export_csv";
  if (/launch|PH|HN|community post|Show HN/i.test(what)) return "human_launch";
  if (/DM|email|outreach|touch|pitch|influencer|sent/i.test(what)) return "human_outreach";
  if (/KPI|metric|snapshot|log|recorded|signup rate|visitor/i.test(doneWhen)) return "measurement_sync";
  if (/comment|engage|post|publish|video/i.test(what)) return "human_post";
  if (thesisId === "outbound_sales") return "human_outreach";
  if (thesisId === "product_hunt_launch" || thesisId === "community_launch") return "human_launch";
  return "human_log";
}

export function isMeasurableForReview(task: Pick<CmoOpsTask, "metric">): boolean {
  return task.metric?.measurable === true;
}

export function assertTaskContractComplete(
  task: Partial<CmoOpsTask | CmoWeek1PriorityWithContract>,
): string[] {
  const errors: string[] = [];
  if (!task.what?.trim()) errors.push("missing what");
  if (!task.why?.trim()) errors.push("missing why");
  if (!task.owner) errors.push("missing owner");
  if (!task.done_when?.trim()) errors.push("missing done_when");
  if (!task.deliverable?.trim()) errors.push("missing deliverable");
  else if (GENERIC_TASK_DELIVERABLE_RE.test(task.deliverable)) errors.push("generic deliverable");
  if (!task.execution_mode) errors.push("missing execution_mode");
  if (task.estimated_effort_minutes == null || task.estimated_effort_minutes <= 0) {
    errors.push("missing estimated_effort_minutes");
  }
  if (!task.if_failed?.trim()) errors.push("missing if_failed");
  if (task.day_offset == null || task.day_offset < 0) errors.push("missing day_offset");
  if (!Array.isArray(task.inputs)) errors.push("missing inputs array");
  if (!Array.isArray(task.required_proof) || task.required_proof.length === 0) {
    errors.push("missing required_proof");
  }
  return errors;
}

export function assertCadenceContractComplete(cadence: { tasks: CmoOpsTask[] }): string[] {
  const errors: string[] = [];
  for (const task of cadence.tasks) {
    const taskErrors = assertTaskContractComplete(task);
    if (taskErrors.length) errors.push(`${task.id}: ${taskErrors.join(", ")}`);
  }
  return errors;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function materializeOpsTaskContract(
  priority: CmoWeek1PriorityWithContract,
  index: number,
  priorIds: string[],
  startedAt: string,
  slot: CmoOpsDaySlot,
): Pick<
  CmoOpsTask,
  | "deliverable"
  | "execution_mode"
  | "estimated_effort_minutes"
  | "if_failed"
  | "day_offset"
  | "inputs"
  | "required_proof"
  | "metric"
  | "depends_on"
  | "when"
  | "measure_date"
> {
  const dayOffset = priority.day_offset ?? index;
  return {
    deliverable: priority.deliverable,
    execution_mode: priority.execution_mode,
    estimated_effort_minutes: priority.estimated_effort_minutes,
    if_failed: priority.if_failed,
    day_offset: dayOffset,
    inputs: priority.inputs ?? [],
    required_proof: priority.required_proof,
    metric: priority.metric,
    depends_on: priority.depends_on ?? (index > 0 ? [priorIds[index - 1]!] : []),
    when: {
      day_offset: dayOffset,
      slot,
      due_at: addDays(startedAt, dayOffset),
    },
    measure_date: priority.metric?.measurable ? addDays(startedAt, dayOffset) : undefined,
  };
}

type ContractPatch = Partial<MarketingTaskContractFields>;

function patch(
  base: MarketingTaskContractFields,
  overrides?: ContractPatch,
): MarketingTaskContractFields {
  return { ...base, ...overrides, inputs: overrides?.inputs ?? base.inputs };
}

/** Per-thesis, per-task-index contract enrichments (authoritative, not runtime inference). */
const THESIS_CONTRACT_PATCHES: Record<ChannelThesisId, ContractPatch[]> = {
  viral_short_form: [
    patch(
      {
        deliverable: "Landing diff with UTM params + conversion event wired in preview",
        execution_mode: "repo_edit",
        estimated_effort_minutes: 90,
        if_failed: "If tracking does not fire in preview → fix events before posting volume",
        day_offset: 0,
        inputs: [{ label: "Hero route", ref: "@hero" }, { label: "UTM base", value: "?utm_source=shortform" }],
        required_proof: ["browser_evidence"],
      },
    ),
    patch(
      {
        deliverable: "15 hook scripts file with 3 A/B/C variants flagged",
        execution_mode: "content_draft",
        estimated_effort_minutes: 60,
        if_failed: "If fewer than 3 distinct angles → add angles before filming",
        day_offset: 1,
        inputs: [{ label: "Product story", ref: "thesis.signals" }],
        required_proof: ["note"],
      },
    ),
    patch(
      {
        deliverable: "3 live short-form post URLs with UTM tracking",
        execution_mode: "human_post",
        estimated_effort_minutes: 45,
        if_failed: "If all 3 posts <100 views in 24h → revise hooks before scaling volume",
        day_offset: 2,
        inputs: [{ label: "Scripts A/B/C", ref: "scripts.pack" }, { label: "Landing URL", ref: "@hero" }],
        required_proof: ["live_url", "kpi"],
        metric: { id: "short_form_views", name: "24h views per post", target: 100, unit: "views", measurable: true },
      },
    ),
    patch(
      {
        deliverable: "3 comment thread URLs with reply counts logged",
        execution_mode: "human_log",
        estimated_effort_minutes: 30,
        if_failed: "If zero replies → adjust hook or posting time and retry next post",
        day_offset: 3,
        inputs: [{ label: "Post URLs", ref: "prior.post_urls" }],
        required_proof: ["live_url", "note"],
        metric: { id: "comment_engagement", name: "Replies per post", measurable: false },
      },
    ),
  ],
  founder_social: [
    patch({
      deliverable: "Hero/ICP diff with proof block applied or reviewed",
      execution_mode: "repo_edit",
      estimated_effort_minutes: 75,
      if_failed: "If ICP mismatch persists → rewrite headline before posting",
      day_offset: 0,
      inputs: [{ label: "Hero route", ref: "@hero" }],
      required_proof: ["browser_evidence"],
    }),
    patch({
      deliverable: "7 founder post drafts in marketing/ with schedule order",
      execution_mode: "content_draft",
      estimated_effort_minutes: 55,
      if_failed: "If drafts lack product tie-in → rewrite problem→insight arc",
      day_offset: 1,
      inputs: [{ label: "ICP doc", ref: "marketing/icp" }],
      required_proof: ["note"],
    }),
    patch({
      deliverable: "3 live founder post URLs on LinkedIn/X",
      execution_mode: "human_post",
      estimated_effort_minutes: 40,
      if_failed: "If engagement flat → test contrarian insight angle on post 4",
      day_offset: 2,
      inputs: [{ label: "Drafts 1-3", ref: "marketing/posts" }],
      required_proof: ["live_url", "kpi"],
      metric: { id: "founder_post_engagement", name: "Reactions + comments", target: 10, measurable: true },
    }),
    patch({
      deliverable: "10 ICP thread URLs with one-line takeaway notes",
      execution_mode: "human_outreach",
      estimated_effort_minutes: 50,
      if_failed: "If threads are pitchy → rewrite as insight-only comments",
      day_offset: 3,
      inputs: [{ label: "ICP keywords", ref: "thesis.signals" }],
      required_proof: ["live_url", "note"],
      metric: { id: "icp_threads", name: "Substantive threads", target: 10, measurable: false },
    }),
  ],
  product_hunt_launch: [
    patch({
      deliverable: "Launch landing diff with sharp CTA + meta applied",
      execution_mode: "repo_edit",
      estimated_effort_minutes: 90,
      if_failed: "If CTA unclear → simplify to one action before launch day",
      day_offset: 0,
      inputs: [{ label: "Hero route", ref: "@hero" }],
      required_proof: ["browser_evidence"],
    }),
    patch({
      deliverable: "PH asset pack: tagline, gallery bullets, maker comment draft",
      execution_mode: "content_draft",
      estimated_effort_minutes: 60,
      if_failed: "If gallery incomplete → defer launch slot until assets ready",
      day_offset: 1,
      inputs: [{ label: "Product screenshots", ref: "assets/" }],
      required_proof: ["note"],
    }),
    patch({
      deliverable: "10 supporters confirmed + launch datetime locked",
      execution_mode: "human_launch",
      estimated_effort_minutes: 55,
      if_failed: "If <5 supporters → extend prep 48h or reduce launch scope",
      day_offset: 3,
      inputs: [{ label: "Supporter list", ref: "marketing/supporters" }],
      required_proof: ["note", "kpi"],
      metric: { id: "supporters_confirmed", name: "Supporters confirmed", target: 10, measurable: true },
    }),
  ],
  landing_conversion: [
    patch({
      deliverable: "Hero CTA + meta + proof patch applied with TurnReceipt",
      execution_mode: "repo_edit",
      estimated_effort_minutes: 90,
      if_failed: "If diff too large → ship hero-only patch first",
      day_offset: 0,
      inputs: [{ label: "Hero route", ref: "@hero" }],
      required_proof: ["browser_evidence"],
    }),
    patch({
      deliverable: "Primary conversion event snippet or GA4 step documented",
      execution_mode: "repo_edit",
      estimated_effort_minutes: 60,
      if_failed: "If event missing → block traffic test until tracking live",
      day_offset: 1,
      inputs: [{ label: "Analytics route", ref: "ga4" }],
      required_proof: ["note"],
    }),
    patch({
      deliverable: "50 visitors logged + signup rate % captured",
      execution_mode: "measurement_sync",
      estimated_effort_minutes: 45,
      if_failed: "If signup rate flat → run offer experiment before scaling traffic",
      day_offset: 4,
      inputs: [{ label: "Landing URL", ref: "@hero" }],
      required_proof: ["kpi"],
      metric: { id: "landing_signup_rate", name: "Signup rate", target: 3, unit: "%", measurable: true, ga4_metric_name: "conversions" },
    }),
  ],
  seo_content: [
    patch({
      deliverable: "Technical SEO diff: sitemap, meta, structured data",
      execution_mode: "repo_edit",
      estimated_effort_minutes: 90,
      if_failed: "If indexation blocked → fix robots/canonical before publishing",
      day_offset: 0,
      inputs: [{ label: "Blog route", ref: "routes.blog" }],
      required_proof: ["browser_evidence"],
    }),
    patch({
      deliverable: "Pillar article draft with target keyword in marketing/",
      execution_mode: "content_draft",
      estimated_effort_minutes: 75,
      if_failed: "If intent mismatch → re-research keyword before writing",
      day_offset: 2,
      inputs: [{ label: "Primary keyword", ref: "icp.search_intent" }],
      required_proof: ["note"],
    }),
    patch({
      deliverable: "Published pillar URL + 2 community distribution links",
      execution_mode: "human_post",
      estimated_effort_minutes: 50,
      if_failed: "If no indexation in 7d → add internal links + resubmit sitemap",
      day_offset: 4,
      inputs: [{ label: "Draft", ref: "marketing/pillar" }],
      required_proof: ["live_url", "kpi"],
      metric: { id: "pillar_sessions", name: "Week-1 organic sessions", target: 50, measurable: true, ga4_metric_name: "sessions" },
    }),
  ],
  outbound_sales: [
    patch({
      deliverable: "ICP one-pager in marketing/ approved by founder",
      execution_mode: "content_draft",
      estimated_effort_minutes: 45,
      if_failed: "If ICP too broad → narrow to one persona before list build",
      day_offset: 0,
      inputs: [{ label: "Repo signals", ref: "scan.readme" }],
      required_proof: ["note"],
    }),
    patch({
      deliverable: "30-target CSV + 3-touch sequence exportable",
      execution_mode: "export_csv",
      estimated_effort_minutes: 60,
      if_failed: "If list quality low → re-research titles before sending",
      day_offset: 1,
      inputs: [{ label: "ICP doc", ref: "marketing/icp" }],
      required_proof: ["note"],
    }),
    patch({
      deliverable: "20 outbound touches sent + reply rate logged",
      execution_mode: "human_outreach",
      estimated_effort_minutes: 55,
      if_failed: "If reply rate <5% → revise first-touch value prop",
      day_offset: 3,
      inputs: [{ label: "Outreach CSV", ref: "marketing/outreach.csv" }],
      required_proof: ["live_url", "kpi"],
      metric: { id: "outbound_reply_rate", name: "Positive reply rate", target: 5, unit: "%", measurable: true },
    }),
  ],
  community_launch: [
    patch({
      deliverable: "README diff with hook, demo, install CTA ready to apply",
      execution_mode: "repo_edit",
      estimated_effort_minutes: 75,
      if_failed: "If README still feature-list → rewrite hook-first",
      day_offset: 0,
      inputs: [{ label: "README", ref: "README.md" }],
      required_proof: ["note"],
    }),
    patch({
      deliverable: "Landing aligned with README promise (diff applied or reviewed)",
      execution_mode: "repo_edit",
      estimated_effort_minutes: 60,
      if_failed: "If message mismatch → pick README OR landing as source of truth",
      day_offset: 1,
      inputs: [{ label: "Hero route", ref: "@hero" }],
      required_proof: ["browser_evidence"],
    }),
    patch({
      deliverable: "Community post URL live + 2h comment response log",
      execution_mode: "human_launch",
      estimated_effort_minutes: 65,
      if_failed: "If post removed/downvoted → diagnose rule violation before repost",
      day_offset: 3,
      inputs: [{ label: "Show HN draft", ref: "marketing/community" }],
      required_proof: ["live_url", "kpi"],
      metric: { id: "community_upvotes", name: "Upvotes + comments", target: 20, measurable: true },
    }),
  ],
  influencer_partnerships: [
    patch({
      deliverable: "Landing patch with social proof + offer clarity applied",
      execution_mode: "repo_edit",
      estimated_effort_minutes: 75,
      if_failed: "If offer unclear → add one-line value prop above fold",
      day_offset: 0,
      inputs: [{ label: "Hero route", ref: "@hero" }],
      required_proof: ["browser_evidence"],
    }),
    patch({
      deliverable: "25-creator list + 3 outreach templates in marketing/",
      execution_mode: "content_draft",
      estimated_effort_minutes: 55,
      if_failed: "If creators off-niche → re-filter by audience overlap",
      day_offset: 1,
      inputs: [{ label: "Niche keywords", ref: "thesis.signals" }],
      required_proof: ["note"],
    }),
    patch({
      deliverable: "15 personalized DMs sent + 3+ replies logged",
      execution_mode: "human_outreach",
      estimated_effort_minutes: 50,
      if_failed: "If zero replies → test shorter pitch with social proof link",
      day_offset: 3,
      inputs: [{ label: "Creator list", ref: "marketing/creators" }, { label: "UTM", value: "?utm_source=creator" }],
      required_proof: ["live_url", "kpi"],
      metric: { id: "influencer_replies", name: "Positive replies", target: 3, measurable: true },
    }),
  ],
};

export function enrichWeek1Priority(
  priority: Omit<CmoWeek1Priority, "id">,
  thesisId: ChannelThesisId,
  index: number,
): Omit<CmoWeek1PriorityWithContract, "id"> {
  const patchRow = THESIS_CONTRACT_PATCHES[thesisId]?.[index];
  const execution_mode =
    patchRow?.execution_mode ??
    inferExecutionModeFromTask(priority.owner, priority.done_when, priority.what, thesisId);
  const metric = patchRow?.metric;
  return {
    ...priority,
    deliverable: patchRow?.deliverable ?? priority.what,
    execution_mode,
    estimated_effort_minutes:
      patchRow?.estimated_effort_minutes ?? taskContractEffortMinutes(execution_mode),
    if_failed: patchRow?.if_failed ?? `If blocked → skip with reason and escalate in week review`,
    day_offset: patchRow?.day_offset ?? index,
    inputs: patchRow?.inputs ?? [],
    required_proof:
      patchRow?.required_proof ??
      defaultRequiredProof(priority.owner, priority.done_when, metric),
    metric,
    depends_on: patchRow?.depends_on,
  };
}

export function enrichMechanismWeek1Priority(
  template: { what: string; why: string; owner: CmoTaskOwner; done_when: string; lane_hint?: string },
  mechanismId: GrowthMechanismId,
  index: number,
): Omit<CmoWeek1PriorityWithContract, "id"> & { id?: string } {
  const record = getMechanismRecord(mechanismId);
  const execution_mode =
    template.owner === "system"
      ? template.lane_hint === "lane_a"
        ? /browser|research/i.test(template.what)
          ? "browser_research"
          : /draft|script|copy/i.test(template.what)
            ? "content_draft"
            : "repo_edit"
        : "repo_edit"
      : template.lane_hint === "lane_b"
        ? /DM|outreach|pitch/i.test(template.what)
          ? "human_outreach"
          : /post|publish|video/i.test(template.what)
            ? "human_post"
            : "human_log"
        : inferExecutionModeFromTask(template.owner, template.done_when, template.what);

  const measurable = /\bviews\b|\breplies\b|\bsignups\b|\bURL\b|\blogged\b/i.test(template.done_when);
  const metric: MarketingTaskMetric | undefined = measurable
    ? {
        id: `${mechanismId}.w1.${index}`,
        name: record.leading_indicators[0]?.replace(/_/g, " ") ?? "Week 1 signal",
        target: template.owner === "user" ? 3 : undefined,
        measurable: true,
      }
    : {
        id: `${mechanismId}.w1.${index}.process`,
        name: "Process completion",
        measurable: false,
      };

  return {
    ...template,
    deliverable: template.what,
    execution_mode,
    estimated_effort_minutes: taskContractEffortMinutes(execution_mode),
    if_failed: record.failure_modes[index % record.failure_modes.length] ?? record.anti_patterns[0] ?? "Escalate in week review",
    day_offset: index,
    inputs: [{ label: "Mechanism", value: record.label }],
    required_proof: defaultRequiredProof(template.owner, template.done_when, metric),
    metric,
  };
}

export function enrichThesisWeek1Priorities(
  priorities: Omit<CmoWeek1Priority, "id">[],
  thesisId: ChannelThesisId,
): Omit<CmoWeek1PriorityWithContract, "id">[] {
  return priorities.map((p, i) => enrichWeek1Priority(p, thesisId, i));
}
