/**
 * P5 — Lane C delegate briefs: hand off execution to SDR / VA / writer / creator.
 * See CMO_LANE_C_SPEC.md and PRODUCT_NORTH_STAR.md §8 (Lane C column).
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import type { CmoOpsCadence } from "./cmoOpsCadence";

export type DelegateRole = "sdr" | "va" | "writer" | "creator" | "agency";

export type DelegateBriefStatus =
  | "draft"
  | "handed_off"
  | "in_progress"
  | "done"
  | "skipped";

export interface DelegateProof {
  url?: string;
  note?: string;
  /** P14 — logged contractor/agency spend, distinct from the estimate. */
  actual_spend_usd?: number;
  completed_at: string;
}

export type HireBriefKind =
  | "va_research"
  | "va_scheduler"
  | "sdr_outbound"
  | "creator_filmer"
  | "writer_publish"
  | "agency_wave";

export type LaneLinkTarget =
  | "lane_b_outreach"
  | "lane_b_calendar"
  | "lane_b_runbook"
  | "influencer_operator"
  | "distribution_operator";

export interface CmoDelegateBrief {
  id: string;
  role: DelegateRole;
  title: string;
  what: string;
  why: string;
  deliverables: string[];
  acceptance_criteria: string[];
  due_day: number;
  status: DelegateBriefStatus;
  assignee_name?: string;
  assignee_contact?: string;
  handoff_note?: string;
  handed_off_at?: string;
  proof?: DelegateProof;
  /** P14 — planned amount from the delegate-labor bucket. */
  cost_estimate_usd?: number;
  /** Links to Lane B outreach touches when SDR sends from tracker. */
  linked_lane_b_mode?: "outreach_tracker";
  /** P10 — hire + rubric + lane link metadata. */
  hire_kind?: HireBriefKind;
  lane_link_target?: LaneLinkTarget;
  linked_lane_b_ids?: string[];
  linked_operator_touch_ids?: string[];
  rubric_days?: number;
  sort_order: number;
}

export interface CmoDelegateWorkspace {
  id: string;
  thesis_id: ChannelThesisId;
  week_index: number;
  started_at: string;
  ops_cadence_id?: string;
  briefs: CmoDelegateBrief[];
}

export interface DelegateProofInput {
  url?: string;
  note?: string;
  actual_spend_usd?: number;
}

export interface DelegateHandoffInput {
  assignee_name: string;
  assignee_contact?: string;
  handoff_note?: string;
}

export interface DelegateProgress {
  done: number;
  total: number;
  handedOff: number;
  percent: number;
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

interface BriefTemplate {
  role: DelegateRole;
  title: string;
  what: string;
  why: string;
  deliverables: string[];
  acceptance_criteria: string[];
  due_day: number;
  linked_lane_b_mode?: "outreach_tracker";
}

const DELEGATE_BY_THESIS: Partial<Record<ChannelThesisId, BriefTemplate[]>> = {
  outbound_sales: [
    {
      role: "va",
      title: "Enrich ICP target list (30 contacts)",
      what: "Fill target_name + email/LinkedIn for 30 rows in outreach tracker",
      why: "Outbound fails without enriched contacts — founder should not do list hygiene.",
      deliverables: [
        "30 targets with name + handle/email in Lane B tracker",
        "Flag 10 highest-fit with one-line why",
      ],
      acceptance_criteria: [
        "All 30 rows have non-placeholder names and reachable handles",
        "No duplicate companies in the batch",
      ],
      due_day: 2,
      linked_lane_b_mode: "outreach_tracker",
    },
    {
      role: "sdr",
      title: "Send first 20 value-first touches",
      what: "Send sequences from marketing/ CSV — log replies in tracker notes",
      why: "Pipeline velocity needs human send volume; system prepared templates.",
      deliverables: [
        "20 emails/DMs sent from exported outreach CSV",
        "Reply notes on each touch row where applicable",
      ],
      acceptance_criteria: [
        "Export CSV handed off with assignee confirmation",
        "≥15 touches marked with send proof note or URL",
      ],
      due_day: 5,
      linked_lane_b_mode: "outreach_tracker",
    },
  ],
  influencer_partnerships: [
    {
      role: "va",
      title: "Research 25 niche creators",
      what: "Populate influencer touch rows with real handles + fit note",
      why: "Founder DMs close deals — VA does research volume.",
      deliverables: ["25 creator handles in outreach tracker", "3-sentence fit note per target"],
      acceptance_criteria: ["No generic @creator placeholders", "Each row has niche + audience size note"],
      due_day: 3,
      linked_lane_b_mode: "outreach_tracker",
    },
    {
      role: "agency",
      title: "Outreach batch — 15 personalized DMs",
      what: "Agency or contractor sends first DM wave using templates in marketing/",
      why: "Partnerships are a numbers game — delegate first wave.",
      deliverables: ["15 DMs sent", "Response log per creator"],
      acceptance_criteria: ["≥10 sends with proof note", "UTM links used where provided"],
      due_day: 6,
      linked_lane_b_mode: "outreach_tracker",
    },
  ],
  seo_content: [
    {
      role: "writer",
      title: "Publish pillar article from repo draft",
      what: "Take marketing/ pillar draft → publish on blog/CMS with meta + internal links",
      why: "SEO wins on depth; founder time better spent on distribution than formatting.",
      deliverables: ["Live URL", "Target keyword in title/H1", "2 internal links"],
      acceptance_criteria: ["URL proof", "Matches ICP search intent from brief"],
      due_day: 5,
    },
  ],
  viral_short_form: [
    {
      role: "creator",
      title: "Film 3 hook variants from script pack",
      what: "Record A/B/C hooks from marketing/ scripts — raw files or platform drafts",
      why: "Volume + iteration beats one founder take on camera.",
      deliverables: ["3 short clips or platform draft links", "Hook label per variant"],
      acceptance_criteria: ["Each variant matches script pack", "Ready for user to post (Lane B)"],
      due_day: 3,
    },
  ],
  founder_social: [
    {
      role: "va",
      title: "Schedule 3 founder posts from calendar",
      what: "Queue posts in LinkedIn/native scheduler from Lane B calendar copy",
      why: "Consistency beats heroics — VA handles scheduling friction.",
      deliverables: ["3 scheduled posts with timestamps", "Screenshot or scheduler URL"],
      acceptance_criteria: ["Copy matches approved draft", "Scheduled within Week 1 window"],
      due_day: 4,
    },
  ],
  product_hunt_launch: [
    {
      role: "va",
      title: "Confirm supporter list (10 advocates)",
      what: "Track hunter + 10 supporters with contact status in runbook notes",
      why: "Launch day needs coordinated network — delegate list hygiene.",
      deliverables: ["10 named supporters with status", "Hunter slot confirmed or escalated"],
      acceptance_criteria: ["No empty slots on T-3 checklist", "Escalation note if <8 confirmed"],
      due_day: 4,
    },
  ],
};

export function thesisHasDelegateLane(thesisId: ChannelThesisId): boolean {
  return (DELEGATE_BY_THESIS[thesisId]?.length ?? 0) > 0;
}

export function delegateRoleLabel(role: DelegateRole): string {
  const labels: Record<DelegateRole, string> = {
    sdr: "SDR",
    va: "VA / Research",
    writer: "Writer",
    creator: "Creator",
    agency: "Agency",
  };
  return labels[role];
}

export function createDelegateWorkspaceFromThesis(
  thesis: ChannelThesis,
  opts?: { opsCadence?: CmoOpsCadence; week_index?: number; now?: string },
): CmoDelegateWorkspace | null {
  const templates = DELEGATE_BY_THESIS[thesis.id];
  if (!templates?.length) return null;

  const weekIndex = opts?.week_index ?? opts?.opsCadence?.week_index ?? 1;
  const now = opts?.now ?? new Date().toISOString();

  const briefs: CmoDelegateBrief[] = templates.map((t, i) => ({
    id: `${thesis.id}.lanec.${weekIndex}.${i}`,
    role: t.role,
    title: t.title,
    what: t.what,
    why: t.why,
    deliverables: t.deliverables,
    acceptance_criteria: t.acceptance_criteria,
    due_day: t.due_day,
    status: "draft",
    linked_lane_b_mode: t.linked_lane_b_mode,
    sort_order: i,
  }));

  return {
    id: `lanec.${thesis.id}.w${weekIndex}.${Date.now()}`,
    thesis_id: thesis.id,
    week_index: weekIndex,
    started_at: now,
    ops_cadence_id: opts?.opsCadence?.id,
    briefs,
  };
}

export function getNextDelegateBrief(
  workspace: CmoDelegateWorkspace,
): CmoDelegateBrief | null {
  return (
    workspace.briefs.find(
      (b) =>
        b.status === "draft" ||
        b.status === "handed_off" ||
        b.status === "in_progress",
    ) ?? null
  );
}

export function delegateWorkspaceProgress(workspace: CmoDelegateWorkspace): DelegateProgress {
  const total = workspace.briefs.length;
  const done = workspace.briefs.filter(
    (b) => b.status === "done" || b.status === "skipped",
  ).length;
  const handedOff = workspace.briefs.filter(
    (b) => b.status === "handed_off" || b.status === "in_progress" || b.status === "done",
  ).length;
  return {
    done,
    total,
    handedOff,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

export function validateDelegateProof(input: DelegateProofInput): string | null {
  if (
    input.actual_spend_usd != null &&
    (!Number.isFinite(input.actual_spend_usd) || input.actual_spend_usd < 0)
  ) {
    return "Actual spend must be a non-negative USD amount.";
  }
  const note = input.note?.trim() ?? "";
  const url = input.url?.trim() ?? "";
  if (url && !URL_RE.test(url)) return "Proof URL must start with http:// or https://";
  if (url) return null;
  if (note.length >= 8) return null;
  return "Add a proof URL or note (8+ chars) — delegate tasks close on delivery evidence.";
}

export function validateDelegateHandoff(input: DelegateHandoffInput): string | null {
  const name = input.assignee_name?.trim() ?? "";
  if (name.length < 2) return "Assignee name required for handoff.";
  return null;
}

export function handOffDelegateBrief(
  workspace: CmoDelegateWorkspace,
  briefId: string,
  input: DelegateHandoffInput,
): { workspace: CmoDelegateWorkspace; error?: string } {
  const err = validateDelegateHandoff(input);
  if (err) return { workspace, error: err };

  const now = new Date().toISOString();
  const briefs = workspace.briefs.map((b) =>
    b.id === briefId
      ? {
          ...b,
          status: "handed_off" as const,
          assignee_name: input.assignee_name.trim(),
          assignee_contact: input.assignee_contact?.trim(),
          handoff_note: input.handoff_note?.trim(),
          handed_off_at: now,
        }
      : b,
  );
  return { workspace: { ...workspace, briefs } };
}

export function completeDelegateBrief(
  workspace: CmoDelegateWorkspace,
  briefId: string,
  proof: DelegateProofInput,
): { workspace: CmoDelegateWorkspace; error?: string } {
  const err = validateDelegateProof(proof);
  if (err) return { workspace, error: err };

  const now = new Date().toISOString();
  const briefs = workspace.briefs.map((b) =>
    b.id === briefId
      ? {
          ...b,
          status: "done" as const,
          proof: {
            url: proof.url?.trim(),
            note: proof.note?.trim(),
            actual_spend_usd: proof.actual_spend_usd,
            completed_at: now,
          },
        }
      : b,
  );
  return { workspace: { ...workspace, briefs } };
}

export function skipDelegateBrief(
  workspace: CmoDelegateWorkspace,
  briefId: string,
  reason?: string,
): CmoDelegateWorkspace {
  const briefs = workspace.briefs.map((b) =>
    b.id === briefId
      ? {
          ...b,
          status: "skipped" as const,
          handoff_note: reason?.trim() || b.handoff_note,
        }
      : b,
  );
  return { ...workspace, briefs };
}

export function buildDelegateHandoffMarkdown(
  workspace: CmoDelegateWorkspace,
  thesis: ChannelThesis,
  briefId: string,
): string | null {
  const brief = workspace.briefs.find((b) => b.id === briefId);
  if (!brief) return null;

  const lines = [
    `# Delegate brief — ${brief.title}`,
    ``,
    `**Week ${workspace.week_index}** · ${thesis.title}`,
    `**Role:** ${delegateRoleLabel(brief.role)}`,
    brief.assignee_name ? `**Assignee:** ${brief.assignee_name}` : "",
    brief.assignee_contact ? `**Contact:** ${brief.assignee_contact}` : "",
    `**Due:** Day ${brief.due_day}`,
    ``,
    `## What`,
    brief.what,
    ``,
    `## Why`,
    brief.why,
    ``,
    `## Deliverables`,
    ...brief.deliverables.map((d) => `- ${d}`),
    ``,
    `## Done when`,
    ...brief.acceptance_criteria.map((a) => `- ${a}`),
  ];

  if (brief.handoff_note) {
    lines.push("", `## Handoff note`, brief.handoff_note);
  }

  if (brief.linked_lane_b_mode === "outreach_tracker") {
    lines.push(
      "",
      `## Lane B link`,
      `Export outreach CSV from Lane B panel and attach to this brief.`,
    );
  }

  lines.push("", `---`, `Generated by Marketing IDE · ${new Date().toISOString()}`);
  return lines.filter(Boolean).join("\n");
}

export function hydrateDelegateWorkspaceFromJson(raw: unknown): CmoDelegateWorkspace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.thesis_id !== "string") return null;
  if (!Array.isArray(o.briefs)) return null;

  const briefs: CmoDelegateBrief[] = o.briefs
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    .map((b, i) => ({
      id: String(b.id ?? `legacy.lanec.${i}`),
      role: (
        b.role === "sdr" ||
        b.role === "va" ||
        b.role === "writer" ||
        b.role === "creator" ||
        b.role === "agency"
          ? b.role
          : "va"
      ) as DelegateRole,
      title: String(b.title ?? ""),
      what: String(b.what ?? ""),
      why: String(b.why ?? ""),
      deliverables: Array.isArray(b.deliverables)
        ? b.deliverables.filter((d): d is string => typeof d === "string")
        : [],
      acceptance_criteria: Array.isArray(b.acceptance_criteria)
        ? b.acceptance_criteria.filter((d): d is string => typeof d === "string")
        : [],
      due_day: Number(b.due_day ?? 1),
      status: (
        b.status === "handed_off" ||
        b.status === "in_progress" ||
        b.status === "done" ||
        b.status === "skipped"
          ? b.status
          : "draft"
      ) as DelegateBriefStatus,
      assignee_name: typeof b.assignee_name === "string" ? b.assignee_name : undefined,
      assignee_contact: typeof b.assignee_contact === "string" ? b.assignee_contact : undefined,
      handoff_note: typeof b.handoff_note === "string" ? b.handoff_note : undefined,
      handed_off_at: typeof b.handed_off_at === "string" ? b.handed_off_at : undefined,
      proof:
        b.proof && typeof b.proof === "object"
          ? (b.proof as DelegateProof)
          : undefined,
      linked_lane_b_mode:
        b.linked_lane_b_mode === "outreach_tracker" ? "outreach_tracker" : undefined,
      hire_kind:
        b.hire_kind === "va_research" ||
        b.hire_kind === "va_scheduler" ||
        b.hire_kind === "sdr_outbound" ||
        b.hire_kind === "creator_filmer" ||
        b.hire_kind === "writer_publish" ||
        b.hire_kind === "agency_wave"
          ? b.hire_kind
          : undefined,
      lane_link_target:
        b.lane_link_target === "lane_b_outreach" ||
        b.lane_link_target === "lane_b_calendar" ||
        b.lane_link_target === "lane_b_runbook" ||
        b.lane_link_target === "influencer_operator" ||
        b.lane_link_target === "distribution_operator"
          ? b.lane_link_target
          : undefined,
      linked_lane_b_ids: Array.isArray(b.linked_lane_b_ids)
        ? b.linked_lane_b_ids.filter((id): id is string => typeof id === "string")
        : undefined,
      linked_operator_touch_ids: Array.isArray(b.linked_operator_touch_ids)
        ? b.linked_operator_touch_ids.filter((id): id is string => typeof id === "string")
        : undefined,
      rubric_days: typeof b.rubric_days === "number" ? b.rubric_days : undefined,
      sort_order: Number(b.sort_order ?? i),
    }));

  return {
    id: o.id,
    thesis_id: o.thesis_id as ChannelThesisId,
    week_index: Number(o.week_index ?? 1),
    started_at: String(o.started_at ?? new Date().toISOString()),
    ops_cadence_id: typeof o.ops_cadence_id === "string" ? o.ops_cadence_id : undefined,
    briefs,
  };
}
