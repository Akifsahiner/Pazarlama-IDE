/**
 * P13 — A/B/C strategy construction, recommendation, target honesty, and decision seal.
 */
import {
  scoreThesisEligibility,
  type FounderFitSignals,
} from "./cmoFounderFit";
import { channelThesisTitle, type ChannelThesis, type ChannelThesisId } from "./cmoIntake";
import {
  assessGrowthMechanisms,
  buildEngineScanSignals,
  buildMechanismRationale,
  defaultPublicPresencePolicy,
  type MechanismEvalContext,
} from "./cmoGrowthEngine";
import {
  evaluateThesisQuality,
  pickAttackPairFromReport,
  pickSafePairFromReport,
  type ThesisQualityReport,
} from "./cmoThesisQualityEngine";
import type { GrowthMechanismId } from "./cmoGrowthMechanismKnowledge";
import { getMechanismRecord } from "./cmoGrowthMechanismKnowledge";
import type {
  FounderFitProfile,
  GrowthNarrative,
  MarketingProfile,
  ProjectProfile,
  StrategicDecision,
  StrategicOption,
  StrategicOptionId,
} from "./types";

function detectSignals(project: ProjectProfile, profile?: MarketingProfile | null): FounderFitSignals {
  const text = `${project.readmeSummary ?? ""} ${project.productType ?? ""} ${profile?.category ?? ""}`.toLowerCase();
  return {
    is_consumer: profile?.business_model === "consumer" || /consumer|b2c|creator|mobile/.test(text),
    is_b2b: profile?.business_model === "saas" || /\bb2b\b|saas|enterprise|team/.test(text),
    is_devtool: /developer|devtool|api|sdk|cli|open.?source/.test(text),
    launch_imminent:
      profile?.days_until_launch != null &&
      profile.days_until_launch >= 0 &&
      profile.days_until_launch <= 30,
  };
}

const WIN_LABEL: Record<FounderFitProfile["thirty_day_win"], { label: string; unit: string }> = {
  qualified_signups: { label: "Qualified signups", unit: "signups" },
  paying_customers: { label: "Paying customers", unit: "customers" },
  waitlist: { label: "Waitlist additions", unit: "people" },
  pipeline_meetings: { label: "Qualified pipeline meetings", unit: "meetings" },
  brand_awareness: { label: "Qualified awareness actions", unit: "actions" },
};

function relevantBaseline(
  fit: FounderFitProfile,
  profile?: MarketingProfile | null,
): number | undefined {
  const terms: Record<FounderFitProfile["thirty_day_win"], RegExp> = {
    qualified_signups: /signup|lead|registration/i,
    paying_customers: /customer|paid|purchase|revenue/i,
    waitlist: /waitlist/i,
    pipeline_meetings: /meeting|pipeline|demo/i,
    brand_awareness: /view|impression|reach|awareness/i,
  };
  const kpi = profile?.manual_kpis?.find((item) => terms[fit.thirty_day_win].test(item.name));
  if (kpi && Number.isFinite(kpi.value)) return kpi.value;
  if (fit.thirty_day_win === "qualified_signups" && profile?.current_users != null) {
    return profile.current_users;
  }
  return undefined;
}

export function buildThirtyDayTarget(
  _thesisId: ChannelThesisId,
  fit: FounderFitProfile,
  profile?: MarketingProfile | null,
): StrategicOption["thirty_day_target"] {
  const descriptor = WIN_LABEL[fit.thirty_day_win];
  const baseline = relevantBaseline(fit, profile);
  if (baseline != null) {
    return {
      metric_label: descriptor.label,
      target: Math.max(baseline + 1, Math.ceil(baseline * 1.2)),
      unit: descriptor.unit,
      confidence: "measured",
      calibration_note: `Based on the recorded baseline of ${baseline}; recalibrate after Week 1 proof.`,
    };
  }
  return {
    metric_label: descriptor.label,
    unit: descriptor.unit,
    confidence: "assumption",
    calibration_note: "No trustworthy baseline exists. Set the numeric target after Week 1 proof.",
  };
}

export function buildContract(
  option: Pick<StrategicOption, "posture" | "thesis_id">,
  fit: FounderFitProfile,
  narrative: GrowthNarrative,
): Pick<StrategicOption, "cmo_commits" | "founder_commits"> {
  const volume =
    fit.weekly_marketing_hours === "under_3"
      ? "one focused execution block each week"
      : fit.weekly_marketing_hours === "3_7"
        ? "two focused execution blocks each week"
        : "the agreed daily execution cadence";
  return {
    cmo_commits: [
      `Keep every lane anchored to: “${narrative.one_liner}”`,
      `Operate the ${option.thesis_id.replace(/_/g, " ")} thesis until evidence changes it.`,
      "Ship eligible repo work and prepare every human handoff with a done condition.",
      "Review Week 1 evidence before increasing volume or spend.",
    ],
    founder_commits: [
      `Protect ${volume}.`,
      fit.brand_face_readiness === "never"
        ? "Provide product proof and approve delegated creative without becoming the brand face."
        : "Record or publish the founder-owned assets in the agreed cadence.",
      "Return live URLs or measured proof so the CMO can adapt.",
    ],
  };
}

function makeOption(input: {
  id: StrategicOptionId;
  posture: StrategicOption["posture"];
  thesisId: ChannelThesisId;
  mechanismId: GrowthMechanismId;
  mechanismCtx: MechanismEvalContext;
  mechanismScore: number;
  mechanismBlockers: string[];
  fit: FounderFitProfile;
  narrative: GrowthNarrative;
  profile?: MarketingProfile | null;
  signals: FounderFitSignals;
  quality_evidence?: string[];
  why_not_summary?: string;
}): StrategicOption {
  const eligibility = scoreThesisEligibility(input.thesisId, input.fit, input.signals);
  const mechanismBlocked = input.mechanismBlockers.length > 0 && input.mechanismScore === 0;
  const mech = buildMechanismRationale(input.mechanismId, input.mechanismCtx);
  const record = getMechanismRecord(input.mechanismId);
  const target = buildThirtyDayTarget(input.thesisId, input.fit, input.profile);
  const option: StrategicOption = {
    id: input.id,
    posture: input.posture,
    thesis_id: input.thesisId,
    title: `${mech.headline} · ${channelThesisTitle(input.thesisId)}`,
    summary:
      input.posture === "safe"
        ? `Lowest-load mechanism path: ${record.label}.`
        : input.posture === "balanced"
          ? `Best mechanism fit for this product: ${record.label}.`
          : `Highest-upside mechanism: ${record.label}.`,
    tradeoffs: [
      {
        pro: mech.rationale[0] ?? record.problem_solved[0] ?? "",
        con: mech.anti_pattern,
      },
    ],
    thirty_day_target:
      input.posture === "category_attack" && target.target != null
        ? { ...target, target: Math.ceil(target.target * 1.25), confidence: "stretch" }
        : target,
    cmo_commits: [],
    founder_commits: [],
    eligible: eligibility.blockers.length === 0 && !mechanismBlocked,
    ineligible_reason: mechanismBlocked ? input.mechanismBlockers[0] : eligibility.blockers[0],
    primary_mechanism_id: input.mechanismId,
    mechanism_label: record.label,
    mechanism_summary: record.hidden_system_chain[0],
    mechanism_rationale: mech.rationale,
    mechanism_anti_pattern: mech.anti_pattern,
    quality_evidence: input.quality_evidence,
    why_not_summary: input.why_not_summary,
  };
  return { ...option, ...buildContract(option, input.fit, input.narrative) };
}

export function recommendOption(
  options: StrategicDecision["options"],
  fit: FounderFitProfile,
  signals: FounderFitSignals,
  mechanismRanked?: Array<{ engine_id: GrowthMechanismId; score: number }>,
): { id: StrategicOptionId; rationale: string[] } {
  const scoreForMechanism = (id?: GrowthMechanismId) =>
    mechanismRanked?.find((row) => row.engine_id === id)?.score ?? 0;
  const eligible = options.filter((option) => option.eligible);
  const ranked = eligible
    .map((option) => ({
      option,
      score:
        scoreForMechanism(option.primary_mechanism_id) +
        scoreThesisEligibility(option.thesis_id, fit, signals).score * 0.35 +
        (option.posture === "balanced" ? 18 : option.posture === "safe" ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score);
  const winner = ranked[0]?.option ?? options[0];
  return {
    id: winner.id,
    rationale: winner.mechanism_rationale?.slice(0, 2) ?? [
      "It fits the growth mechanism evidence found in the project.",
      "Its founder workload matches the commitment you gave.",
      "We will not copy superficial tactics from unrelated playbooks.",
    ],
  };
}

export function buildStrategicDecision(input: {
  project: ProjectProfile;
  profile?: MarketingProfile | null;
  founderFit: FounderFitProfile;
  narrative: GrowthNarrative;
  baselineThesis: ChannelThesis;
  qualityReport?: ThesisQualityReport;
  now?: string;
}): { decision: StrategicDecision; qualityReport: ThesisQualityReport } {
  const signals = {
    ...detectSignals(input.project, input.profile),
    baseline_thesis_id: input.baselineThesis.id,
  };
  const presence =
    input.profile?.public_presence_policy ?? defaultPublicPresencePolicy(input.founderFit);
  const qualityReport =
    input.qualityReport ??
    evaluateThesisQuality({
      project: input.project,
      profile: input.profile,
      founder_fit: input.founderFit,
      presence: presence as import("./cmoGrowthEngine").PublicPresencePolicy,
      activation: input.profile?.product_activation,
      now: input.now,
    });
  const mechanismCtx: MechanismEvalContext = {
    project: input.project,
    profile: input.profile,
    founderFit: input.founderFit,
    presence,
    scanSignals: buildEngineScanSignals(input.project, input.profile),
    founderFitSignals: signals,
  };
  const assessment = assessGrowthMechanisms(mechanismCtx);
  const ranked = assessment.ranked;
  const safePair = pickSafePairFromReport(qualityReport);
  const balancedPair = qualityReport.ranked_pairs[0] ?? safePair;
  const attackPair = pickAttackPairFromReport(qualityReport);
  const safeMechanism = safePair.mechanism_id;
  const balancedMechanism = balancedPair.mechanism_id;
  const attackMechanism = attackPair.mechanism_id;
  const safeThesis = safePair.thesis_id;
  const balancedThesis = balancedPair.thesis_id;
  const attackThesis = attackPair.thesis_id;
  const rowFor = (id: GrowthMechanismId) =>
    ranked.find((r) => r.engine_id === id) ?? { score: 0, blockers: [] as string[] };
  const whyNotSummary = qualityReport.why_not_others
    .slice(0, 2)
    .map((w) => w.reason)
    .join(" · ");
  let options: StrategicDecision["options"] = [
    makeOption({
      id: "A",
      posture: "safe",
      thesisId: safeThesis,
      mechanismId: safeMechanism,
      mechanismCtx,
      mechanismScore: rowFor(safeMechanism).score,
      mechanismBlockers: rowFor(safeMechanism).blockers,
      fit: input.founderFit,
      narrative: input.narrative,
      profile: input.profile,
      signals,
      quality_evidence: qualityReport.why_now.slice(0, 2),
      why_not_summary: whyNotSummary,
    }),
    makeOption({
      id: "B",
      posture: "balanced",
      thesisId: balancedThesis,
      mechanismId: balancedMechanism,
      mechanismCtx,
      mechanismScore: rowFor(balancedMechanism).score,
      mechanismBlockers: rowFor(balancedMechanism).blockers,
      fit: input.founderFit,
      narrative: input.narrative,
      profile: input.profile,
      signals,
      quality_evidence: qualityReport.why_now,
      why_not_summary: whyNotSummary,
    }),
    makeOption({
      id: "C",
      posture: "category_attack",
      thesisId: attackThesis,
      mechanismId: attackMechanism,
      mechanismCtx,
      mechanismScore: rowFor(attackMechanism).score,
      mechanismBlockers: rowFor(attackMechanism).blockers,
      fit: input.founderFit,
      narrative: input.narrative,
      profile: input.profile,
      signals,
      quality_evidence: qualityReport.why_now.slice(0, 2),
      why_not_summary: whyNotSummary,
    }),
  ];
  if (input.baselineThesis.verdict === "not_ready") {
    options = options.map((option) => ({
      ...option,
      eligible: false,
      ineligible_reason: input.baselineThesis.verdict_reason,
    })) as StrategicDecision["options"];
  }
  const recommendation = recommendOption(options, input.founderFit, signals, ranked);
  const selected = options.find((option) => option.id === recommendation.id)!;
  const decision: StrategicDecision = {
    options,
    recommended_id: recommendation.id,
    recommendation_rationale: qualityReport.why_now.slice(0, 3).length
      ? qualityReport.why_now.slice(0, 3)
      : recommendation.rationale,
    decision_question: `Execute Option ${selected.id} — ${selected.title}?`,
    generated_at: input.now ?? new Date().toISOString(),
  };
  return { decision, qualityReport };
}

export function sealStrategicDecision(
  decision: StrategicDecision,
  selectedId: StrategicOptionId,
  now = new Date().toISOString(),
): StrategicDecision {
  const option = decision.options.find((item) => item.id === selectedId);
  if (!option?.eligible) return decision;
  return { ...decision, selected_id: selectedId, sealed_at: now };
}

export function isStrategicDecisionSealed(
  profile?: Pick<MarketingProfile, "strategic_decision" | "ops_cadence"> | null,
): boolean {
  return Boolean(profile?.strategic_decision?.sealed_at || profile?.ops_cadence);
}

export function isAdvicePhaseActive(
  profile?: Pick<MarketingProfile, "channel_thesis" | "strategic_decision" | "ops_cadence"> | null,
): boolean {
  return Boolean(profile?.channel_thesis && !isStrategicDecisionSealed(profile));
}
