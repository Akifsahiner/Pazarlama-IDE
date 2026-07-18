/**
 * P10 — Delegation Operator: hire scaffolds, daily rubrics, Lane C ↔ Lane B/operator sync.
 * See CMO_DELEGATE_OPERATOR_SPEC.md and PRODUCT_NORTH_STAR.md §11 P10.
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import type { GrowthControlPlane } from "./cmoGrowthPlane";
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import { importCreatorsFromDelegateProof, parseCreatorImportLines } from "./cmoInfluencerOperator";
import type { LaneBWorkspace } from "./cmoLaneB";
import {
  buildDelegateHandoffMarkdown,
  createDelegateWorkspaceFromThesis,
  type CmoDelegateBrief,
  type CmoDelegateWorkspace,
  type DelegateProofInput,
  handOffDelegateBrief,
  hydrateDelegateWorkspaceFromJson,
  thesisHasDelegateLane,
  type HireBriefKind,
  type LaneLinkTarget,
} from "./cmoLaneC";
import { outreachTrackerToCsv } from "./cmoOutreachExport";
import { KPI_PRESETS } from "./kpiPresets";
import type { ManualKpi } from "./types";

export type {
  HireBriefKind,
  LaneLinkTarget,
} from "./cmoLaneC";

export type RubricDayStatus = "pending" | "partial" | "done" | "skipped";

export type DelegateVerdictKind = "on_track" | "extend" | "release" | "promote";

export interface DelegateTrialKpi {
  id: string;
  label: string;
  target: number;
  unit: string;
}

export interface DelegateHireBlock {
  brief_id: string;
  kind: HireBriefKind;
  job_title: string;
  job_post_scaffold: string;
  trial_kpis: DelegateTrialKpi[];
  compensation_frame: string;
  /** P14 — deterministic weekly estimate; compensation_frame remains explanatory copy. */
  cost_estimate_usd?: number;
  hours_per_week?: number;
}

export interface RubricCheckItem {
  id: string;
  label: string;
  required: boolean;
  checked?: boolean;
}

export interface DelegateDailyRubric {
  id: string;
  brief_id: string;
  day_index: number;
  title: string;
  checklist: RubricCheckItem[];
  status: RubricDayStatus;
  proof_note?: string;
  proof_url?: string;
  actual_spend_usd?: number;
  completed_at?: string;
}

export interface DelegateLaneLink {
  brief_id: string;
  target: LaneLinkTarget;
  linked_ids: string[];
  export_on_handoff: boolean;
  import_on_delivery: boolean;
}

export interface DelegateVerdict {
  kind: DelegateVerdictKind;
  brief_id?: string;
  headline: string;
  rationale: string[];
  evidence: string[];
  computed_at: string;
}

export interface DelegateOperatorWorkspace {
  id: string;
  thesis_id: ChannelThesisId;
  week_index: number;
  started_at: string;
  ops_cadence_id?: string;
  briefs: CmoDelegateBrief[];
  hire_blocks: DelegateHireBlock[];
  daily_rubrics: DelegateDailyRubric[];
  lane_links: DelegateLaneLink[];
  verdict?: DelegateVerdict;
}

export interface RubricProofInput {
  checked_ids: string[];
  proof_note?: string;
  proof_url?: string;
  actual_spend_usd?: number;
}

export interface DelegateLinkContext {
  influencerOperator?: InfluencerOperatorWorkspace | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  growthPlane?: GrowthControlPlane | null;
}

export interface DelegateHandoffBundle {
  markdown: string;
  hire_markdown?: string;
  csv?: string;
  rubric_schedule: string;
}

export interface ImportDelegateResult {
  laneB?: LaneBWorkspace;
  influencerOperator?: InfluencerOperatorWorkspace;
  distributionOperator?: DistributionOperatorWorkspace;
  imported: number;
  errors: string[];
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

const OUTBOUND_LINE =
  /^([^|]+)\|\s*([^|@]*@[^|\s]+|[^|]+)\|\s*([^|]*)\|\s*(.+)$/i;

const SDR_LINE = /^([^|]+)\|\s*([^|]*)\|\s*(.+)$/i;

const FILM_LINE = /^Hook\s*([ABC])\s*\|\s*(https?:\/\/[^\s]+)$/i;

function inferHireKind(brief: CmoDelegateBrief, thesisId: ChannelThesisId): HireBriefKind {
  if (brief.hire_kind) return brief.hire_kind;
  if (brief.role === "sdr") return "sdr_outbound";
  if (brief.role === "creator") return "creator_filmer";
  if (brief.role === "writer") return "writer_publish";
  if (brief.role === "agency") return "agency_wave";
  if (brief.role === "va") {
    if (thesisId === "founder_social") return "va_scheduler";
    if (thesisId === "product_hunt_launch") return "va_research";
    return "va_research";
  }
  return "va_research";
}

function defaultRubricDays(kind: HireBriefKind): number {
  if (kind === "creator_filmer") return 3;
  if (kind === "sdr_outbound") return 5;
  if (kind === "writer_publish") return 4;
  if (kind === "agency_wave") return 5;
  if (kind === "va_scheduler") return 4;
  return 7;
}

export function resolveLaneCLinkTarget(
  thesis: ChannelThesis,
  brief: CmoDelegateBrief,
  ctx?: DelegateLinkContext,
): LaneLinkTarget {
  if (brief.lane_link_target) return brief.lane_link_target;
  const kind = inferHireKind(brief, thesis.id);
  if (kind === "creator_filmer" && ctx?.distributionOperator) {
    return "distribution_operator";
  }
  if (
    (kind === "va_research" || kind === "agency_wave") &&
    thesis.id === "influencer_partnerships" &&
    ctx?.influencerOperator
  ) {
    return "influencer_operator";
  }
  if (kind === "va_scheduler") return "lane_b_calendar";
  if (kind === "writer_publish") return "lane_b_outreach";
  if (thesis.id === "product_hunt_launch") return "lane_b_runbook";
  if (brief.linked_lane_b_mode === "outreach_tracker") return "lane_b_outreach";
  return "lane_b_outreach";
}

export function trialKpisForBrief(brief: CmoDelegateBrief, thesis: ChannelThesis): DelegateTrialKpi[] {
  const kind = inferHireKind(brief, thesis.id);
  switch (kind) {
    case "va_research":
      return [
        { id: "contacts_enriched", label: "Contacts enriched", target: thesis.id === "influencer_partnerships" ? 25 : 30, unit: "contacts" },
        { id: "fit_notes", label: "Rows with fit note (8+ chars)", target: thesis.id === "influencer_partnerships" ? 20 : 24, unit: "notes" },
      ];
    case "sdr_outbound":
      return [
        { id: "sends", label: "Value-first sends logged", target: 20, unit: "sends" },
        { id: "replies", label: "Reply notes captured", target: 3, unit: "replies" },
      ];
    case "creator_filmer":
      return [{ id: "variants", label: "Hook variants delivered", target: 3, unit: "clips" }];
    case "va_scheduler":
      return [{ id: "scheduled", label: "Posts scheduled", target: 3, unit: "posts" }];
    case "agency_wave":
      return [
        { id: "dms", label: "Personalized DMs sent", target: 15, unit: "dms" },
        { id: "responses", label: "Response logs", target: 5, unit: "logs" },
      ];
    case "writer_publish":
      return [{ id: "published", label: "Pillar published", target: 1, unit: "url" }];
    default:
      return [{ id: "deliverables", label: "Deliverables complete", target: 1, unit: "done" }];
  }
}

export function buildDelegateHireScaffold(
  thesis: ChannelThesis,
  brief: CmoDelegateBrief,
  productName = "the product",
): DelegateHireBlock {
  const kind = inferHireKind(brief, thesis.id);
  const trial_kpis = trialKpisForBrief(brief, thesis);
  const job_title =
    kind === "va_research"
      ? `Growth VA — ${thesis.title}`
      : kind === "creator_filmer"
        ? `Short-form Creator — ${productName}`
        : kind === "sdr_outbound"
          ? `Part-time SDR — ${productName}`
          : kind === "va_scheduler"
            ? `Social VA — ${productName}`
            : kind === "agency_wave"
              ? `Influencer Outreach Contractor`
              : kind === "writer_publish"
                ? `SEO Writer — ${productName}`
                : brief.title;

  let body = "";
  if (kind === "va_research") {
    body = [
      `We need a detail-oriented VA for **Week ${brief.due_day > 0 ? 1 : 1}** research.`,
      ``,
      `## ICP`,
      thesis.headline,
      ``,
      `## Your job`,
      `- Enrich contacts with **real name + handle/email** — never guess emails`,
      `- Add fit score 1–5 and an 8+ character note per row`,
      `- Import format: \`@handle | Platform | Fit 4 | niche note\` (influencer)`,
      `- Or: \`Name | email@co.com | LinkedIn URL | fit note\` (outbound)`,
      ``,
      `## Trial KPIs`,
      ...trial_kpis.map((k) => `- ${k.label}: ${k.target} ${k.unit}`),
      ``,
      `## Tools`,
      `Lane B / CSV export from Marketing IDE — rows are pre-reserved for you.`,
    ].join("\n");
  } else if (kind === "creator_filmer") {
    body = [
      `Film **3 hook variants (A/B/C)** from the script pack in \`marketing/\`.`,
      ``,
      `## Deliverables`,
      `- Raw clips or platform draft links`,
      `- Label each variant Hook A / B / C`,
      `- Founder posts — you deliver footage, not publish`,
      ``,
      `## Trial KPIs`,
      ...trial_kpis.map((k) => `- ${k.label}: ${k.target} ${k.unit}`),
    ].join("\n");
  } else if (kind === "sdr_outbound") {
    body = [
      `Send **value-first outbound** from the exported CSV — no spray-and-pray.`,
      ``,
      `## Workflow`,
      `- Use templates in \`marketing/\``,
      `- Log each send: \`row_id | sent_at | reply_note\``,
      `- Minimum ${trial_kpis[0]?.target ?? 20} sends this week`,
    ].join("\n");
  } else if (kind === "va_scheduler") {
    body = [
      `Schedule **3 founder posts** from Lane B calendar copy.`,
      ``,
      `- Match approved draft exactly`,
      `- Screenshot or scheduler URL as proof`,
    ].join("\n");
  } else if (kind === "agency_wave") {
    body = [
      `Send **15 personalized DMs** using templates — cap at 15/day.`,
      ``,
      `- Use UTM links where provided`,
      `- Log responses per creator`,
    ].join("\n");
  } else {
    body = [brief.what, ``, `## Done when`, ...brief.acceptance_criteria.map((a) => `- ${a}`)].join("\n");
  }

  const compensation_frame =
    kind === "creator_filmer"
      ? "$50–150/clip trial · affiliate-only optional"
      : kind === "sdr_outbound"
        ? "$20–35/hr or per-meeting bonus"
        : "$12–18/hr trial week · 10h cap";

  return {
    brief_id: brief.id,
    kind,
    job_title,
    job_post_scaffold: `# ${job_title}\n\n${body}`,
    trial_kpis,
    compensation_frame,
    hours_per_week: kind === "creator_filmer" ? 5 : 10,
  };
}

export function buildDelegateHireMarkdown(block: DelegateHireBlock): string {
  const lines = [
    block.job_post_scaffold,
    ``,
    `## Compensation`,
    block.compensation_frame,
    block.hours_per_week ? `**Hours:** ~${block.hours_per_week}h/week trial` : "",
    ``,
    `---`,
    `Generated by Marketing IDE · hire brief`,
  ];
  return lines.filter(Boolean).join("\n");
}

function rubricTemplateForKind(kind: HireBriefKind, briefId: string, weekIndex: number): Omit<DelegateDailyRubric, "status">[] {
  if (kind === "creator_filmer") {
    return [
      {
        id: `${briefId}.rubric.d1`,
        brief_id: briefId,
        day_index: 1,
        title: "Scripts + filming plan",
        checklist: [
          { id: "scripts", label: "Script pack reviewed", required: true },
          { id: "plan", label: "Filming plan confirmed with founder", required: true },
        ],
      },
      {
        id: `${briefId}.rubric.d2`,
        brief_id: briefId,
        day_index: 2,
        title: "Raw clips delivered",
        checklist: [
          { id: "clips", label: "Raw clips uploaded (URL or drive)", required: true },
          { id: "labels", label: "Hooks labeled A/B/C", required: true },
        ],
      },
      {
        id: `${briefId}.rubric.d3`,
        brief_id: briefId,
        day_index: 3,
        title: "Revisions ready",
        checklist: [
          { id: "ready", label: "Variants ready for founder post", required: true },
        ],
      },
    ];
  }

  if (kind === "sdr_outbound") {
    return Array.from({ length: 5 }, (_, i) => ({
      id: `${briefId}.rubric.d${i + 1}`,
      brief_id: briefId,
      day_index: i + 1,
      title: `Day ${i + 1} — 4 sends logged`,
      checklist: [
        { id: "sends", label: "4 outreach sends logged in tracker", required: true },
        { id: "notes", label: "Reply notes where applicable", required: i === 4 },
      ],
    }));
  }

  if (kind === "va_scheduler") {
    return Array.from({ length: 4 }, (_, i) => ({
      id: `${briefId}.rubric.d${i + 1}`,
      brief_id: briefId,
      day_index: i + 1,
      title: i < 3 ? `Schedule post #${i + 1}` : "Verify all scheduled",
      checklist: [
        { id: "scheduled", label: "Post scheduled with timestamp", required: i < 3 },
        { id: "proof", label: "Screenshot or scheduler URL", required: i < 3 },
        { id: "verify", label: "All 3 posts verified in window", required: i === 3 },
      ],
    }));
  }

  // va_research / agency — 7 days
  const days: Omit<DelegateDailyRubric, "status">[] = [];
  for (let d = 1; d <= 7; d++) {
    const isQa = d === 6;
    const isFinal = d === 7;
    days.push({
      id: `${briefId}.rubric.d${d}`,
      brief_id: briefId,
      day_index: d,
      title: isFinal
        ? "Final handback summary"
        : isQa
          ? "QA pass — no placeholders"
          : `Enrich 5 contacts (Day ${d})`,
      checklist: isFinal
        ? [
            { id: "summary", label: "CSV/note handback with row count", required: true },
            { id: "dupes", label: "No duplicate companies/handles", required: true },
          ]
        : isQa
          ? [
              { id: "placeholders", label: "Zero @creator / placeholder rows", required: true },
              { id: "fit", label: "≥80% rows have fit note 8+ chars", required: true },
            ]
          : [
              { id: "enrich", label: "5 rows enriched (name + handle)", required: true },
              { id: "fit", label: "Fit score + note on each row", required: true },
            ],
    });
  }
  void weekIndex;
  return days;
}

export function createDailyRubricsForBrief(
  workspace: DelegateOperatorWorkspace,
  briefId: string,
  thesis: ChannelThesis,
): DelegateDailyRubric[] {
  const brief = workspace.briefs.find((b) => b.id === briefId);
  if (!brief) return [];
  const kind = inferHireKind(brief, thesis.id);
  const existing = workspace.daily_rubrics.filter((r) => r.brief_id === briefId);
  if (existing.length > 0) return existing;
  return rubricTemplateForKind(kind, briefId, workspace.week_index).map((r) => ({
    ...r,
    status: "pending" as const,
  }));
}

export function validateRubricProof(
  rubric: DelegateDailyRubric,
  input: RubricProofInput,
): string | null {
  const required = rubric.checklist.filter((c) => c.required);
  const checked = new Set(input.checked_ids);
  const requiredDone = required.filter((c) => checked.has(c.id)).length;
  const note = input.proof_note?.trim() ?? "";
  const url = input.proof_url?.trim() ?? "";
  if (
    input.actual_spend_usd != null &&
    (!Number.isFinite(input.actual_spend_usd) || input.actual_spend_usd < 0)
  ) {
    return "Actual spend must be a non-negative USD amount.";
  }
  if (url && !URL_RE.test(url)) return "Proof URL must start with http:// or https://";
  if (requiredDone < required.length) {
    const pct = required.length ? requiredDone / required.length : 0;
    if (pct < 0.5) {
      return `Check required items — ${requiredDone}/${required.length} done. Partial days need ≥50% checklist + note.`;
    }
    if (note.length < 8 && !url) {
      return "Partial rubric day needs proof note (8+ chars) or URL.";
    }
  } else if (note.length < 8 && !url) {
    return "Add proof note (8+ chars) or URL to close rubric day.";
  }
  return null;
}

export function completeRubricDay(
  workspace: DelegateOperatorWorkspace,
  rubricId: string,
  input: RubricProofInput,
  thesis: ChannelThesis,
): { workspace: DelegateOperatorWorkspace; error?: string } {
  const rubric = workspace.daily_rubrics.find((r) => r.id === rubricId);
  if (!rubric) return { workspace, error: "Rubric day not found." };
  const err = validateRubricProof(rubric, input);
  if (err) return { workspace, error: err };

  const required = rubric.checklist.filter((c) => c.required);
  const checked = new Set(input.checked_ids);
  const requiredDone = required.filter((c) => checked.has(c.id)).length;
  const status: RubricDayStatus =
    requiredDone >= required.length ? "done" : "partial";

  const now = new Date().toISOString();
  const daily_rubrics = workspace.daily_rubrics.map((r) =>
    r.id === rubricId
      ? {
          ...r,
          status,
          checklist: r.checklist.map((c) => ({ ...c, checked: checked.has(c.id) })),
          proof_note: input.proof_note?.trim(),
          proof_url: input.proof_url?.trim(),
          actual_spend_usd: input.actual_spend_usd,
          completed_at: now,
        }
      : r,
  );

  let next: DelegateOperatorWorkspace = { ...workspace, daily_rubrics };
  next = { ...next, verdict: evaluateDelegatePerformance(next, thesis) };
  return { workspace: next };
}

export function getNextDelegateRubricDay(
  workspace: DelegateOperatorWorkspace,
  opsDayIndex?: number,
): DelegateDailyRubric | null {
  const activeBrief = workspace.briefs.find(
    (b) => b.status === "handed_off" || b.status === "in_progress",
  );
  if (!activeBrief) return null;
  const day = opsDayIndex ?? 1;
  const pending = workspace.daily_rubrics.filter(
    (r) =>
      r.brief_id === activeBrief.id &&
      (r.status === "pending" || r.status === "partial"),
  );
  const today = pending.find((r) => r.day_index === day);
  return today ?? pending[0] ?? null;
}

export function rubricCompletionSummary(
  workspace: DelegateOperatorWorkspace,
  briefId: string,
): string {
  const rubrics = workspace.daily_rubrics.filter((r) => r.brief_id === briefId);
  if (!rubrics.length) return "";
  const done = rubrics.filter((r) => r.status === "done").length;
  return `${done}/${rubrics.length} rubric days`;
}

export function delegateRubricSummary(
  workspace: DelegateOperatorWorkspace,
  opsDayIndex?: number,
): string | null {
  const next = getNextDelegateRubricDay(workspace, opsDayIndex);
  if (!next) return null;
  const brief = workspace.briefs.find((b) => b.id === next.brief_id);
  const done = next.checklist.filter((c) => c.checked).length;
  const total = next.checklist.length;
  return `D${next.day_index} ${done}/${total} checks · ${brief?.title ?? "Delegate brief"}`;
}

export function syncLaneBFromDelegateBrief(
  workspace: DelegateOperatorWorkspace,
  briefId: string,
  laneB: LaneBWorkspace,
  thesis: ChannelThesis,
  reserveCount = 30,
): { workspace: DelegateOperatorWorkspace; laneB: LaneBWorkspace } {
  const brief = workspace.briefs.find((b) => b.id === briefId);
  if (!brief) return { workspace, laneB };

  const target = resolveLaneCLinkTarget(thesis, brief, {});
  if (target !== "lane_b_outreach" && target !== "lane_b_calendar" && target !== "lane_b_runbook") {
    return { workspace, laneB };
  }

  const touchItems = laneB.items.filter((i) => i.title.startsWith("Touch ") || i.mode === "outreach_tracker");
  const empty = touchItems.filter((i) => !i.target_handle?.trim() && !i.target_name?.trim());
  const toReserve = empty.slice(0, reserveCount);
  const linked_ids = toReserve.map((i) => i.id);

  const briefs = workspace.briefs.map((b) =>
    b.id === briefId ? { ...b, linked_lane_b_ids: linked_ids } : b,
  );

  const lane_links = upsertLaneLink(workspace.lane_links, {
    brief_id: briefId,
    target,
    linked_ids,
    export_on_handoff: true,
    import_on_delivery: true,
  });

  const reservedItems = laneB.items.map((item) =>
    linked_ids.includes(item.id)
      ? {
          ...item,
          detail: `[VA reserved] ${brief.title}`,
        }
      : item,
  );

  return {
    workspace: { ...workspace, briefs, lane_links },
    laneB: { ...laneB, items: reservedItems },
  };
}

function upsertLaneLink(links: DelegateLaneLink[], link: DelegateLaneLink): DelegateLaneLink[] {
  const rest = links.filter((l) => l.brief_id !== link.brief_id);
  return [...rest, link];
}

export function parseOutboundImportLines(text: string): Array<{
  name: string;
  handle: string;
  channel?: string;
  note?: string;
}> {
  const rows: Array<{ name: string; handle: string; channel?: string; note?: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(OUTBOUND_LINE);
    if (!m) continue;
    rows.push({
      name: m[1]!.trim(),
      handle: m[2]!.trim(),
      channel: m[3]!.trim() || undefined,
      note: m[4]!.trim(),
    });
  }
  return rows;
}

export function parseSdrSendLines(text: string): Array<{
  row_id: string;
  sent_at?: string;
  reply_note?: string;
}> {
  const rows: Array<{ row_id: string; sent_at?: string; reply_note?: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(SDR_LINE);
    if (!m) continue;
    rows.push({
      row_id: m[1]!.trim(),
      sent_at: m[2]!.trim() || undefined,
      reply_note: m[3]!.trim(),
    });
  }
  return rows;
}

export function parseCreatorFilmLines(text: string): Array<{ hook: "A" | "B" | "C"; url: string }> {
  const rows: Array<{ hook: "A" | "B" | "C"; url: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(FILM_LINE);
    if (!m) continue;
    rows.push({ hook: m[1]!.toUpperCase() as "A" | "B" | "C", url: m[2]!.trim() });
  }
  return rows;
}

export function importDelegateDelivery(
  _workspace: DelegateOperatorWorkspace,
  brief: CmoDelegateBrief,
  proof: DelegateProofInput,
  ctx: {
    thesis: ChannelThesis;
    laneB?: LaneBWorkspace | null;
    influencerOperator?: InfluencerOperatorWorkspace | null;
    distributionOperator?: DistributionOperatorWorkspace | null;
  },
): ImportDelegateResult {
  const note = proof.note?.trim() ?? "";
  const errors: string[] = [];
  let imported = 0;
  const target = resolveLaneCLinkTarget(ctx.thesis, brief, ctx);

  if (target === "influencer_operator" && ctx.influencerOperator && note) {
    const result = importCreatorsFromDelegateProof(ctx.influencerOperator, brief, note);
    if (result.imported === 0) errors.push(...result.errors);
    return {
      influencerOperator: result.workspace,
      imported: result.imported,
      errors,
    };
  }

  if (target === "lane_b_outreach" && ctx.laneB && note) {
    const rows = parseOutboundImportLines(note);
    if (rows.length === 0 && parseCreatorImportLines(note).length > 0) {
      // Fallback: creator format into outreach rows
      const creators = parseCreatorImportLines(note);
      let laneB = ctx.laneB;
      const items = [...laneB.items];
      for (const row of creators) {
        const slot = items.find(
          (i) =>
            (brief.linked_lane_b_ids?.includes(i.id) || i.title.startsWith("Touch")) &&
            !i.target_handle?.trim(),
        );
        if (!slot) break;
        const idx = items.indexOf(slot);
        items[idx] = {
          ...slot,
          target_name: row.handle.replace(/^@/, ""),
          target_handle: row.handle.startsWith("@") ? row.handle : `@${row.handle}`,
          proof: row.note
            ? { note: row.note, completed_at: new Date().toISOString() }
            : slot.proof,
        };
        imported++;
      }
      return { laneB: { ...laneB, items }, imported, errors };
    }

    let laneB = ctx.laneB;
    const items = [...laneB.items];
    for (const row of rows) {
      const slot = items.find(
        (i) =>
          (brief.linked_lane_b_ids?.includes(i.id) || i.title.startsWith("Touch")) &&
          !i.target_handle?.trim(),
      );
      if (!slot) break;
      const idx = items.indexOf(slot);
      items[idx] = {
        ...slot,
        target_name: row.name,
        target_handle: row.handle,
        proof: row.note
          ? { note: row.note, completed_at: new Date().toISOString() }
          : slot.proof,
      };
      imported++;
    }
    if (rows.length > 0 && imported === 0) {
      errors.push("No empty outreach rows to import — reserve rows on handoff first.");
    }
    return { laneB: { ...laneB, items }, imported, errors };
  }

  if (target === "distribution_operator" && ctx.distributionOperator && note) {
    const films = parseCreatorFilmLines(note);
    const slots = ctx.distributionOperator.slots.map((s) => ({ ...s }));
    for (const film of films) {
      const hookIndex = film.hook === "A" ? 0 : film.hook === "B" ? 1 : 2;
      const slot = slots.find(
        (s, i) => i % 3 === hookIndex && s.status !== "posted" && s.status !== "measured",
      );
      if (!slot) continue;
      const idx = slots.indexOf(slot);
      slots[idx] = {
        ...slot,
        status: "posted",
        proof: {
          post_url: film.url,
          completed_at: new Date().toISOString(),
        },
      };
      imported++;
    }
    if (films.length > 0 && imported === 0) {
      errors.push("No distribution slots available for hook URLs.");
    }
    return {
      distributionOperator: { ...ctx.distributionOperator, slots },
      imported,
      errors,
    };
  }

  const sdrRows = parseSdrSendLines(note);
  if (sdrRows.length > 0 && ctx.laneB) {
    const items = ctx.laneB.items.map((item) => {
      const row = sdrRows.find((r) => r.row_id === item.id || r.row_id === item.title);
      if (!row) return item;
      imported++;
      return {
        ...item,
        status: "done" as const,
        proof: {
          note: row.reply_note ?? row.sent_at ?? "Sent",
          completed_at: new Date().toISOString(),
        },
      };
    });
    return { laneB: { ...ctx.laneB, items }, imported, errors };
  }

  if (!note) errors.push("Delivery note required for import.");
  return { imported, errors };
}

export function buildDelegateHandoffBundle(
  workspace: DelegateOperatorWorkspace,
  thesis: ChannelThesis,
  briefId: string,
  laneB?: LaneBWorkspace | null,
): DelegateHandoffBundle | null {
  const brief = workspace.briefs.find((b) => b.id === briefId);
  if (!brief) return null;
  const baseMd = buildDelegateHandoffMarkdown(workspace, thesis, briefId);
  if (!baseMd) return null;

  const hire = workspace.hire_blocks.find((h) => h.brief_id === briefId);
  const rubrics = workspace.daily_rubrics.filter((r) => r.brief_id === briefId);
  const rubric_schedule =
    rubrics.length > 0
      ? rubrics.map((r) => `- D${r.day_index}: ${r.title}`).join("\n")
      : "Rubrics generated on handoff.";

  let csv: string | undefined;
  if (laneB && laneB.mode === "outreach_tracker") {
    csv = outreachTrackerToCsv(laneB);
  }

  return {
    markdown: baseMd,
    hire_markdown: hire ? buildDelegateHireMarkdown(hire) : undefined,
    csv,
    rubric_schedule,
  };
}

export function evaluateDelegatePerformance(
  workspace: DelegateOperatorWorkspace,
  thesis: ChannelThesis,
  weekAssessment?: { pctOfTarget?: number },
): DelegateVerdict {
  const now = new Date().toISOString();
  const activeBrief = workspace.briefs.find(
    (b) => b.status === "handed_off" || b.status === "in_progress" || b.status === "done",
  );
  const briefId = activeBrief?.id;
  const rubrics = briefId
    ? workspace.daily_rubrics.filter((r) => r.brief_id === briefId)
    : workspace.daily_rubrics;

  if (!rubrics.length) {
    return {
      kind: "on_track",
      brief_id: briefId,
      headline: "Delegate brief ready — hand off to start rubric",
      rationale: ["Daily rubric starts when brief is handed off."],
      evidence: [],
      computed_at: now,
    };
  }

  const done = rubrics.filter((r) => r.status === "done").length;
  const total = rubrics.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const evidence = [`${done}/${total} rubric days complete (${pct}%)`];

  if (activeBrief?.status === "done" && pct >= 85 && (weekAssessment?.pctOfTarget ?? 80) >= 80) {
    return {
      kind: "promote",
      brief_id: briefId,
      headline: "Promote contractor — trial KPIs and rubric met",
      rationale: [
        "Brief delivered with strong rubric completion.",
        "Continue or expand scope next week.",
      ],
      evidence,
      computed_at: now,
    };
  }

  const consecutiveMiss = rubrics.filter((r) => r.status === "pending").length;
  if (consecutiveMiss >= 3 && activeBrief?.status === "handed_off") {
    return {
      kind: "release",
      brief_id: briefId,
      headline: "Release contractor — rubric days missed",
      rationale: [
        "Three or more rubric days still pending while brief active.",
        "Rewrite hire brief or switch contractor.",
      ],
      evidence,
      computed_at: now,
    };
  }

  const kpiPct = weekAssessment?.pctOfTarget ?? pct;
  if (kpiPct >= 40 && kpiPct < 80) {
    return {
      kind: "extend",
      brief_id: briefId,
      headline: "Extend trial +3 days — partial delivery",
      rationale: ["Rubric or trial KPI below promote threshold.", "Add 3 days with tighter checklist."],
      evidence,
      computed_at: now,
    };
  }

  if (kpiPct < 40 && activeBrief?.status !== "draft") {
    return {
      kind: "release",
      brief_id: briefId,
      headline: "Release contractor — trial KPI below 40%",
      rationale: ["Delivery evidence too weak for this channel thesis."],
      evidence,
      computed_at: now,
    };
  }

  void thesis;
  return {
    kind: "on_track",
    brief_id: briefId,
    headline: `Delegate on track — ${pct}% rubric complete`,
    rationale: ["Continue daily rubric check-ins."],
    evidence,
    computed_at: now,
  };
}

export function rollupDelegateKpis(
  workspace: DelegateOperatorWorkspace,
): ManualKpi[] {
  const kpis: ManualKpi[] = [];
  const now = new Date().toISOString();
  const rubrics = workspace.daily_rubrics;
  if (rubrics.length) {
    const done = rubrics.filter((r) => r.status === "done").length;
    const pct = Math.round((done / rubrics.length) * 100);
    const preset = KPI_PRESETS.find((p) => p.id === "delegate_rubric_completion_pct");
    kpis.push({
      id: "delegate_rubric_completion_pct",
      name: preset?.name ?? "Delegate rubric completion",
      value: pct,
      target: preset?.defaultTarget ?? 85,
      unit: "%",
      source: "manual",
      updated_at: now,
    });
  }

  let enriched = 0;
  for (const brief of workspace.briefs) {
    if (brief.linked_lane_b_ids?.length) enriched += brief.linked_lane_b_ids.length;
  }
  if (enriched > 0) {
    const preset = KPI_PRESETS.find((p) => p.id === "delegate_contacts_enriched");
    kpis.push({
      id: "delegate_contacts_enriched",
      name: preset?.name ?? "Delegate contacts reserved",
      value: enriched,
      target: preset?.defaultTarget ?? 30,
      unit: "contacts",
      source: "manual",
      updated_at: now,
    });
  }

  const onTime = workspace.briefs.filter(
    (b) => b.status === "done" && b.proof?.completed_at,
  ).length;
  if (onTime > 0) {
    kpis.push({
      id: "delegate_deliverables_on_time",
      name: "Delegate briefs delivered",
      value: onTime,
      unit: "briefs",
      source: "manual",
      updated_at: now,
    });
  }

  return kpis;
}

function enhanceBrief(brief: CmoDelegateBrief, thesis: ChannelThesis): CmoDelegateBrief {
  const hire_kind = inferHireKind(brief, thesis.id);
  return {
    ...brief,
    hire_kind,
    rubric_days: brief.rubric_days ?? defaultRubricDays(hire_kind),
  };
}

export function createDelegateOperatorFromThesis(
  thesis: ChannelThesis,
  opts?: {
    opsCadence?: CmoOpsCadence;
    week_index?: number;
    now?: string;
  },
): DelegateOperatorWorkspace | null {
  const base = createDelegateWorkspaceFromThesis(thesis, opts);
  if (!base) return null;

  const briefs = base.briefs.map((b) => {
    const enhanced = enhanceBrief(b, thesis);
    return {
      ...enhanced,
      lane_link_target: resolveLaneCLinkTarget(thesis, enhanced, {}),
    };
  });

  const hire_blocks = briefs.map((b) => buildDelegateHireScaffold(thesis, b));

  return {
    id: base.id.replace(/^lanec\./, "delop."),
    thesis_id: base.thesis_id,
    week_index: base.week_index,
    started_at: base.started_at,
    ops_cadence_id: base.ops_cadence_id,
    briefs,
    hire_blocks,
    daily_rubrics: [],
    lane_links: briefs.map((b) => ({
      brief_id: b.id,
      target: b.lane_link_target ?? "lane_b_outreach",
      linked_ids: [],
      export_on_handoff: true,
      import_on_delivery: true,
    })),
  };
}

export function prepareDelegateHandoff(
  workspace: DelegateOperatorWorkspace,
  briefId: string,
  input: { assignee_name: string; assignee_contact?: string; handoff_note?: string },
  thesis: ChannelThesis,
  laneB?: LaneBWorkspace | null,
): { workspace: DelegateOperatorWorkspace; laneB?: LaneBWorkspace; error?: string } {
  const handed = handOffDelegateBrief(workspace, briefId, input);
  if (handed.error) return { workspace, error: handed.error };

  let next = migrateToOperatorWorkspace(handed.workspace, thesis);
  const rubrics = createDailyRubricsForBrief(next, briefId, thesis);
  next = {
    ...next,
    daily_rubrics: [
      ...next.daily_rubrics.filter((r) => r.brief_id !== briefId),
      ...rubrics,
    ],
    briefs: next.briefs.map((b) =>
      b.id === briefId ? { ...b, status: "in_progress" as const } : b,
    ),
  };

  let syncedLaneB = laneB ?? undefined;
  const brief = next.briefs.find((b) => b.id === briefId)!;
  if (laneB && resolveLaneCLinkTarget(thesis, brief, {}) === "lane_b_outreach") {
    const synced = syncLaneBFromDelegateBrief(next, briefId, laneB, thesis);
    next = synced.workspace;
    syncedLaneB = synced.laneB;
  }

  next = { ...next, verdict: evaluateDelegatePerformance(next, thesis) };
  return { workspace: next, laneB: syncedLaneB };
}

export function migrateToOperatorWorkspace(
  ws: CmoDelegateWorkspace,
  thesis: ChannelThesis,
): DelegateOperatorWorkspace {
  if ("hire_blocks" in ws && Array.isArray((ws as DelegateOperatorWorkspace).hire_blocks)) {
    return ws as DelegateOperatorWorkspace;
  }
  const briefs = ws.briefs.map((b) => {
    const enhanced = enhanceBrief(b, thesis);
    return {
      ...enhanced,
      lane_link_target: resolveLaneCLinkTarget(thesis, enhanced, {}),
    };
  });
  return {
    id: ws.id.startsWith("delop.") ? ws.id : ws.id.replace(/^lanec\./, "delop."),
    thesis_id: ws.thesis_id,
    week_index: ws.week_index,
    started_at: ws.started_at,
    ops_cadence_id: ws.ops_cadence_id,
    briefs,
    hire_blocks: briefs.map((b) => buildDelegateHireScaffold(thesis, b)),
    daily_rubrics: [],
    lane_links: briefs.map((b) => ({
      brief_id: b.id,
      target: b.lane_link_target ?? "lane_b_outreach",
      linked_ids: b.linked_lane_b_ids ?? [],
      export_on_handoff: true,
      import_on_delivery: true,
    })),
  };
}

export function resolveDelegateOperator(
  raw: CmoDelegateWorkspace | DelegateOperatorWorkspace | null | undefined,
  thesis?: ChannelThesis | null,
): DelegateOperatorWorkspace | null {
  if (!raw) return null;
  if ("hire_blocks" in raw && Array.isArray((raw as DelegateOperatorWorkspace).hire_blocks)) {
    return raw as DelegateOperatorWorkspace;
  }
  if (!thesis) return null;
  return migrateToOperatorWorkspace(raw as CmoDelegateWorkspace, thesis);
}

export function hydrateDelegateOperatorFromJson(
  raw: unknown,
  thesis?: ChannelThesis | null,
): DelegateOperatorWorkspace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (Array.isArray(o.hire_blocks) && Array.isArray(o.daily_rubrics)) {
    const base = hydrateDelegateWorkspaceFromJson(raw);
    if (!base) return null;
    return {
      ...base,
      hire_blocks: o.hire_blocks as DelegateHireBlock[],
      daily_rubrics: o.daily_rubrics as DelegateDailyRubric[],
      lane_links: Array.isArray(o.lane_links) ? (o.lane_links as DelegateLaneLink[]) : [],
      verdict: o.verdict as DelegateVerdict | undefined,
    };
  }

  const legacy = hydrateDelegateWorkspaceFromJson(raw);
  if (!legacy || !thesis) return legacy as DelegateOperatorWorkspace;
  return migrateToOperatorWorkspace(legacy, thesis);
}

export function isDelegateOperatorGate(input: {
  thesis?: ChannelThesis | null;
  opsCadence?: CmoOpsCadence | null;
}): boolean {
  if (!input.thesis || !input.opsCadence) return false;
  return thesisHasDelegateLane(input.thesis.id);
}

export const buildDelegateOperator = createDelegateOperatorFromThesis;
