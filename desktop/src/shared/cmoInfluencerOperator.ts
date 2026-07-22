/**
 * P9 — Influencer Operator: creator pipeline, pitch variants, deal/UTM tracking, scale/kill/double-down.
 * See CMO_INFLUENCER_OPERATOR_SPEC.md and PRODUCT_NORTH_STAR.md §11 P9.
 */
import type { ChannelThesis } from "./cmoIntake";
import { resolveNarrativeContext, withNarrativePrefix } from "./cmoNarrativeContext";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import { measureUserOpsTaskId, primaryUserOpsTaskId } from "./cmoHumanExecutionBind";
import type { GrowthControlPlane } from "./cmoGrowthPlane";
import { evaluateWeek1Metrics } from "./cmoProofLoop";
import type { CmoDelegateBrief } from "./cmoLaneC";
import type { LaneBItem, LaneBWorkspace } from "./cmoLaneB";
import { KPI_PRESETS } from "./kpiPresets";
import type { GrowthNarrative, ManualKpi, MarketingProfile } from "./types";

export type InfluencerOperatorMode = "micro_influencer_dm";

export type InfluencerPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "x"
  | "newsletter"
  | "podcast";

export type PitchTemplateId = "micro_cold" | "warm_intro" | "podcast_newsletter";

export type PipelineStage =
  | "research"
  | "pitched"
  | "replied"
  | "negotiating"
  | "brief_sent"
  | "live"
  | "reporting"
  | "skipped";

export type DealStructure =
  | "affiliate_only"
  | "product_for_post"
  | "base_plus_cpa"
  | "flat_fee";

export type InfluencerVerdictKind = "test_more" | "scale" | "kill" | "double_down";

export interface InfluencerPitch {
  id: string;
  label: string;
  template_id: PitchTemplateId;
  script_scaffold: string;
  reply_target: number;
}

export interface InfluencerDeal {
  structure?: DealStructure;
  base_comp_usd?: number;
  affiliate_pct?: number;
  promo_code?: string;
  utm_campaign?: string;
  utm_link?: string;
  disclosure_ack?: boolean;
  exclusivity_days?: number;
  agreed_at?: string;
}

export interface InfluencerTouchProof {
  dm_sent_at?: string;
  thread_url?: string;
  reply_received?: boolean;
  reply_interest?: "cold" | "warm" | "hot";
  reply_note?: string;
  live_post_url?: string;
  clicks?: number;
  signups?: number;
  spend_usd?: number;
  note?: string;
  completed_at: string;
}

export interface InfluencerTouch {
  id: string;
  day_index: number;
  pitch_id: string;
  pipeline_stage: PipelineStage;
  platform: InfluencerPlatform;
  target_name: string;
  target_handle: string;
  followers?: number;
  engagement_rate_pct?: number;
  icp_fit?: 1 | 2 | 3 | 4 | 5;
  deal?: InfluencerDeal;
  /** P14 — planned share of the weekly influencer cap. */
  cost_estimate_usd?: number;
  proof?: InfluencerTouchProof;
  linked_lane_b_id?: string;
  linked_ops_task_id?: string;
  linked_delegate_brief_id?: string;
  sort_order: number;
}

export interface WeeklyOutreachTarget {
  day_index: number;
  min_dms: number;
  max_dms: number;
  done_dms: number;
}

export interface InfluencerVerdict {
  kind: InfluencerVerdictKind;
  pitch_id?: string;
  headline: string;
  rationale: string[];
  evidence: string[];
  computed_at: string;
}

export interface InfluencerOperatorWorkspace {
  id: string;
  mode: InfluencerOperatorMode;
  thesis_id: "influencer_partnerships";
  week_index: number;
  ops_cadence_id?: string;
  started_at: string;
  pitches: InfluencerPitch[];
  touches: InfluencerTouch[];
  weekly_targets: WeeklyOutreachTarget[];
  primary_kpi_id: "influencer_replies" | "influencer_cpa_qualified_signup";
  verdict?: InfluencerVerdict;
}

export interface InfluencerProofInput {
  thread_url?: string;
  reply_received?: boolean;
  reply_interest?: "cold" | "warm" | "hot";
  reply_note?: string;
  live_post_url?: string;
  clicks?: number;
  signups?: number;
  spend_usd?: number;
  note?: string;
}

export interface WeeklyOutreachSummary {
  day_index: number;
  min: number;
  max: number;
  done: number;
  remaining: number;
}

export interface CreateInfluencerOperatorOpts {
  opsCadence?: CmoOpsCadence;
  week_index?: number;
  doubleDown?: boolean;
  winningPitchId?: string;
  priorWorkspace?: InfluencerOperatorWorkspace;
  productUrl?: string;
  narrative?: GrowthNarrative;
  now?: string;
}

const INFLUENCER_PITCHES: InfluencerPitch[] = [
  {
    id: "pitch.a",
    label: "Pitch A",
    template_id: "micro_cold",
    script_scaffold:
      "Hey {handle} — Your post on [specific topic] is exactly the audience we built {product} for. {product} helps {icp} {outcome}. We'd love to sponsor a 60-sec integration — creative freedom + unique tracking link.",
    reply_target: 1,
  },
  {
    id: "pitch.b",
    label: "Pitch B",
    template_id: "warm_intro",
    script_scaffold:
      "Hey {handle} — [Mutual name] suggested I reach out. Your recent post on [topic] confirms fit. We're launching {product} to {icp}: {outcome}. Proposal: deliverable + comp structure. Demo Loom attached.",
    reply_target: 1,
  },
  {
    id: "pitch.c",
    label: "Pitch C",
    template_id: "podcast_newsletter",
    script_scaffold:
      "Hey {handle} — Guest + sponsor hybrid for [show name]? {product} helps {icp} {outcome}. Newsletter/podcast mention with affiliate or flat fee — one-page brief, editorial control.",
    reply_target: 1,
  },
];

const URL_RE = /^https?:\/\/[^\s]+$/i;
const DEFAULT_PRODUCT_URL = "https://example.com";

function resolveInfluencerOpsLinks(
  thesis: ChannelThesis,
  opsCadence?: CmoOpsCadence,
): { primary?: string; measure?: string } {
  if (opsCadence) {
    return {
      primary: primaryUserOpsTaskId(opsCadence),
      measure: measureUserOpsTaskId(opsCadence),
    };
  }
  const idx = thesis.week1_priorities.findIndex((p) => p.owner === "user");
  if (idx < 0) return {};
  const p = thesis.week1_priorities[idx]!;
  const id = `${thesis.id}.w1.${idx}`;
  return { primary: p.id ?? id, measure: p.id ?? id };
}

function weeklyTargets(doubleDown: boolean): WeeklyOutreachTarget[] {
  const ramp = [
    { day: 1, min: 2, max: 2 },
    { day: 2, min: 2, max: 2 },
    { day: 3, min: 3, max: 3 },
    { day: 4, min: 3, max: 3 },
    { day: 5, min: 3, max: 3 },
    { day: 6, min: 2, max: 2 },
    { day: 7, min: 2, max: 2 },
  ];
  return ramp.map(({ day, min, max }) => ({
    day_index: day,
    min_dms: doubleDown ? min + 1 : min,
    max_dms: doubleDown ? max + 1 : max,
    done_dms: 0,
  }));
}

function pitchForIndex(index: number, pitches: InfluencerPitch[]): InfluencerPitch {
  return pitches[index % pitches.length]!;
}

function dayForTouchIndex(i: number, total: number): number {
  return Math.min(7, 1 + Math.floor((i / total) * 6));
}

function slugFromHandle(handle: string): string {
  const raw = handle.replace(/^@+/, "").trim().toLowerCase();
  const slug = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return slug || "creator";
}

export function generateCreatorUtm(
  handle: string,
  productUrl = DEFAULT_PRODUCT_URL,
): { utm_campaign: string; promo_code: string; utm_link: string } {
  const slug = slugFromHandle(handle);
  const utm_campaign = `creator_${slug}`;
  const promo = slug.replace(/_/g, "").slice(0, 12).toUpperCase();
  const promo_code = `${promo}10`;
  const sep = productUrl.includes("?") ? "&" : "?";
  const utm_link = `${productUrl}${sep}utm_source=influencer&utm_medium=creator&utm_campaign=${utm_campaign}`;
  return { utm_campaign, promo_code, utm_link };
}

function buildTouches(
  thesis: ChannelThesis,
  linkedOps: { primary?: string; measure?: string } | undefined,
  opts: {
    count: number;
    pitches: InfluencerPitch[];
    doubleDown?: boolean;
    prior?: InfluencerOperatorWorkspace;
  },
): InfluencerTouch[] {
  const touches: InfluencerTouch[] = [];
  const carryForward =
    opts.prior?.touches.filter((t) =>
      ["replied", "negotiating", "brief_sent", "live"].includes(t.pipeline_stage),
    ) ?? [];

  for (let i = 0; i < carryForward.length && i < 5; i++) {
    const src = carryForward[i]!;
    touches.push({
      ...src,
      id: `${thesis.id}.influencer.carry.${i}.${Date.now()}`,
      day_index: Math.min(7, src.day_index),
      sort_order: i,
    });
  }

  const startIdx = touches.length;
  for (let i = 0; i < opts.count; i++) {
    const pitch = pitchForIndex(i, opts.pitches);
    const globalIdx = startIdx + i;
    touches.push({
      id: `${thesis.id}.influencer.touch.${globalIdx}`,
      day_index: dayForTouchIndex(i, opts.count),
      pitch_id: pitch.id,
      pipeline_stage: "research",
      platform: "tiktok",
      target_name: `Creator ${globalIdx + 1}`,
      target_handle: "",
      sort_order: globalIdx,
      linked_ops_task_id:
        globalIdx === opts.count - 1 ? linkedOps?.primary : undefined,
    });
  }
  return touches;
}

export function createInfluencerOperatorFromThesis(
  thesis: ChannelThesis,
  opts?: CreateInfluencerOperatorOpts,
): InfluencerOperatorWorkspace | null {
  if (thesis.id !== "influencer_partnerships") return null;

  const linkedOps = resolveInfluencerOpsLinks(thesis, opts?.opsCadence);
  const weekIndex = opts?.week_index ?? opts?.opsCadence?.week_index ?? 1;
  const now = opts?.now ?? new Date().toISOString();
  const doubleDown = opts?.doubleDown ?? false;

  let pitches = [...INFLUENCER_PITCHES];
  if (doubleDown && opts?.winningPitchId) {
    pitches = pitches.filter((p) => p.id === opts.winningPitchId);
    if (pitches.length === 0) pitches = [...INFLUENCER_PITCHES];
  }
  const narrative = resolveNarrativeContext(opts?.narrative);
  pitches = pitches.map((pitch) => ({
    ...pitch,
    script_scaffold: withNarrativePrefix(pitch.script_scaffold, narrative, 420),
  }));

  const touchCount = doubleDown ? 20 : 15;

  return {
    id: `infop.${thesis.id}.w${weekIndex}.${Date.now()}`,
    mode: "micro_influencer_dm",
    thesis_id: "influencer_partnerships",
    week_index: weekIndex,
    ops_cadence_id: opts?.opsCadence?.id,
    started_at: now,
    pitches,
    touches: buildTouches(thesis, linkedOps, {
      count: touchCount,
      pitches,
      doubleDown,
      prior: opts?.priorWorkspace,
    }),
    weekly_targets: weeklyTargets(doubleDown),
    primary_kpi_id: "influencer_replies",
  };
}

export function isInfluencerOperatorGate(input: {
  thesis?: ChannelThesis | null;
  opsCadence?: CmoOpsCadence | null;
  growthPlane?: GrowthControlPlane | null;
}): boolean {
  if (input.thesis?.id !== "influencer_partnerships") return false;
  if (!input.opsCadence) return false;
  const gtm = input.growthPlane?.binding.gtm;
  if (!gtm) return true;
  return gtm === "awareness" || gtm === "distribution";
}

export function currentInfluencerDayIndex(workspace: InfluencerOperatorWorkspace): number {
  const incomplete = workspace.weekly_targets.find((t) => t.done_dms < t.min_dms);
  return (
    incomplete?.day_index ??
    workspace.weekly_targets[workspace.weekly_targets.length - 1]?.day_index ??
    1
  );
}

export function recomputeWeeklyDoneDms(
  workspace: InfluencerOperatorWorkspace,
): InfluencerOperatorWorkspace {
  const pitchedByDay = new Map<number, number>();
  for (const t of workspace.touches) {
    if (t.pipeline_stage === "skipped") continue;
    if (
      ["pitched", "replied", "negotiating", "brief_sent", "live", "reporting"].includes(
        t.pipeline_stage,
      )
    ) {
      pitchedByDay.set(t.day_index, (pitchedByDay.get(t.day_index) ?? 0) + 1);
    }
  }
  const weekly_targets = workspace.weekly_targets.map((wt) => ({
    ...wt,
    done_dms: pitchedByDay.get(wt.day_index) ?? 0,
  }));
  return { ...workspace, weekly_targets };
}

export function resolveWeeklyOutreachTarget(
  workspace: InfluencerOperatorWorkspace,
  dayIndex: number,
): WeeklyOutreachSummary {
  const wt =
    workspace.weekly_targets.find((t) => t.day_index === dayIndex) ??
    workspace.weekly_targets[0]!;
  const min = wt.min_dms;
  const max = wt.max_dms;
  const done = wt.done_dms;
  return {
    day_index: dayIndex,
    min,
    max,
    done,
    remaining: Math.max(0, min - done),
  };
}

export function validateInfluencerProof(
  touch: InfluencerTouch,
  proof: InfluencerProofInput,
  targetStage: PipelineStage,
  deal?: InfluencerDeal,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (proof.spend_usd != null && (!Number.isFinite(proof.spend_usd) || proof.spend_usd < 0)) {
    errors.push("Actual spend must be a non-negative USD amount.");
  }

  if (targetStage === "pitched") {
    if (!touch.target_handle || touch.target_handle.trim().length < 2) {
      errors.push("Creator handle required (2+ chars) before logging DM sent.");
    }
    const hasUrl = proof.thread_url && URL_RE.test(proof.thread_url.trim());
    const hasNote = proof.note && proof.note.trim().length >= 8;
    if (!hasUrl && !hasNote) {
      errors.push("DM proof needs thread URL or note (8+ chars) — e.g. “DM sent to @creator”.");
    }
    return { ok: errors.length === 0, errors };
  }

  if (targetStage === "replied") {
    const hasUrl = proof.thread_url && URL_RE.test(proof.thread_url.trim());
    if (!hasUrl || proof.thread_url!.trim().length < 8) {
      errors.push("Thread URL required (min 8 chars) — paste the DM or email thread link.");
    }
    if (!proof.reply_received) {
      errors.push("Log reply interest — this pitch test closes on replies, not send volume alone.");
    }
    if (!proof.reply_interest) {
      errors.push("Select reply interest: cold, warm, or hot.");
    }
    if (!proof.reply_note || proof.reply_note.trim().length < 8) {
      errors.push("Reply note required (8+ chars) — what they said and next step.");
    }
    return { ok: errors.length === 0, errors };
  }

  if (targetStage === "brief_sent" || targetStage === "negotiating") {
    const d = deal ?? touch.deal;
    if (!d?.structure) errors.push("Deal structure required before brief sent.");
    if (!d?.promo_code?.trim()) errors.push("Promo code required — generate UTM before outreach.");
    if (!d?.utm_campaign?.trim()) errors.push("UTM campaign slug required.");
    if (!d?.disclosure_ack) {
      errors.push("#ad / paid partnership disclosure must be acknowledged in brief.");
    }
    return { ok: errors.length === 0, errors };
  }

  if (targetStage === "live") {
    if (!proof.live_post_url || !URL_RE.test(proof.live_post_url.trim())) {
      errors.push("Live post URL required — paste the published link.");
    }
    return { ok: errors.length === 0, errors };
  }

  if (targetStage === "reporting") {
    const hasSignups = proof.signups != null && !Number.isNaN(proof.signups);
    const hasClicks = proof.clicks != null && !Number.isNaN(proof.clicks);
    const hasNote = proof.note && proof.note.trim().length >= 8;
    if (!hasSignups && !(hasClicks && hasNote)) {
      errors.push("Log signups or clicks + note — measurement closes on attribution, not vibes.");
    }
    return { ok: errors.length === 0, errors };
  }

  return { ok: true, errors: [] };
}

export function updateInfluencerTouchCreator(
  workspace: InfluencerOperatorWorkspace,
  touchId: string,
  fields: Partial<
    Pick<
      InfluencerTouch,
      | "target_name"
      | "target_handle"
      | "platform"
      | "followers"
      | "engagement_rate_pct"
      | "icp_fit"
    >
  >,
): InfluencerOperatorWorkspace {
  const touches = workspace.touches.map((t) =>
    t.id === touchId ? { ...t, ...fields } : t,
  );
  return { ...workspace, touches };
}

export function completeInfluencerTouch(
  workspace: InfluencerOperatorWorkspace,
  touchId: string,
  targetStage: PipelineStage,
  proof: InfluencerProofInput,
  deal?: InfluencerDeal,
  productUrl?: string,
): { workspace: InfluencerOperatorWorkspace; error?: string } {
  const touch = workspace.touches.find((t) => t.id === touchId);
  if (!touch) return { workspace, error: "Touch not found." };
  if (touch.pipeline_stage === "skipped") {
    return { workspace, error: "Touch was skipped." };
  }

  const validation = validateInfluencerProof(touch, proof, targetStage, deal);
  if (!validation.ok) return { workspace, error: validation.errors.join(" ") };

  const now = new Date().toISOString();
  const mergedProof: InfluencerTouchProof = {
    ...touch.proof,
    ...proof,
    dm_sent_at: targetStage === "pitched" ? now : touch.proof?.dm_sent_at,
    completed_at: now,
  };

  let mergedDeal = touch.deal;
  if (deal) {
    mergedDeal = { ...touch.deal, ...deal, agreed_at: deal.agreed_at ?? now };
  } else if (
    (targetStage === "brief_sent" || targetStage === "negotiating") &&
    touch.target_handle
  ) {
    const utm = generateCreatorUtm(touch.target_handle, productUrl);
    mergedDeal = {
      ...touch.deal,
      utm_campaign: utm.utm_campaign,
      promo_code: utm.promo_code,
      utm_link: utm.utm_link,
    };
  }

  const nextTouches = workspace.touches.map((t) =>
    t.id === touchId
      ? {
          ...t,
          pipeline_stage: targetStage,
          proof: mergedProof,
          deal: mergedDeal,
        }
      : t,
  );

  let next = recomputeWeeklyDoneDms({ ...workspace, touches: nextTouches });
  next = { ...next, verdict: evaluatePitchPerformance(next) };
  return { workspace: next };
}

export function skipInfluencerTouch(
  workspace: InfluencerOperatorWorkspace,
  touchId: string,
): InfluencerOperatorWorkspace {
  const touches = workspace.touches.map((t) =>
    t.id === touchId ? { ...t, pipeline_stage: "skipped" as const } : t,
  );
  return recomputeWeeklyDoneDms({ ...workspace, touches });
}

export function countReplies(workspace: InfluencerOperatorWorkspace): number {
  return workspace.touches.filter((t) => t.proof?.reply_received).length;
}

export function evaluatePitchPerformance(
  workspace: InfluencerOperatorWorkspace,
  weekAssessment?: { pctOfTarget?: number; primaryValue?: number; primaryTarget?: number },
): InfluencerVerdict {
  const now = new Date().toISOString();
  const evidence: string[] = [];

  for (const pitch of workspace.pitches) {
    const pitched = workspace.touches.filter(
      (t) => t.pitch_id === pitch.id && t.pipeline_stage === "pitched",
    );
    const warmReplies = workspace.touches.filter(
      (t) =>
        t.pitch_id === pitch.id &&
        t.proof?.reply_received &&
        (t.proof.reply_interest === "warm" || t.proof.reply_interest === "hot"),
    );

    if (pitched.length >= 5 && warmReplies.length === 0) {
      const repliedAny = workspace.touches.some(
        (t) => t.pitch_id === pitch.id && t.proof?.reply_received,
      );
      if (!repliedAny) {
        evidence.push(`${pitch.label}: ${pitched.length} DMs, zero replies`);
        return {
          kind: "kill",
          pitch_id: pitch.id,
          headline: `Kill ${pitch.label} — rewrite pitch, don't tweak subject line only`,
          rationale: [
            "Five or more sends with zero replies means the opener failed.",
            "Rewrite the hook line — do not adjust formatting only.",
          ],
          evidence,
          computed_at: now,
        };
      }
    }

    if (warmReplies.length >= 2) {
      evidence.push(`${pitch.label}: ${warmReplies.length} warm/hot replies`);
      const pct = weekAssessment?.pctOfTarget;
      if (pct != null && pct >= 50) {
        return {
          kind: "double_down",
          pitch_id: pitch.id,
          headline: `Double down on ${pitch.label} — scale outreach this week`,
          rationale: [
            "Two or more warm replies on the same pitch variant.",
            `Week KPI at ${pct}% of target — increase DM volume on winning pitch.`,
          ],
          evidence,
          computed_at: now,
        };
      }
      return {
        kind: "scale",
        pitch_id: pitch.id,
        headline: `Scale ${pitch.label} — winning reply pattern`,
        rationale: [
          "Two or more warm/hot replies on this pitch.",
          "Personalize 5 more DMs using this opener before testing new variants.",
        ],
        evidence,
        computed_at: now,
      };
    }
  }

  const pitchesWithReply = workspace.pitches.filter((p) =>
    workspace.touches.some(
      (t) => t.pitch_id === p.id && t.proof?.reply_received,
    ),
  );

  return {
    kind: "test_more",
    headline: "Keep A/B/C pitch tests running",
    rationale: [
      pitchesWithReply.length < 3
        ? "Need signal on each pitch variant before scale/kill verdict."
        : "Continue logging replies with interest level.",
    ],
    evidence,
    computed_at: now,
  };
}

export function evaluatePitchPerformanceWithProfile(
  workspace: InfluencerOperatorWorkspace,
  cadence: CmoOpsCadence,
  profile: MarketingProfile | null | undefined,
  thesis: ChannelThesis,
): InfluencerVerdict {
  const assessment = evaluateWeek1Metrics(cadence, profile, thesis);
  return evaluatePitchPerformance(workspace, {
    pctOfTarget: assessment.pctOfTarget,
    primaryValue: assessment.primaryValue,
    primaryTarget: assessment.primaryTarget,
  });
}

export function getNextInfluencerTouch(
  workspace: InfluencerOperatorWorkspace,
): InfluencerTouch | null {
  const day = currentInfluencerDayIndex(workspace);
  const active = workspace.touches.filter((t) => t.pipeline_stage !== "skipped");

  const researchReady = active.filter(
    (t) => t.pipeline_stage === "research" && t.target_handle.trim().length >= 2,
  );
  const todayResearch = researchReady.filter((t) => t.day_index === day);
  if (todayResearch.length > 0) return todayResearch[0]!;

  const pendingResearch = researchReady.sort((a, b) => a.day_index - b.day_index);
  if (pendingResearch.length > 0) return pendingResearch[0]!;

  const pitched = active.filter((t) => t.pipeline_stage === "pitched");
  if (pitched.length > 0) return pitched.sort((a, b) => a.sort_order - b.sort_order)[0]!;

  const replied = active.filter((t) => t.pipeline_stage === "replied");
  if (replied.length > 0) return replied[0]!;

  const reporting = active.filter((t) => t.pipeline_stage === "live");
  if (reporting.length > 0) return reporting[0]!;

  const emptyResearch = active.filter(
    (t) => t.pipeline_stage === "research" && !t.target_handle.trim(),
  );
  return emptyResearch[0] ?? null;
}

export function touchDisplayLabel(
  workspace: InfluencerOperatorWorkspace,
  touch: InfluencerTouch,
): string {
  const pitch = workspace.pitches.find((p) => p.id === touch.pitch_id);
  const pitchLabel = pitch?.label ?? touch.pitch_id;
  const handle = touch.target_handle.trim() || touch.target_name;

  switch (touch.pipeline_stage) {
    case "research":
      return handle.length >= 2
        ? `Send DM — ${pitchLabel} → ${handle}`
        : `Add creator handle — ${pitchLabel}`;
    case "pitched":
      return `Log reply — ${handle} (${pitchLabel})`;
    case "replied":
      return `Deal + UTM — ${handle}`;
    case "negotiating":
    case "brief_sent":
      return `Publish post — ${handle}`;
    case "live":
      return `Log signups — ${handle}`;
    default:
      return `${pitchLabel} — ${handle}`;
  }
}

export function pitchScaffoldForTouch(
  workspace: InfluencerOperatorWorkspace,
  touch: InfluencerTouch,
  product = "{product}",
  icp = "{icp}",
  outcome = "{outcome}",
): string {
  const pitch = workspace.pitches.find((p) => p.id === touch.pitch_id);
  const scaffold = pitch?.script_scaffold ?? "";
  const handle = touch.target_handle.trim() || "{handle}";
  return scaffold
    .replace(/\{handle\}/g, handle)
    .replace(/\{product\}/g, product)
    .replace(/\{icp\}/g, icp)
    .replace(/\{outcome\}/g, outcome);
}

export function syncLaneBFromInfluencerOperator(
  workspace: InfluencerOperatorWorkspace,
  laneB: LaneBWorkspace,
): { workspace: InfluencerOperatorWorkspace; laneB: LaneBWorkspace } {
  const prep: LaneBItem = {
    id: `${workspace.thesis_id}.laneb.outreach.prep`,
    mode: "outreach_tracker",
    title: "Review outreach templates + personalize opener",
    detail: "DM 15 micro-influencers with personalized pitch",
    channel: "dm",
    day: 1,
    status: "pending",
    sort_order: 0,
  };

  const items: LaneBItem[] = workspace.touches.map((touch, i) => ({
    id: touch.linked_lane_b_id ?? `${workspace.thesis_id}.laneb.influencer.${i}`,
    mode: "outreach_tracker" as const,
    title: touch.target_handle.trim()
      ? `DM ${touch.target_handle}`
      : `Touch ${i + 1}`,
    detail: touchDisplayLabel(workspace, touch),
    channel: "dm",
    day: touch.day_index,
    target_name: touch.target_name,
    target_handle: touch.target_handle,
    status:
      touch.pipeline_stage === "skipped"
        ? "skipped"
        : ["pitched", "replied", "negotiating", "brief_sent", "live", "reporting"].includes(
              touch.pipeline_stage,
            )
          ? "done"
          : "pending",
    proof: touch.proof?.thread_url || touch.proof?.reply_note
      ? {
          url: touch.proof.thread_url,
          note: touch.proof.reply_note ?? touch.proof.note,
          metric: touch.proof.signups != null ? String(touch.proof.signups) : undefined,
          completed_at: touch.proof.completed_at,
        }
      : undefined,
    linked_ops_task_id: touch.linked_ops_task_id,
    sort_order: i + 1,
  }));

  const linkedTouches = workspace.touches.map((t, i) => ({
    ...t,
    linked_lane_b_id: items[i]?.id ?? t.linked_lane_b_id,
  }));

  return {
    workspace: { ...workspace, touches: linkedTouches },
    laneB: { ...laneB, mode: "outreach_tracker", items: [prep, ...items] },
  };
}

export interface ImportCreatorRow {
  handle: string;
  platform?: InfluencerPlatform;
  icp_fit?: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

const IMPORT_LINE =
  /^@?([\w.]+)\s*\|\s*([\w]+)\s*\|\s*(?:fit\s*)?([1-5])\s*(?:\|\s*(.+))?$/i;

export function parseCreatorImportLines(text: string): ImportCreatorRow[] {
  const rows: ImportCreatorRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(IMPORT_LINE);
    if (!m) continue;
    const platformRaw = m[2]!.toLowerCase();
    const platformMap: Record<string, InfluencerPlatform> = {
      instagram: "instagram",
      ig: "instagram",
      tiktok: "tiktok",
      tt: "tiktok",
      youtube: "youtube",
      yt: "youtube",
      linkedin: "linkedin",
      x: "x",
      twitter: "x",
      newsletter: "newsletter",
      podcast: "podcast",
    };
    rows.push({
      handle: `@${m[1]!.replace(/^@/, "")}`,
      platform: platformMap[platformRaw] ?? "tiktok",
      icp_fit: Number(m[3]) as 1 | 2 | 3 | 4 | 5,
      note: m[4]?.trim(),
    });
  }
  return rows;
}

export function importCreatorsFromDelegateProof(
  workspace: InfluencerOperatorWorkspace,
  _brief: CmoDelegateBrief,
  proofNote: string,
): { workspace: InfluencerOperatorWorkspace; imported: number; errors: string[] } {
  const rows = parseCreatorImportLines(proofNote);
  const errors: string[] = [];
  if (rows.length === 0) {
    errors.push("No valid creator lines — use: @handle | Platform | Fit 4 | niche note");
    return { workspace, imported: 0, errors };
  }

  let imported = 0;
  const touches = workspace.touches.map((t) => ({ ...t }));
  for (const row of rows) {
    const slot = touches.find(
      (t) => t.pipeline_stage === "research" && !t.target_handle.trim(),
    );
    if (!slot) break;
    const idx = touches.indexOf(slot);
    touches[idx] = {
      ...slot,
      target_handle: row.handle,
      target_name: row.handle.replace(/^@/, ""),
      platform: row.platform ?? slot.platform,
      icp_fit: row.icp_fit ?? slot.icp_fit,
      linked_delegate_brief_id: _brief.id,
      proof: row.note
        ? {
            note: row.note,
            completed_at: new Date().toISOString(),
          }
        : slot.proof,
    };
    imported++;
  }

  return { workspace: { ...workspace, touches }, imported, errors };
}

export function rollupInfluencerKpis(
  workspace: InfluencerOperatorWorkspace,
  _profile?: MarketingProfile | null,
): ManualKpi[] {
  const kpis: ManualKpi[] = [];
  const now = new Date().toISOString();

  const replies = workspace.touches.filter((t) => t.proof?.reply_received).length;
  if (replies > 0) {
    const preset = KPI_PRESETS.find((p) => p.id === "influencer_replies");
    kpis.push({
      id: "influencer_replies",
      name: preset?.name ?? "Influencer DM replies",
      value: replies,
      target: preset?.defaultTarget ?? 3,
      unit: "replies",
      source: "manual",
      updated_at: now,
    });
  }

  const signups = workspace.touches
    .map((t) => t.proof?.signups)
    .filter((v): v is number => v != null && !Number.isNaN(v));
  const totalSignups = signups.reduce((a, b) => a + b, 0);
  if (totalSignups > 0) {
    kpis.push({
      id: "influencer_referral_signups",
      name: "Influencer referral signups",
      value: totalSignups,
      unit: "signups",
      source: "manual",
      updated_at: now,
    });
  }

  let bestRate = 0;
  let bestPitchId: string | undefined;
  for (const pitch of workspace.pitches) {
    const sent = workspace.touches.filter(
      (t) =>
        t.pitch_id === pitch.id &&
        ["pitched", "replied", "negotiating", "brief_sent", "live", "reporting"].includes(
          t.pipeline_stage,
        ),
    ).length;
    const pitchReplies = workspace.touches.filter(
      (t) => t.pitch_id === pitch.id && t.proof?.reply_received,
    ).length;
    if (sent > 0) {
      const rate = Math.round((pitchReplies / sent) * 100);
      if (rate > bestRate) {
        bestRate = rate;
        bestPitchId = pitch.id;
      }
    }
  }
  if (bestRate > 0) {
    kpis.push({
      id: "influencer_pitch_reply_rate",
      name: "Best pitch reply rate",
      value: bestRate,
      unit: "%",
      source: "manual",
      updated_at: now,
    });
    void bestPitchId;
  }

  const spend = workspace.touches
    .map((t) => t.proof?.spend_usd)
    .filter((v): v is number => v != null);
  const totalSpend = spend.reduce((a, b) => a + b, 0);
  if (totalSpend > 0 && totalSignups > 0) {
    const cpa = Math.round(totalSpend / totalSignups);
    kpis.push({
      id: "influencer_cpa_qualified_signup",
      name: "Influencer CPA (qualified signup)",
      value: cpa,
      unit: "USD",
      source: "manual",
      updated_at: now,
    });
  }

  return kpis;
}

export function hydrateInfluencerOperatorFromJson(
  raw: unknown,
): InfluencerOperatorWorkspace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !Array.isArray(o.touches) || !Array.isArray(o.pitches)) {
    return null;
  }
  return {
    id: o.id,
    mode: (o.mode as InfluencerOperatorMode) ?? "micro_influencer_dm",
    thesis_id: "influencer_partnerships",
    week_index: Number(o.week_index) || 1,
    ops_cadence_id: typeof o.ops_cadence_id === "string" ? o.ops_cadence_id : undefined,
    started_at: String(o.started_at ?? new Date().toISOString()),
    pitches: o.pitches as InfluencerPitch[],
    touches: o.touches as InfluencerTouch[],
    weekly_targets: Array.isArray(o.weekly_targets)
      ? (o.weekly_targets as WeeklyOutreachTarget[])
      : weeklyTargets(false),
    primary_kpi_id:
      (o.primary_kpi_id as InfluencerOperatorWorkspace["primary_kpi_id"]) ??
      "influencer_replies",
    verdict: o.verdict as InfluencerVerdict | undefined,
  };
}

export function influencerOutreachSummary(workspace: InfluencerOperatorWorkspace): string {
  const day = currentInfluencerDayIndex(workspace);
  const vol = resolveWeeklyOutreachTarget(workspace, day);
  const replies = countReplies(workspace);
  const next = getNextInfluencerTouch(workspace);
  const nextLabel = next
    ? workspace.pitches.find((p) => p.id === next.pitch_id)?.label ?? "DM"
    : "done";
  return `${vol.done}/${vol.max} DMs · ${replies} replies · ${nextLabel} pending`;
}

export function pipelineStageCounts(
  workspace: InfluencerOperatorWorkspace,
): Record<string, number> {
  const counts: Record<string, number> = {
    research: 0,
    pitched: 0,
    replied: 0,
    deal: 0,
    live: 0,
    reporting: 0,
  };
  for (const t of workspace.touches) {
    if (t.pipeline_stage === "skipped") continue;
    if (t.pipeline_stage === "research") counts.research!++;
    else if (t.pipeline_stage === "pitched") counts.pitched!++;
    else if (t.pipeline_stage === "replied") counts.replied!++;
    else if (t.pipeline_stage === "negotiating" || t.pipeline_stage === "brief_sent")
      counts.deal!++;
    else if (t.pipeline_stage === "live") counts.live!++;
    else if (t.pipeline_stage === "reporting") counts.reporting!++;
  }
  return counts;
}

/** CI smoke alias */
export const buildInfluencerOperator = createInfluencerOperatorFromThesis;
