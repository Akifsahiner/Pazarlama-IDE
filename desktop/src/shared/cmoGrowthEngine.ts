/**
 * P17 — Growth Mechanism Intelligence: deterministic assessment, routing, and materialization.
 */
import type { ChannelThesis, ChannelThesisId } from "./cmoIntake";
import { filterEligibleTheses, scoreThesisEligibility, type FounderFitSignals } from "./cmoFounderFit";
import {
  GROWTH_MECHANISM_IDS,
  getMechanismRecord,
  listMechanismRecords,
  type GrowthMechanismId,
  type GrowthMechanismRecord,
  type MechanismWeek1Template,
} from "./cmoGrowthMechanismKnowledge";
import type { CmoWeek1Priority } from "./cmoIntake";
import { capWeek1Priorities } from "./cmoExecutionBind";
import { enrichMechanismWeek1Priority } from "./marketingTaskContract";
import type { RedListItem } from "./cmoGrowthPlane";
import type { FounderFitProfile, MarketingProfile, ProjectProfile } from "./types";

export type Persona = "marketing" | "sales";

export interface PublicPresenceAssetPolicy {
  allowed: boolean;
  maximum_people?: number;
  acceptable_formats?: string[];
  testimonials_allowed?: boolean;
  ugc_allowed?: boolean;
  sponsored_content_allowed?: boolean;
  affiliate_allowed?: boolean;
}

export interface PublicPresencePolicy {
  founder: PublicPresenceAssetPolicy;
  employees: PublicPresenceAssetPolicy;
  customers: PublicPresenceAssetPolicy;
  creators: PublicPresenceAssetPolicy;
  brand_character: PublicPresenceAssetPolicy;
  voice_only: PublicPresenceAssetPolicy;
  product_as_hero: PublicPresenceAssetPolicy;
  user_generated_output: PublicPresenceAssetPolicy;
  proprietary_data: PublicPresenceAssetPolicy;
  community: PublicPresenceAssetPolicy;
  partners: PublicPresenceAssetPolicy;
  reputational_risk: "low" | "medium" | "high";
  configured_at?: string;
}

export interface EngineScanSignals {
  is_consumer: boolean;
  is_b2b_saas: boolean;
  is_devtool: boolean;
  is_horizontal: boolean;
  is_physical_or_visible: boolean;
  has_api_surface: boolean;
  has_template_or_gallery: boolean;
  has_share_invite_collaborate: boolean;
  has_generative_output: boolean;
  has_blog: boolean;
  controversial_or_viral: boolean;
  company_stage: string;
  launch_imminent: boolean;
  gaps: string[];
}

export interface MechanismEvalContext {
  project: ProjectProfile;
  profile?: MarketingProfile | null;
  founderFit?: FounderFitProfile | null;
  presence?: PublicPresencePolicy | null;
  persona?: Persona;
  scanSignals: EngineScanSignals;
  founderFitSignals?: FounderFitSignals;
}

export interface MechanismEligibility {
  engine_id: GrowthMechanismId;
  score: number;
  blockers: string[];
  evidence: string[];
  confidence: "measured" | "assumption" | "missing";
}

export interface GrowthMechanismAssessment {
  ranked: MechanismEligibility[];
  primary?: GrowthMechanismId;
  secondary?: GrowthMechanismId;
  computed_at: string;
}

export interface GrowthMechanismProfile {
  assessment: GrowthMechanismAssessment;
  primary_mechanism_id: GrowthMechanismId;
  secondary_mechanism_id?: GrowthMechanismId;
  presence_policy?: PublicPresencePolicy;
  configured_at: string;
}

export interface MechanismOperatorFlags {
  distribution?: boolean;
  influencer?: boolean;
  delegate?: boolean;
  character_mode?: boolean;
  community_listening?: boolean;
  partner_brief?: boolean;
}

const BLEND_THRESHOLD = 12;

export function defaultPublicPresencePolicy(
  founderFit?: FounderFitProfile | null,
): PublicPresencePolicy {
  const faceNever = founderFit?.brand_face_readiness === "never";
  return {
    founder: {
      allowed: !faceNever,
      acceptable_formats: faceNever ? [] : ["short_form", "founder_story", "demo"],
    },
    employees: { allowed: true, maximum_people: 4, acceptable_formats: ["technical_demo", "webinar"] },
    customers: { allowed: true, testimonials_allowed: true, ugc_allowed: true },
    creators: { allowed: true, sponsored_content_allowed: true, affiliate_allowed: true },
    brand_character: { allowed: true },
    voice_only: { allowed: true, acceptable_formats: ["podcast", "written_interview"] },
    product_as_hero: { allowed: true },
    user_generated_output: { allowed: true, ugc_allowed: true },
    proprietary_data: { allowed: true },
    community: { allowed: true },
    partners: { allowed: true },
    reputational_risk:
      founderFit?.controversy_tolerance === "avoid"
        ? "low"
        : founderFit?.controversy_tolerance === "lean_in"
          ? "high"
          : "medium",
  };
}

function textBlob(project: ProjectProfile, profile?: MarketingProfile | null): string {
  return [
    project.readmeSummary,
    project.productType,
    profile?.product_description,
    profile?.category,
    profile?.business_model,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function buildEngineScanSignals(
  project: ProjectProfile,
  profile?: MarketingProfile | null,
): EngineScanSignals {
  const text = textBlob(project, profile);
  const routes = project.routes ?? [];
  const gaps = profile?.gaps ?? [];
  const routeJoin = routes.join(" ").toLowerCase();
  const hasShareInvite =
    /invite|share|refer|collaborat|embed|send|publish|export|present|approve|receive/.test(routeJoin) ||
    /invite|share|refer|collaborat|embed/.test(text);
  return {
    is_consumer:
      profile?.business_model === "consumer" ||
      /consumer|b2c|creator|mobile|social|game/.test(text),
    is_b2b_saas:
      profile?.business_model === "saas" ||
      /\bb2b\b|saas|enterprise|team|workspace|analytics|crm|sales/.test(text),
    is_devtool: /developer|devtool|api|sdk|cli|open.?source|github|infra|database/.test(text),
    is_horizontal:
      /workspace|no-code|notion|template|flexible|platform|horizontal|all-in-one/.test(text),
    is_physical_or_visible:
      /physical|drink|wear|merch|hardware|fitness|beauty|fashion|retail|consumer goods/.test(text),
    has_api_surface:
      routes.some((r) => /api|webhook|integration|oauth/.test(r)) ||
      /api|sdk|webhook|integration/.test(text),
    has_template_or_gallery:
      routes.some((r) => /template|gallery|community|marketplace|plugin|widget/.test(r)) ||
      /template|gallery|marketplace|community file/.test(text),
    has_share_invite_collaborate: hasShareInvite,
    has_generative_output:
      /generat|design|video|photo|image|music|website builder|export|render/.test(text),
    has_blog: routes.some((r) => /blog|docs|learn|academy|resources/.test(r)),
    controversial_or_viral: /cheat|undetectable|controvers|polariz|viral|tiktok/.test(text),
    company_stage: profile?.company_stage ?? "",
    launch_imminent:
      profile?.days_until_launch != null &&
      profile.days_until_launch >= 0 &&
      profile.days_until_launch <= 30,
    gaps,
  };
}

function intensityScore(level: GrowthMechanismRecord["founder_dependency"]): number {
  switch (level) {
    case "none":
      return 0;
    case "low":
      return 10;
    case "medium":
      return 25;
    case "high":
      return 40;
    case "very_high":
      return 60;
    default:
      return 20;
  }
}

function scoreMechanism(id: GrowthMechanismId, ctx: MechanismEvalContext): MechanismEligibility {
  const record = getMechanismRecord(id);
  const s = ctx.scanSignals;
  const fit = ctx.founderFit;
  const presence = ctx.presence ?? defaultPublicPresencePolicy(fit);
  let score = 35;
  const blockers: string[] = [];
  const evidence: string[] = [];

  switch (id) {
    case "founder_narrative":
      if (!presence.founder.allowed || fit?.brand_face_readiness === "never") {
        blockers.push("Founder face not allowed — narrative engine blocked.");
        score = 0;
      } else {
        if (fit?.brand_face_readiness === "primary_channel") score += 25;
        if (fit?.controversy_tolerance === "lean_in") score += 15;
        if (s.controversial_or_viral) score += 20;
        if (s.is_consumer) score += 10;
      }
      break;
    case "brand_character":
      if (!presence.brand_character.allowed) {
        blockers.push("Brand character not allowed.");
        score = 0;
      } else {
        if (s.is_consumer) score += 20;
        if (/daily|habit|streak|remind|game/.test(textBlob(ctx.project, ctx.profile))) {
          score += 25;
          evidence.push("Recurring product tension signals detected");
        }
        if (s.is_b2b_saas && /accounting|finance|legal|health|enterprise/.test(textBlob(ctx.project, ctx.profile))) {
          blockers.push("High trust B2B — random character not appropriate.");
          score = Math.min(score, 15);
        }
      }
      break;
    case "entertainment_ip":
      if (!s.is_physical_or_visible && !s.is_consumer) {
        blockers.push("Product lacks physical/social visibility for entertainment IP.");
        score = Math.min(score, 20);
      } else score += 25;
      if (fit?.monthly_budget_band === "0" || fit?.monthly_budget_band === "under_500") {
        blockers.push("Budget too low for entertainment brand production.");
        score = Math.min(score, 25);
      }
      break;
    case "solution_ecosystem":
      if (s.is_horizontal || gapsInclude(ctx, "product.onboarding_missing")) score += 30;
      if (s.has_template_or_gallery) {
        score += 20;
        evidence.push("Template/gallery surface detected");
      }
      if (!s.is_horizontal && !s.has_template_or_gallery) score -= 10;
      break;
    case "remixable_artifacts":
      if (s.has_template_or_gallery || s.has_generative_output) score += 30;
      if (/design|figma|plugin|widget|component|template|remix|fork|duplicate/.test(textBlob(ctx.project, ctx.profile))) {
        score += 20;
        evidence.push("Artifact/remix product signals");
      }
      break;
    case "intent_to_product":
      if (s.has_blog || s.has_template_or_gallery) score += 20;
      if (s.is_horizontal) score += 15;
      if (gapsInclude(ctx, "growth.template_surface_missing")) score += 10;
      break;
    case "partner_ecosystem":
      if (s.has_api_surface || s.is_devtool) {
        score += 35;
        evidence.push("API/integration surface detected");
      } else blockers.push("No API or integration adjacency in scan.");
      break;
    case "product_borne_distribution":
      if (s.has_share_invite_collaborate) {
        score += 40;
        evidence.push("Share/invite/collaborate signals in product");
      } else if (/schedul|calendar|meet|collaborat|invite|refer|storage|sync/.test(textBlob(ctx.project, ctx.profile))) {
        score += 25;
      } else blockers.push("No product-borne loop entry detected.");
      break;
    case "customer_output":
      if (s.has_generative_output || /video|photo|design|fitness|music|game/.test(textBlob(ctx.project, ctx.profile))) {
        score += 30;
      } else blockers.push("User output does not appear inherently share-worthy.");
      break;
    case "category_education":
      if (s.is_b2b_saas) score += 25;
      if (s.has_blog) score += 15;
      if (/complex|methodology|certif|academy|inbound|education/.test(textBlob(ctx.project, ctx.profile))) score += 10;
      break;
    case "proprietary_data":
      if (/analytics|data|insight|benchmark|sales call|conversation|fintech|security/.test(textBlob(ctx.project, ctx.profile))) {
        score += 35;
        evidence.push("Data exhaust product signals");
      }
      if (presence.proprietary_data.allowed && s.is_b2b_saas) score += 10;
      break;
    case "release_ritual":
      if (s.is_devtool || s.has_api_surface) score += 25;
      if (s.launch_imminent) score += 20;
      if (fit?.weekly_marketing_hours === "under_3") score -= 5;
      break;
    case "community_demand":
      if (s.is_consumer) score += 20;
      if (/beauty|cosmetic|fashion|consumer|retail/.test(textBlob(ctx.project, ctx.profile))) score += 15;
      break;
    case "owned_culture_media":
      if (/prelaunch|idea|^$/.test(s.company_stage) || fit?.monthly_budget_band === "0") {
        blockers.push("Early stage / zero budget — owned culture media deferred.");
        score = 0;
      } else if (fit?.monthly_budget_band === "under_500") {
        blockers.push("Insufficient capital for owned media infrastructure.");
        score = Math.min(score, 10);
      } else score += 15;
      break;
    default:
      break;
  }

  if (fit?.brand_face_readiness === "never") {
    score -= intensityScore(record.founder_dependency);
  }
  if (fit?.monthly_budget_band === "0" && record.capital_intensity !== "low") {
    score -= 15;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const confidence: MechanismEligibility["confidence"] =
    evidence.length > 0 ? "measured" : blockers.length > 0 && score < 20 ? "missing" : "assumption";

  return {
    engine_id: id,
    score: blockers.length > 0 && score === 0 ? 0 : score,
    blockers,
    evidence,
    confidence,
  };
}

function gapsInclude(ctx: MechanismEvalContext, gap: string): boolean {
  return ctx.scanSignals.gaps.includes(gap);
}

export function assessGrowthMechanisms(ctx: MechanismEvalContext): GrowthMechanismAssessment {
  const ranked = GROWTH_MECHANISM_IDS.map((id) => scoreMechanism(id, ctx))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  const primary = ranked[0]?.engine_id;
  let secondary: GrowthMechanismId | undefined;
  if (ranked.length >= 2 && ranked[0]!.score - ranked[1]!.score <= BLEND_THRESHOLD) {
    secondary = ranked[1]!.engine_id;
  }
  return {
    ranked,
    primary,
    secondary,
    computed_at: new Date().toISOString(),
  };
}

export function selectMechanismMix(assessment: GrowthMechanismAssessment): {
  primary: GrowthMechanismId;
  secondary?: GrowthMechanismId;
} {
  const primary = assessment.primary ?? "intent_to_product";
  return { primary, secondary: assessment.secondary };
}

export function buildMechanismRationale(
  id: GrowthMechanismId,
  ctx: MechanismEvalContext,
): { headline: string; rationale: string[]; anti_pattern: string } {
  const record = getMechanismRecord(id);
  const eligibility = scoreMechanism(id, ctx);
  return {
    headline: record.label,
    rationale: [
      record.hidden_system_chain[0] ?? record.label,
      ...eligibility.evidence.slice(0, 2),
      record.problem_solved[0] ?? "",
    ].filter(Boolean),
    anti_pattern: record.superficial_wrong_lesson,
  };
}

export function buildMechanismWeek1Tasks(
  id: GrowthMechanismId,
  _weekIndex: number,
  secondaryId?: GrowthMechanismId,
): Omit<CmoWeek1Priority, "id">[] {
  const primary = getMechanismRecord(id);
  const tasks: MechanismWeek1Template[] = [...primary.week1_task_templates];
  if (secondaryId && tasks.length >= 2) {
    const secondary = getMechanismRecord(secondaryId);
    const extra = secondary.week1_task_templates[0];
    if (extra) tasks[2] = extra;
  }
  return capWeek1Priorities(
    tasks.slice(0, 5).map((t, i) => ({
      ...enrichMechanismWeek1Priority(t, id, i),
      id: `mech.w1.${i}`,
    })),
  ).map(({ id: _id, ...rest }) => rest);
}

export function applyMechanismToChannelThesis(
  thesis: ChannelThesis,
  mechanismId: GrowthMechanismId,
  secondaryId?: GrowthMechanismId,
  weekIndex = 1,
): ChannelThesis {
  const record = getMechanismRecord(mechanismId);
  const taskTemplates = buildMechanismWeek1Tasks(mechanismId, weekIndex, secondaryId);
  const week1_priorities: CmoWeek1Priority[] = taskTemplates.map((t, i) => ({
    ...t,
    id: `${thesis.id}.w${weekIndex}.m${i}`,
  }));
  const rationale = [
    `${record.label}: ${record.hidden_system_chain[0]}`,
    ...record.problem_solved.slice(0, 1),
    ...thesis.rationale,
  ].slice(0, 4);
  const deprioritize = Array.from(
    new Set([...thesis.deprioritize, ...(record.deprioritize_extra ?? []), ...record.anti_patterns.slice(0, 1)]),
  ).slice(0, 6);
  return {
    ...thesis,
    rationale,
    week1_priorities,
    deprioritize,
    primary_playbook_ids: record.lane_a_skills?.length
      ? [...record.lane_a_skills, ...thesis.primary_playbook_ids].slice(0, 4)
      : thesis.primary_playbook_ids,
    signals: {
      ...thesis.signals,
      primary_mechanism_id: mechanismId,
      ...(secondaryId ? { secondary_mechanism_id: secondaryId } : {}),
    },
  };
}

export function mapMechanismToThesis(
  mechanismId: GrowthMechanismId,
  ctx: MechanismEvalContext,
): ChannelThesisId {
  const record = getMechanismRecord(mechanismId);
  const fit = ctx.founderFit;
  const signals = ctx.founderFitSignals ?? {
    baseline_thesis_id: ctx.profile?.channel_thesis?.id,
    is_consumer: ctx.scanSignals.is_consumer,
    is_b2b: ctx.scanSignals.is_b2b_saas,
    is_devtool: ctx.scanSignals.is_devtool,
    launch_imminent: ctx.scanSignals.launch_imminent,
  };
  if (fit) {
    const eligible = filterEligibleTheses(record.thesis_candidates[0] ?? "landing_conversion", fit, signals);
    for (const candidate of record.thesis_candidates) {
      if (eligible.includes(candidate)) return candidate;
      if (scoreThesisEligibility(candidate, fit, signals).blockers.length === 0) return candidate;
    }
  }
  return record.thesis_candidates[0] ?? "landing_conversion";
}

export function buildMechanismAntiPatternRedList(
  primaryId: GrowthMechanismId | undefined,
  ranked: MechanismEligibility[],
): RedListItem[] {
  const items: RedListItem[] = [];
  if (primaryId !== "brand_character") {
    items.push({
      id: "red.mechanism.mascot_tiktok",
      tactic: "Random mascot TikTok without product tension",
      reason: "Brand Character Engine is not the binding mechanism.",
      evidence: [],
    });
  }
  if (primaryId !== "solution_ecosystem") {
    items.push({
      id: "red.mechanism.empty_discord",
      tactic: "Empty Discord ambassador program",
      reason: "Solution Creator Ecosystem is not active — community theater won't compound.",
      evidence: [],
    });
  }
  const primaryScore = ranked.find((r) => r.engine_id === primaryId)?.score ?? 0;
  for (const row of ranked) {
    if (row.engine_id === primaryId) continue;
    if (row.score >= primaryScore - 5) continue;
    const record = getMechanismRecord(row.engine_id);
    for (const anti of record.anti_patterns.slice(0, 1)) {
      items.push({
        id: `red.mechanism.${row.engine_id}`,
        tactic: anti,
        reason: `Not primary mechanism — ${record.label} score too low for this product.`,
        evidence: row.blockers.slice(0, 1),
      });
    }
  }
  return items.slice(0, 8);
}

export function resolveMechanismOperatorFlags(
  mechanismId: GrowthMechanismId,
  secondaryId?: GrowthMechanismId,
): MechanismOperatorFlags {
  const primary = getMechanismRecord(mechanismId).operator_flags;
  const secondary = secondaryId ? getMechanismRecord(secondaryId).operator_flags : {};
  return {
    distribution: primary.distribution || secondary.distribution,
    influencer: primary.influencer || secondary.influencer,
    delegate: primary.delegate || secondary.delegate,
    character_mode: primary.character_mode || secondary.character_mode,
    community_listening: primary.community_listening || secondary.community_listening,
    partner_brief: primary.partner_brief || secondary.partner_brief,
  };
}

export function buildGrowthMechanismProfile(input: {
  project: ProjectProfile;
  profile?: MarketingProfile | null;
  founderFit?: FounderFitProfile | null;
  presence?: PublicPresencePolicy | null;
  persona?: Persona;
  founderFitSignals?: FounderFitSignals;
}): GrowthMechanismProfile {
  const scanSignals = buildEngineScanSignals(input.project, input.profile);
  const ctx: MechanismEvalContext = {
    project: input.project,
    profile: input.profile,
    founderFit: input.founderFit,
    presence: input.presence ?? defaultPublicPresencePolicy(input.founderFit),
    persona: input.persona,
    scanSignals,
    founderFitSignals: input.founderFitSignals,
  };
  const assessment = assessGrowthMechanisms(ctx);
  const mix = selectMechanismMix(assessment);
  return {
    assessment,
    primary_mechanism_id: mix.primary,
    secondary_mechanism_id: mix.secondary,
    presence_policy: ctx.presence ?? undefined,
    configured_at: new Date().toISOString(),
  };
}

export function hydrateGrowthMechanismProfileFromJson(
  raw: unknown,
): GrowthMechanismProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const primary = o.primary_mechanism_id;
  if (typeof primary !== "string" || !GROWTH_MECHANISM_IDS.includes(primary as GrowthMechanismId)) {
    return null;
  }
  const ranked = Array.isArray((o.assessment as { ranked?: unknown })?.ranked)
    ? ((o.assessment as { ranked: MechanismEligibility[] }).ranked ?? [])
    : [];
  return {
    assessment: {
      ranked,
      primary: (o.assessment as { primary?: GrowthMechanismId })?.primary,
      secondary: (o.assessment as { secondary?: GrowthMechanismId })?.secondary,
      computed_at: String((o.assessment as { computed_at?: string })?.computed_at ?? new Date().toISOString()),
    },
    primary_mechanism_id: primary as GrowthMechanismId,
    secondary_mechanism_id:
      typeof o.secondary_mechanism_id === "string"
        ? (o.secondary_mechanism_id as GrowthMechanismId)
        : undefined,
    presence_policy: o.presence_policy as PublicPresencePolicy | undefined,
    configured_at: String(o.configured_at ?? new Date().toISOString()),
  };
}

export function harvestEngineSignalsFromCycle(input: {
  mechanismId: GrowthMechanismId;
  cycleIndex: number;
  thesisId: ChannelThesisId;
  programStepsCompleted: number;
  now?: string;
}): Array<{
  id: string;
  cycle_index: number;
  thesis_id: ChannelThesisId;
  source: "engine_signal";
  source_id: string;
  hypothesis: string;
  outcome: "won" | "inconclusive";
  learning: string;
  message_ids: string[];
  recorded_at: string;
}> {
  const record = getMechanismRecord(input.mechanismId);
  if (input.programStepsCompleted <= 0) return [];
  return [
    {
      id: `engine.${input.mechanismId}.c${input.cycleIndex}`,
      cycle_index: input.cycleIndex,
      thesis_id: input.thesisId,
      source: "engine_signal",
      source_id: input.mechanismId,
      hypothesis: record.hidden_system_chain[0] ?? record.label,
      outcome: input.programStepsCompleted >= 2 ? "won" : "inconclusive",
      learning: `${input.programStepsCompleted} mechanism program steps completed with proof.`,
      message_ids: [],
      recorded_at: input.now ?? new Date().toISOString(),
    },
  ];
}

export function buildEngineReplanHints(
  profile: GrowthMechanismProfile,
): Array<{ headline: string; rationale: string }> {
  const record = getMechanismRecord(profile.primary_mechanism_id);
  return record.failure_modes.slice(0, 2).map((fm) => ({
    headline: `Mechanism watch: ${record.label}`,
    rationale: fm,
  }));
}

/** Safe posture mechanism — lowest capital + founder dependency among eligible. */
export function pickSafeMechanism(ranked: MechanismEligibility[]): GrowthMechanismId {
  let best: GrowthMechanismId = ranked[0]?.engine_id ?? "intent_to_product";
  let bestCost = 999;
  for (const row of ranked) {
    const rec = getMechanismRecord(row.engine_id);
    const cost =
      intensityScore(rec.capital_intensity) + intensityScore(rec.founder_dependency);
    if (cost < bestCost) {
      bestCost = cost;
      best = row.engine_id;
    }
  }
  return best;
}

export function pickAttackMechanism(ranked: MechanismEligibility[]): GrowthMechanismId {
  let best: GrowthMechanismId = ranked[0]?.engine_id ?? "founder_narrative";
  let bestUpside = -1;
  for (const row of ranked.slice(0, 5)) {
    const rec = getMechanismRecord(row.engine_id);
    const upside =
      intensityScore(rec.compounding_potential) + row.score * 0.5;
    if (upside > bestUpside) {
      bestUpside = upside;
      best = row.engine_id;
    }
  }
  return best;
}

export function resolveMechanismLaneBMode(
  mechanismId?: GrowthMechanismId,
): import("./cmoLaneB").LaneBMode | undefined {
  if (!mechanismId) return undefined;
  const raw = getMechanismRecord(mechanismId).lane_b_mode;
  const map: Record<string, import("./cmoLaneB").LaneBMode> = {
    posting_calendar: "posting_calendar",
    outreach_tracker: "outreach_tracker",
    outreach: "outreach_tracker",
    launch_runbook: "launch_runbook",
    runbook: "launch_runbook",
    distribution_log: "distribution_log",
  };
  return raw ? map[raw] : undefined;
}

export { listMechanismRecords, getMechanismRecord };
