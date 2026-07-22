/**
 * P8 — Distribution Operator: hook grid, daily volume, retention proof, scale/kill/double-down.
 * See CMO_DISTRIBUTION_OPERATOR_SPEC.md and PRODUCT_NORTH_STAR.md §11 P8.
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import { resolveNarrativeContext, withNarrativePrefix } from "./cmoNarrativeContext";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import { measureUserOpsTaskId, primaryUserOpsTaskId } from "./cmoHumanExecutionBind";
import type { GrowthControlPlane } from "./cmoGrowthPlane";
import { evaluateWeek1Metrics } from "./cmoProofLoop";
import type { LaneBItem, LaneBWorkspace } from "./cmoLaneB";
import { KPI_PRESETS } from "./kpiPresets";
import type { GrowthNarrative, ManualKpi, MarketingProfile } from "./types";

export type DistributionOperatorMode = "short_form_volume" | "founder_grid" | "character_volume";

export type HookFormulaId =
  | "negative_outcome"
  | "before_after"
  | "contrarian"
  | "pov_identity"
  | "demo_first"
  | "founder_story"
  | "contrarian_take"
  | "build_log";

export type DistributionPlatform =
  | "tiktok"
  | "reels"
  | "youtube_shorts"
  | "linkedin"
  | "x"
  | "engage";

export type DistributionSlotKind = "post" | "engage" | "measure";
export type DistributionSlotStatus = "pending" | "posted" | "measured" | "skipped";
export type DistributionVerdictKind = "test_more" | "scale" | "kill" | "double_down";

export interface DistributionHook {
  id: string;
  label: string;
  formula: HookFormulaId;
  script_hint: string;
  retention_target_3s?: number;
  completion_target?: number;
}

export interface DistributionSlotProof {
  post_url?: string;
  views_24h?: number;
  retention_3s_pct?: number;
  completion_pct?: number;
  impressions?: number;
  replies?: number;
  note?: string;
  completed_at: string;
}

export interface DistributionSlot {
  id: string;
  day_index: number;
  hook_id: string;
  slot_kind: DistributionSlotKind;
  platform: DistributionPlatform;
  status: DistributionSlotStatus;
  linked_lane_b_id?: string;
  linked_ops_task_id?: string;
  proof?: DistributionSlotProof;
  /** Organic slots remain $0 unless explicitly linked to paid distribution. */
  cost_estimate_usd?: number;
}

export interface DailyVolumeTarget {
  day_index: number;
  min_posts: number;
  max_posts: number;
  done_posts: number;
}

export interface DistributionVerdict {
  kind: DistributionVerdictKind;
  hook_id?: string;
  headline: string;
  rationale: string[];
  evidence: string[];
  computed_at: string;
}

export interface DistributionOperatorWorkspace {
  id: string;
  mode: DistributionOperatorMode;
  thesis_id: ChannelThesisId;
  week_index: number;
  ops_cadence_id?: string;
  started_at: string;
  hooks: DistributionHook[];
  slots: DistributionSlot[];
  daily_targets: DailyVolumeTarget[];
  primary_kpi_id: "short_form_views" | "linkedin_impressions" | "social_posts";
  verdict?: DistributionVerdict;
}

export interface DistributionProofInput {
  post_url?: string;
  views_24h?: number;
  retention_3s_pct?: number;
  completion_pct?: number;
  impressions?: number;
  replies?: number;
  note?: string;
}

export interface DailyVolumeSummary {
  day_index: number;
  min: number;
  max: number;
  done: number;
  remaining: number;
}

const DISTRIBUTION_THESES: ChannelThesisId[] = ["viral_short_form", "founder_social"];

const VIRAL_HOOKS: DistributionHook[] = [
  {
    id: "hook.a",
    label: "Hook A",
    formula: "negative_outcome",
    script_hint:
      "You're losing [metric] every week because of [specific mistake]. — negative outcome formula",
    retention_target_3s: 65,
    completion_target: 40,
  },
  {
    id: "hook.b",
    label: "Hook B",
    formula: "contrarian",
    script_hint:
      "Unpopular opinion: [common advice] is wrong for [ICP]. — contrarian claim formula",
    retention_target_3s: 60,
    completion_target: 35,
  },
  {
    id: "hook.c",
    label: "Hook C",
    formula: "demo_first",
    script_hint: "Watch me [specific task] in [timeframe]. — demo-first, screen recording frame 1",
    retention_target_3s: 75,
    completion_target: 50,
  },
];

const FOUNDER_HOOKS: DistributionHook[] = [
  {
    id: "hook.f1",
    label: "Founder post 1",
    formula: "founder_story",
    script_hint: "Problem I lived → insight → product tie-in. Soft CTA at end.",
  },
  {
    id: "hook.f2",
    label: "Founder post 2",
    formula: "contrarian_take",
    script_hint: "Contrarian take on industry norm — teach, don't pitch.",
  },
  {
    id: "hook.f3",
    label: "Founder post 3",
    formula: "build_log",
    script_hint: "Build log — what shipped this week + one lesson.",
  },
];

const CHARACTER_HOOKS: DistributionHook[] = [
  {
    id: "hook.c1",
    label: "Character tension beat",
    formula: "pov_identity",
    script_hint: "In-character reaction to the product tension — not a random dance.",
    retention_target_3s: 70,
    completion_target: 45,
  },
  {
    id: "hook.c2",
    label: "Character story arc",
    formula: "before_after",
    script_hint: "Character before/after the product solves their recurring problem.",
    retention_target_3s: 65,
    completion_target: 40,
  },
  {
    id: "hook.c3",
    label: "Character product tie-in",
    formula: "demo_first",
    script_hint: "Character discovers the in-product moment that changes behavior.",
    retention_target_3s: 72,
    completion_target: 48,
  },
];

function viralDailyTargets(weekIndex: number, doubleDown: boolean): DailyVolumeTarget[] {
  const targets: DailyVolumeTarget[] = [];
  for (let day = 1; day <= 7; day++) {
    let min = day <= 2 ? 3 : day <= 5 ? 4 : 5;
    let max = day <= 2 ? 3 : day <= 5 ? 4 : 5;
    if (doubleDown) {
      min += 2;
      max += 2;
    }
    if (weekIndex > 1 && !doubleDown) {
      min = Math.min(min + 1, 5);
      max = Math.min(max + 1, 6);
    }
    targets.push({ day_index: day, min_posts: min, max_posts: max, done_posts: 0 });
  }
  return targets;
}

function resolveDistributionOpsLinks(
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

function buildViralSlots(
  thesis: ChannelThesis,
  linkedOps?: { primary?: string; measure?: string },
  opts?: { doubleDown?: boolean; winningHookId?: string; hooks?: DistributionHook[] },
): DistributionSlot[] {
  const source = opts?.hooks ?? VIRAL_HOOKS;
  const hooks = opts?.doubleDown && opts.winningHookId
    ? source.filter((h) => h.id === opts.winningHookId)
    : source;
  const hookIds = hooks.map((h) => h.id);
  const slots: DistributionSlot[] = [];
  let sort = 0;

  let postPlan: Array<{ day: number; hookIdx: number; platform: DistributionPlatform }> = [
    { day: 1, hookIdx: 0, platform: "tiktok" },
    { day: 1, hookIdx: 1, platform: "reels" },
    { day: 1, hookIdx: 2, platform: "youtube_shorts" },
    { day: 2, hookIdx: 2, platform: "tiktok" },
    { day: 2, hookIdx: 0, platform: "reels" },
    { day: 2, hookIdx: 1, platform: "youtube_shorts" },
    { day: 3, hookIdx: 1, platform: "tiktok" },
    { day: 3, hookIdx: 0, platform: "youtube_shorts" },
    { day: 3, hookIdx: 2, platform: "reels" },
    { day: 4, hookIdx: 2, platform: "reels" },
    { day: 4, hookIdx: 1, platform: "youtube_shorts" },
    { day: 4, hookIdx: 0, platform: "tiktok" },
    { day: 5, hookIdx: 0, platform: "tiktok" },
    { day: 5, hookIdx: 1, platform: "reels" },
    { day: 5, hookIdx: 2, platform: "youtube_shorts" },
    { day: 6, hookIdx: 2, platform: "tiktok" },
    { day: 6, hookIdx: 1, platform: "youtube_shorts" },
    { day: 6, hookIdx: 0, platform: "reels" },
    { day: 7, hookIdx: 0, platform: "reels" },
    { day: 7, hookIdx: 1, platform: "youtube_shorts" },
  ];

  if (opts?.doubleDown && hookIds.length === 1) {
    postPlan = [];
    for (let day = 1; day <= 7; day++) {
      const platforms: DistributionPlatform[] = ["tiktok", "reels", "youtube_shorts", "tiktok", "reels"];
      for (let i = 0; i < 5; i++) {
        postPlan.push({ day, hookIdx: 0, platform: platforms[i]! });
      }
    }
  }

  for (const p of postPlan) {
    const hook = hooks[p.hookIdx % hooks.length]!;
    slots.push({
      id: `${thesis.id}.dist.${sort}`,
      day_index: p.day,
      hook_id: hook.id,
      slot_kind: "post",
      platform: p.platform,
      status: "pending",
      linked_ops_task_id: p.day === 5 && p.hookIdx === 0 ? linkedOps?.primary : undefined,
    });
    sort++;
  }

  for (let day = 1; day <= 7; day++) {
    slots.push({
      id: `${thesis.id}.dist.engage.${day}`,
      day_index: day,
      hook_id: hookIds[0]!,
      slot_kind: "engage",
      platform: "engage",
      status: "pending",
    });
  }

  slots.push({
    id: `${thesis.id}.dist.measure`,
    day_index: 5,
    hook_id: hookIds[0]!,
    slot_kind: "measure",
    platform: "engage",
    status: "pending",
    linked_ops_task_id: linkedOps?.measure ?? linkedOps?.primary,
  });

  return slots;
}

function buildFounderSlots(
  thesis: ChannelThesis,
  linkedOps?: { primary?: string; measure?: string },
): DistributionSlot[] {
  const slots: DistributionSlot[] = [];
  const postDays = [1, 3, 5, 8, 10, 12, 14];
  let sort = 0;

  for (let i = 0; i < postDays.length; i++) {
    const hook = FOUNDER_HOOKS[i % FOUNDER_HOOKS.length]!;
    slots.push({
      id: `${thesis.id}.dist.fpost.${i}`,
      day_index: postDays[i]!,
      hook_id: hook.id,
      slot_kind: "post",
      platform: i % 3 === 2 ? "x" : "linkedin",
      status: "pending",
      linked_ops_task_id: i === 2 ? linkedOps?.primary : undefined,
    });
    sort++;
  }

  for (const day of [2, 4, 6, 9, 11, 13]) {
    slots.push({
      id: `${thesis.id}.dist.fengage.${day}`,
      day_index: day,
      hook_id: FOUNDER_HOOKS[0]!.id,
      slot_kind: "engage",
      platform: "engage",
      status: "pending",
    });
  }

  slots.push({
    id: `${thesis.id}.dist.fmeasure`,
    day_index: 7,
    hook_id: FOUNDER_HOOKS[0]!.id,
    slot_kind: "measure",
    platform: "linkedin",
    status: "pending",
    linked_ops_task_id: linkedOps?.measure ?? linkedOps?.primary,
  });

  return slots;
}

function founderDailyTargets(): DailyVolumeTarget[] {
  const targets: DailyVolumeTarget[] = [];
  for (let day = 1; day <= 14; day++) {
    const isPostDay = [1, 3, 5, 8, 10, 12, 14].includes(day);
    targets.push({
      day_index: day,
      min_posts: isPostDay ? 1 : 0,
      max_posts: isPostDay ? 1 : 0,
      done_posts: 0,
    });
  }
  return targets;
}

export function isDistributionThesis(thesisId?: ChannelThesisId | null): boolean {
  return !!thesisId && DISTRIBUTION_THESES.includes(thesisId);
}

export function isDistributionOperatorGate(input: {
  thesis?: ChannelThesis | null;
  opsCadence?: CmoOpsCadence | null;
  growthPlane?: GrowthControlPlane | null;
}): boolean {
  const thesisId = input.thesis?.id;
  if (!isDistributionThesis(thesisId)) return false;
  if (!input.opsCadence) return false;
  const gtm = input.growthPlane?.binding.gtm;
  if (!gtm) return true;
  return gtm === "awareness" || gtm === "distribution";
}

export interface CreateDistributionOperatorOpts {
  opsCadence?: CmoOpsCadence;
  week_index?: number;
  doubleDown?: boolean;
  winningHookId?: string;
  narrative?: GrowthNarrative;
  character_mode?: boolean;
  now?: string;
}

export function createDistributionOperatorFromThesis(
  thesis: ChannelThesis,
  opts?: CreateDistributionOperatorOpts,
): DistributionOperatorWorkspace | null {
  if (!isDistributionThesis(thesis.id)) return null;

  const linkedOps = resolveDistributionOpsLinks(thesis, opts?.opsCadence);
  const weekIndex = opts?.week_index ?? opts?.opsCadence?.week_index ?? 1;
  const now = opts?.now ?? new Date().toISOString();
  const isViral = thesis.id === "viral_short_form";
  const characterMode = opts?.character_mode === true;
  const narrative = resolveNarrativeContext(opts?.narrative);
  const hookSource = characterMode ? CHARACTER_HOOKS : isViral ? VIRAL_HOOKS : FOUNDER_HOOKS;
  const hooks = hookSource.map((hook) => ({
    ...hook,
    script_hint: withNarrativePrefix(hook.script_hint, narrative, 300),
  }));

  const workspace: DistributionOperatorWorkspace = {
    id: `distop.${thesis.id}.w${weekIndex}.${Date.now()}`,
    mode: characterMode ? "character_volume" : isViral ? "short_form_volume" : "founder_grid",
    thesis_id: thesis.id,
    week_index: weekIndex,
    ops_cadence_id: opts?.opsCadence?.id,
    started_at: now,
    hooks,
    slots: isViral || characterMode
      ? buildViralSlots(thesis, linkedOps, {
          doubleDown: opts?.doubleDown,
          winningHookId: opts?.winningHookId,
          hooks: hookSource,
        })
      : buildFounderSlots(thesis, linkedOps),
    daily_targets: isViral || characterMode
      ? viralDailyTargets(weekIndex, !!opts?.doubleDown)
      : founderDailyTargets(),
    primary_kpi_id: characterMode || isViral ? "short_form_views" : "linkedin_impressions",
  };

  return recomputeDailyDonePosts(workspace);
}

export function recomputeDailyDonePosts(
  workspace: DistributionOperatorWorkspace,
): DistributionOperatorWorkspace {
  const targets = workspace.daily_targets.map((t) => {
    const done = workspace.slots.filter(
      (s) =>
        s.day_index === t.day_index &&
        s.slot_kind === "post" &&
        (s.status === "posted" || s.status === "measured"),
    ).length;
    return { ...t, done_posts: done };
  });
  return { ...workspace, daily_targets: targets };
}

export function resolveDailyVolumeTarget(
  workspace: DistributionOperatorWorkspace,
  dayIndex: number,
): DailyVolumeSummary {
  const target = workspace.daily_targets.find((t) => t.day_index === dayIndex);
  const min = target?.min_posts ?? 0;
  const max = target?.max_posts ?? min;
  const done =
    target?.done_posts ??
    workspace.slots.filter(
      (s) =>
        s.day_index === dayIndex &&
        s.slot_kind === "post" &&
        (s.status === "posted" || s.status === "measured"),
    ).length;
  return {
    day_index: dayIndex,
    min,
    max,
    done,
    remaining: Math.max(0, min - done),
  };
}

export function currentOperatorDayIndex(workspace: DistributionOperatorWorkspace): number {
  const incomplete = workspace.daily_targets.find((t) => t.done_posts < t.min_posts);
  return incomplete?.day_index ?? workspace.daily_targets[workspace.daily_targets.length - 1]?.day_index ?? 1;
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

export function validateDistributionProof(
  slot: DistributionSlot,
  proof: DistributionProofInput,
  mode: DistributionOperatorMode,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (slot.slot_kind === "post") {
    if (!proof.post_url || !URL_RE.test(proof.post_url.trim())) {
      errors.push("Post URL required — paste the live link.");
    }
    return { ok: errors.length === 0, errors };
  }

  if (slot.slot_kind === "engage") {
    if (!proof.note || proof.note.trim().length < 8) {
      errors.push("Engage proof needs a note (8+ chars) — what you did in 30 min.");
    }
    return { ok: errors.length === 0, errors };
  }

  if (slot.slot_kind === "measure") {
    if (mode === "short_form_volume") {
      if (proof.retention_3s_pct == null || Number.isNaN(proof.retention_3s_pct)) {
        errors.push("Log 3-second retention % — this hook test closes on retention, not vibes.");
      }
      if (proof.views_24h == null || Number.isNaN(proof.views_24h)) {
        errors.push("Log 24h view count for rollup.");
      }
    } else {
      const hasMetric =
        (proof.impressions != null && !Number.isNaN(proof.impressions)) ||
        (proof.replies != null && !Number.isNaN(proof.replies));
      if (!hasMetric) {
        errors.push("Log impressions or replies for founder post measure.");
      }
      if (!proof.note || proof.note.trim().length < 8) {
        errors.push("Add engagement notes (8+ chars).");
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function completeDistributionSlot(
  workspace: DistributionOperatorWorkspace,
  slotId: string,
  proof: DistributionProofInput,
): { workspace: DistributionOperatorWorkspace; error?: string } {
  const slot = workspace.slots.find((s) => s.id === slotId);
  if (!slot) return { workspace, error: "Slot not found." };

  const validation = validateDistributionProof(slot, proof, workspace.mode);
  if (!validation.ok) return { workspace, error: validation.errors.join(" ") };

  const now = new Date().toISOString();
  const fullProof: DistributionSlotProof = {
    ...proof,
    completed_at: now,
  };

  const nextStatus: DistributionSlotStatus =
    slot.slot_kind === "post" ? "posted" : "measured";

  let nextSlots = workspace.slots.map((s) =>
    s.id === slotId ? { ...s, status: nextStatus, proof: fullProof } : s,
  );

  if (slot.slot_kind === "post" && proof.retention_3s_pct != null) {
    nextSlots = nextSlots.map((s) =>
      s.id === slotId ? { ...s, status: "measured" as const } : s,
    );
  }

  let next = recomputeDailyDonePosts({ ...workspace, slots: nextSlots });
  next = { ...next, verdict: evaluateHookPerformance(next) };
  return { workspace: next };
}

export function skipDistributionSlot(
  workspace: DistributionOperatorWorkspace,
  slotId: string,
): DistributionOperatorWorkspace {
  const nextSlots = workspace.slots.map((s) =>
    s.id === slotId ? { ...s, status: "skipped" as const } : s,
  );
  return recomputeDailyDonePosts({ ...workspace, slots: nextSlots });
}

export function evaluateHookPerformance(
  workspace: DistributionOperatorWorkspace,
  weekAssessment?: { pctOfTarget?: number; primaryValue?: number; primaryTarget?: number },
): DistributionVerdict {
  const now = new Date().toISOString();
  const evidence: string[] = [];

  if (workspace.mode === "founder_grid") {
    const measured = workspace.slots.filter((s) => s.slot_kind === "post" && s.proof?.post_url);
    if (measured.length >= 3) {
      return {
        kind: "scale",
        headline: "Founder cadence on track — keep 3 posts/week",
        rationale: ["Consistency beats virality for B2B awareness."],
        evidence: [`${measured.length} posts with URLs logged`],
        computed_at: now,
      };
    }
    return {
      kind: "test_more",
      headline: "Keep publishing — founder grid in progress",
      rationale: ["Log each post URL before week review."],
      evidence,
      computed_at: now,
    };
  }

  for (const hook of workspace.hooks) {
    const measured = workspace.slots.filter(
      (s) =>
        s.hook_id === hook.id &&
        s.slot_kind === "post" &&
        s.proof?.retention_3s_pct != null,
    );
    const target = hook.retention_target_3s ?? 60;

    if (measured.length >= 3) {
      const allLow = measured.every((s) => (s.proof!.retention_3s_pct ?? 0) < 45);
      if (allLow) {
        evidence.push(`${hook.label}: ${measured.length} posts all <45% 3s retention`);
        return {
          kind: "kill",
          hook_id: hook.id,
          headline: `Kill ${hook.label} — rewrite hook, don't tweak music`,
          rationale: [
            "Retention below 45% after 3 posts means the opening failed.",
            "Write a new formula variant — do not adjust music or captions only.",
          ],
          evidence,
          computed_at: now,
        };
      }
    }

    const hits = measured.filter((s) => (s.proof!.retention_3s_pct ?? 0) >= target);
    if (hits.length >= 2) {
      evidence.push(
        `${hook.label}: ${hits.length}/${measured.length} at or above ${target}% 3s retention`,
      );
      const pct = weekAssessment?.pctOfTarget;
      if (pct != null && pct >= 50) {
        return {
          kind: "double_down",
          hook_id: hook.id,
          headline: `Double down on ${hook.label} — scale volume this week`,
          rationale: [
            "Hook passed retention threshold on 2+ tests.",
            `Week KPI at ${pct}% of target — increase posts on winning formula.`,
          ],
          evidence,
          computed_at: now,
        };
      }
      return {
        kind: "scale",
        hook_id: hook.id,
        headline: `Scale ${hook.label} — winning retention pattern`,
        rationale: [
          "Two or more posts hit 3-second retention target.",
          "Film 3–5 variants of this hook before chasing new formats.",
        ],
        evidence,
        computed_at: now,
      };
    }
  }

  return {
    kind: "test_more",
    headline: "Keep A/B/C hook tests running",
    rationale: ["Need 2+ measured posts per hook before scale/kill verdict."],
    evidence,
    computed_at: now,
  };
}

/** Faz 5 — live P8 kill suggestion for Post Kit (3 posts all <20% 3s retention). */
export function computeHookKillSuggestion(
  workspace: DistributionOperatorWorkspace,
  hookId?: string,
): { headline: string; detail: string; hook_id?: string } | undefined {
  const hooks = hookId
    ? workspace.hooks.filter((h) => h.id === hookId)
    : workspace.hooks;
  for (const hook of hooks) {
    const measured = workspace.slots.filter(
      (s) =>
        s.hook_id === hook.id &&
        s.slot_kind === "post" &&
        s.proof?.retention_3s_pct != null,
    );
    if (measured.length < 3) continue;
    const allLow = measured.every((s) => (s.proof!.retention_3s_pct ?? 0) < 20);
    if (allLow) {
      return {
        hook_id: hook.id,
        headline: `Kill ${hook.label} — rewrite hook`,
        detail:
          "3 posts all below 20% 3s retention. Write a new formula — don't tweak music only.",
      };
    }
  }
  return undefined;
}

export function evaluateHookPerformanceWithProfile(
  workspace: DistributionOperatorWorkspace,
  cadence: CmoOpsCadence,
  profile: MarketingProfile | null | undefined,
  thesis: ChannelThesis,
): DistributionVerdict {
  const assessment = evaluateWeek1Metrics(cadence, profile, thesis);
  return evaluateHookPerformance(workspace, {
    pctOfTarget: assessment.pctOfTarget,
    primaryValue: assessment.primaryValue,
    primaryTarget: assessment.primaryTarget,
  });
}

export function getNextDistributionSlot(
  workspace: DistributionOperatorWorkspace,
): DistributionSlot | null {
  const day = currentOperatorDayIndex(workspace);
  const pending = workspace.slots.filter(
    (s) => s.status === "pending" && s.slot_kind === "post",
  );
  const today = pending.filter((s) => s.day_index === day);
  if (today.length > 0) return today[0]!;
  return pending.sort((a, b) => a.day_index - b.day_index)[0] ?? null;
}

export function slotDisplayLabel(
  workspace: DistributionOperatorWorkspace,
  slot: DistributionSlot,
): string {
  const hook = workspace.hooks.find((h) => h.id === slot.hook_id);
  const hookLabel = hook?.label ?? slot.hook_id;
  if (slot.slot_kind === "engage") return `Engage 30 min (Day ${slot.day_index})`;
  if (slot.slot_kind === "measure") return `Log measure (Day ${slot.day_index})`;
  return `Post ${hookLabel} — ${slot.platform.replace(/_/g, " ")} (Day ${slot.day_index})`;
}

export function syncLaneBFromOperator(
  workspace: DistributionOperatorWorkspace,
  laneB: LaneBWorkspace,
): { workspace: DistributionOperatorWorkspace; laneB: LaneBWorkspace } {
  const postAndMeasure = workspace.slots.filter(
    (s) => s.slot_kind === "post" || s.slot_kind === "measure" || s.slot_kind === "engage",
  );
  const items: LaneBItem[] = postAndMeasure.map((slot, i) => ({
    id: slot.linked_lane_b_id ?? `${workspace.thesis_id}.laneb.fromop.${i}`,
    mode: "posting_calendar" as const,
    title: slotDisplayLabel(workspace, slot),
    detail: workspace.hooks.find((h) => h.id === slot.hook_id)?.script_hint,
    channel: slot.platform === "engage" ? "engage" : slot.platform,
    day: Math.min(7, slot.day_index),
    status:
      slot.status === "measured" || slot.status === "posted"
        ? "done"
        : slot.status === "skipped"
          ? "skipped"
          : "pending",
    proof: slot.proof
      ? {
          url: slot.proof.post_url,
          note: slot.proof.note,
          metric:
            slot.proof.views_24h != null
              ? `${slot.proof.views_24h} views`
              : slot.proof.retention_3s_pct != null
                ? `${slot.proof.retention_3s_pct}% 3s retention`
                : undefined,
          completed_at: slot.proof.completed_at,
        }
      : undefined,
    linked_ops_task_id: slot.linked_ops_task_id,
    sort_order: i,
  }));

  const linkedSlots = workspace.slots.map((s) => {
    const idx = postAndMeasure.findIndex((p) => p.id === s.id);
    return {
      ...s,
      linked_lane_b_id: idx >= 0 ? items[idx]?.id : s.linked_lane_b_id,
    };
  });

  return {
    workspace: { ...workspace, slots: linkedSlots },
    laneB: { ...laneB, items },
  };
}

export function rollupOperatorKpis(
  workspace: DistributionOperatorWorkspace,
  profile?: MarketingProfile | null,
): ManualKpi[] {
  const kpis: ManualKpi[] = [];
  const now = new Date().toISOString();

  if (workspace.mode === "short_form_volume") {
    const views = workspace.slots
      .map((s) => s.proof?.views_24h)
      .filter((v): v is number => v != null && !Number.isNaN(v));
    const totalViews = views.reduce((a, b) => a + b, 0);
    if (totalViews > 0) {
      const preset = KPI_PRESETS.find((p) => p.id === "short_form_views");
      kpis.push({
        id: "short_form_views",
        name: preset?.name ?? "Short-form views",
        value: totalViews,
        target: preset?.defaultTarget ?? 1000,
        unit: "views",
        source: "manual",
        updated_at: now,
      });
    }

    let bestRetention = 0;
    for (const s of workspace.slots) {
      const r = s.proof?.retention_3s_pct;
      if (r != null && r > bestRetention) bestRetention = r;
    }
    if (bestRetention > 0) {
      kpis.push({
        id: "hook_retention_3s_pct",
        name: "Best hook 3s retention",
        value: bestRetention,
        unit: "%",
        source: "manual",
        updated_at: now,
      });
    }

    const postsDone = workspace.slots.filter(
      (s) => s.slot_kind === "post" && (s.status === "posted" || s.status === "measured"),
    ).length;
    if (postsDone > 0) {
      const preset = KPI_PRESETS.find((p) => p.id === "social_posts");
      kpis.push({
        id: "social_posts",
        name: preset?.name ?? "Posts published",
        value: postsDone,
        target: preset?.defaultTarget ?? 3,
        unit: "posts",
        source: "manual",
        updated_at: now,
      });
    }
  } else {
    const impressions = workspace.slots
      .map((s) => s.proof?.impressions)
      .filter((v): v is number => v != null);
    const totalImp = impressions.reduce((a, b) => a + b, 0);
    if (totalImp > 0) {
      kpis.push({
        id: "linkedin_impressions",
        name: "LinkedIn impressions",
        value: totalImp,
        unit: "impressions",
        source: "manual",
        updated_at: now,
      });
    }
  }

  void profile;
  return kpis;
}

export function hydrateDistributionOperatorFromJson(
  raw: unknown,
): DistributionOperatorWorkspace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !Array.isArray(o.slots) || !Array.isArray(o.hooks)) return null;
  return {
    id: o.id,
    mode: (o.mode as DistributionOperatorMode) ?? "short_form_volume",
    thesis_id: (o.thesis_id as ChannelThesisId) ?? "viral_short_form",
    week_index: Number(o.week_index) || 1,
    ops_cadence_id: typeof o.ops_cadence_id === "string" ? o.ops_cadence_id : undefined,
    started_at: String(o.started_at ?? new Date().toISOString()),
    hooks: o.hooks as DistributionHook[],
    slots: o.slots as DistributionSlot[],
    daily_targets: Array.isArray(o.daily_targets)
      ? (o.daily_targets as DailyVolumeTarget[])
      : [],
    primary_kpi_id:
      (o.primary_kpi_id as DistributionOperatorWorkspace["primary_kpi_id"]) ??
      "short_form_views",
    verdict: o.verdict as DistributionVerdict | undefined,
  };
}

export function distributionVolumeSummary(
  workspace: DistributionOperatorWorkspace,
): string {
  const day = currentOperatorDayIndex(workspace);
  const vol = resolveDailyVolumeTarget(workspace, day);
  const next = getNextDistributionSlot(workspace);
  const nextLabel = next
    ? workspace.hooks.find((h) => h.id === next.hook_id)?.label ?? "post"
    : "done";
  return `${vol.done}/${vol.max} posts · ${nextLabel} pending`;
}

/** CI smoke alias */
export const buildDistributionOperator = createDistributionOperatorFromThesis;
