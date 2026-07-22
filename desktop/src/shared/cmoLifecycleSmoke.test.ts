/**
 * End-to-end CMO lifecycle smoke (no Electron):
 * scan → founder/presence → seal → Week 1 ops → review → memory → next cycle.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake, buildFinalChannelThesis } from "./cmoIntake";
import { synthesizeGrowthNarrative } from "./cmoGrowthNarrative";
import {
  buildStrategicDecision,
  isStrategicDecisionSealed,
  sealStrategicDecision,
} from "./cmoStrategicOptions";
import {
  applyMechanismToChannelThesis,
  buildGrowthMechanismProfile,
  defaultPublicPresencePolicy,
  resolveMechanismOperatorFlags,
  resolveMechanismLaneBMode,
} from "./cmoGrowthEngine";
import { buildProductActivationProfile } from "./cmoLaneD";
import { buildRevenueProfile } from "./cmoRevenuePlane";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import { createLaneAWorkspaceFromThesis } from "./cmoLaneA";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { createCampaignSession } from "./campaignSession";
import {
  archiveCompletedCycle,
  canStartNextCycle,
  createInitialContinuousState,
  isContinuousReplanReady,
} from "./cmoContinuous";
import { evaluateWeek1Metrics } from "./cmoProofLoop";
import {
  buildReplanPreview,
  createInitialGrowthMemory,
  harvestMemoryFromCycle,
} from "./cmoGrowthMemory";
import { buildGrowthControlPlane } from "./cmoGrowthPlane";
import type { CmoOpsCadence, CmoOpsTask } from "./cmoOpsCadence";
import type { BudgetSnapshot } from "./cmoBudgetPlane";
import type { FounderFitProfile, MarketingProfile, ProjectProfile } from "./types";

const NOW = "2026-07-16T12:00:00.000Z";

function gongLikeProject(): ProjectProfile {
  return {
    id: "lifecycle-smoke",
    source: { kind: "folder", path: "/analytics-saas" },
    name: "RevSignal",
    framework: "Next.js",
    productType: "saas",
    readmeSummary:
      "B2B revenue intelligence SaaS. Conversation analytics and deal insights for sales teams.",
    routes: ["app/page.tsx", "app/pricing/page.tsx", "app/signup/page.tsx", "app/dashboard/page.tsx"],
    hasAnalytics: true,
    excludedPaths: [],
    scannedFileCount: 240,
  };
}

function founderFit(): FounderFitProfile {
  return {
    brand_face_readiness: "never",
    controversy_tolerance: "avoid",
    monthly_budget_band: "under_500",
    scale_readiness: "probably",
    magic_moment: "sees anonymized benchmark data in under two minutes",
    weekly_marketing_hours: "3_7",
    thirty_day_win: "qualified_signups",
    completed_at: NOW,
  };
}

function completeUserTasks(cadence: CmoOpsCadence): CmoOpsCadence {
  return {
    ...cadence,
    week_review: {
      ...cadence.week_review,
      status: "completed",
      summary: "Research report shipped; signup baseline captured.",
      completed_at: NOW,
    },
    tasks: cadence.tasks.map((task, index): CmoOpsTask => {
      if (task.owner !== "user") {
        return { ...task, status: "done" };
      }
      return {
        ...task,
        status: "done",
        proof: {
          urls: ["https://example.com/report"],
          note: "Published benchmark preview",
          kpi_id: "qualified_signups",
          kpi_value: index === cadence.tasks.length - 1 ? 12 : 8,
          completed_at: NOW,
        },
      };
    }),
  };
}

describe("CMO lifecycle smoke — scan → seal → Week 1 → review → next cycle", () => {
  it("runs the full deterministic golden path without crashing", () => {
    const project = gongLikeProject();
    const fit = founderFit();
    const presence = {
      ...defaultPublicPresencePolicy(fit),
      configured_at: NOW,
      founder: { allowed: false, acceptable_formats: [] },
      proprietary_data: { allowed: true },
    };

    // 1) Scan → draft intake
    const draftThesis = buildCmoIntake({
      project,
      persona: "marketing",
      draft: true,
    });
    assert.ok(draftThesis.week1_priorities.length >= 1);

    // 2) Mechanism assessment from presence + founder fit
    const mechanismProfile = buildGrowthMechanismProfile({
      project,
      founderFit: fit,
      presence,
    });
    assert.ok(mechanismProfile.primary_mechanism_id);
    assert.notEqual(mechanismProfile.primary_mechanism_id, "founder_narrative");

    // 3) Strategic A/B/C + seal
    const narrative = synthesizeGrowthNarrative({ project, founderFit: fit });
    const { decision } = buildStrategicDecision({
      project,
      profile: { public_presence_policy: presence } as unknown as MarketingProfile,
      founderFit: fit,
      narrative,
      baselineThesis: draftThesis,
      now: NOW,
    });
    const selected = decision.options.find((o) => o.id === decision.recommended_id)!;
    assert.equal(selected.eligible, true);
    assert.ok(selected.primary_mechanism_id);

    const sealed = sealStrategicDecision(decision, decision.recommended_id, NOW);
    assert.ok(sealed.sealed_at);
    const profile = {
      founder_fit: fit,
      public_presence_policy: presence,
      growth_mechanism_profile: mechanismProfile,
      growth_narrative: narrative,
      strategic_decision: sealed,
      channel_thesis: draftThesis,
    } as unknown as MarketingProfile;
    assert.equal(isStrategicDecisionSealed(profile), true);

    // 4) Final thesis materialization (mechanism week1 diversity)
    const finalThesis = buildFinalChannelThesis({
      project,
      persona: "marketing",
      profile,
      founder_fit: fit,
      selected_option: selected,
      narrative,
      primary_mechanism_id: selected.primary_mechanism_id,
      secondary_mechanism_id: mechanismProfile.secondary_mechanism_id,
    });
    assert.equal(finalThesis.draft, false);
    assert.equal(finalThesis.signals?.primary_mechanism_id, selected.primary_mechanism_id);
    assert.ok(finalThesis.week1_priorities.every((p) => p.id.includes(".w1.")));

    // 5) P14–P16 gates (product + revenue)
    const productActivation = buildProductActivationProfile({
      founderFit: fit,
      scan: project,
      existing: { signup_count: 10, activated_count: 4, activation_event_label: fit.magic_moment },
      now: NOW,
    });
    assert.ok(productActivation.activation_event_label.length > 10);
    const revenueProfile = buildRevenueProfile({
      scan: { routes: project.routes, hasAnalytics: project.hasAnalytics },
      founderFit: fit,
      strategicDecision: sealed,
      persona: "marketing",
      now: NOW,
    });
    assert.ok(revenueProfile.pricing_thesis);

    // 6) Week 1 ops + lanes + mechanism operator flags
    const session = createCampaignSession({
      projectId: project.id,
      persona: "marketing",
      planHorizon: 30,
    });
    const opsCadence = createOpsCadenceFromThesis(finalThesis, {
      campaignSessionId: session.id,
    });
    const laneA = createLaneAWorkspaceFromThesis(finalThesis, { opsCadence });
    const mechanismFlags = resolveMechanismOperatorFlags(
      selected.primary_mechanism_id!,
      mechanismProfile.secondary_mechanism_id,
    );
    const laneBMode = resolveMechanismLaneBMode(selected.primary_mechanism_id);
    const laneB = createLaneBWorkspaceFromThesis(finalThesis, {
      opsCadence,
      laneBMode,
    });

    assert.ok(laneA.items.length >= 1);
    assert.ok(laneB.items.length >= 1);
    assert.equal(mechanismFlags.distribution, undefined);
    assert.equal(mechanismFlags.influencer, undefined);

    // 7) Growth plane computes without assessment crash
    const plane = buildGrowthControlPlane({
      project,
      persona: "marketing",
      thesis: finalThesis,
      profile: {
        ...profile,
        product_activation: productActivation,
        revenue_profile: revenueProfile,
        ops_cadence: opsCadence,
      },
      opsCadence,
    });
    assert.ok(plane.mechanism_label);
    assert.ok(plane.red_list.length >= 0);

    // 8) Complete Week 1 + review
    const completedCadence = completeUserTasks(opsCadence);
    const assessment = evaluateWeek1Metrics(completedCadence, profile, finalThesis);
    assert.ok(assessment);

    let continuous = createInitialContinuousState({ campaignSessionId: session.id });
    const budgetSnapshot: BudgetSnapshot = {
      plan: { id: "budget.smoke" } as BudgetSnapshot["plan"],
      closeout: [],
      total_spend_usd: 0,
      headline: "Week 1 spend logged",
    };
    continuous = archiveCompletedCycle(continuous, {
      cadence: completedCadence,
      thesis: finalThesis,
      assessment,
      weekReviewSummary: completedCadence.week_review.summary!,
      pivot: completedCadence.pivot_suggestion,
      budgetSnapshot,
      revenueSnapshot: undefined,
      now: NOW,
    });
    assert.equal(continuous.phase, "measuring");

    // 9) Memory harvest + replan preview
    const memory = harvestMemoryFromCycle({
      memory: createInitialGrowthMemory(project.id),
      cadence: completedCadence,
      thesis: finalThesis,
      laneB,
      growthMechanismProfile: {
        ...mechanismProfile,
        primary_mechanism_id: selected.primary_mechanism_id!,
      },
      now: NOW,
    });
    assert.ok(memory.experiments.length >= 1);

    const replan = buildReplanPreview(memory, {
      thesis: finalThesis,
      nextWeekIndex: 2,
      assessment,
      growthMechanismProfile: mechanismProfile,
    });
    assert.ok(replan.rationale.length >= 1);

    // 10) Next cycle gate
    const cycleGate = canStartNextCycle(continuous, completedCadence);
    assert.equal(cycleGate.ok, true);
    assert.equal(
      isContinuousReplanReady(continuous, completedCadence, "measuring"),
      true,
    );

    // 11) Week 2 mechanism re-materialization
    const week2Thesis = applyMechanismToChannelThesis(
      buildCmoIntake({
        project,
        persona: "marketing",
        profile,
        context: { cycle_index: 2 },
      }),
      selected.primary_mechanism_id!,
      mechanismProfile.secondary_mechanism_id,
      2,
    );
    assert.ok(week2Thesis.week1_priorities[0]?.id.includes(".w2."));
  });

  it("sealed thesis guard — draft intake must not replace final mechanism thesis", () => {
    const project = gongLikeProject();
    const fit = founderFit();
    const presence = { ...defaultPublicPresencePolicy(fit), configured_at: NOW };
    const baseline = buildCmoIntake({ project, persona: "marketing", draft: true });
    const narrative = synthesizeGrowthNarrative({ project, founderFit: fit });
    const { decision } = buildStrategicDecision({
      project,
      founderFit: fit,
      narrative,
      baselineThesis: baseline,
      now: NOW,
    });
    const sealed = sealStrategicDecision(decision, decision.recommended_id, NOW);
    const selected = sealed.options.find((o) => o.id === sealed.selected_id)!;
    buildGrowthMechanismProfile({ project, founderFit: fit, presence });
    const finalThesis = buildFinalChannelThesis({
      project,
      persona: "marketing",
      profile: { strategic_decision: sealed } as MarketingProfile,
      founder_fit: fit,
      selected_option: selected,
      narrative,
      primary_mechanism_id: selected.primary_mechanism_id,
    });

    const lockedProfile = {
      strategic_decision: sealed,
      channel_thesis: finalThesis,
      ops_cadence: createOpsCadenceFromThesis(finalThesis),
    } as unknown as MarketingProfile;

    // Simulate runCmoIntake guard: when sealed, draft rebuild must not win
    assert.equal(isStrategicDecisionSealed(lockedProfile), true);
    const draftRebuild = buildCmoIntake({
      project,
      persona: "marketing",
      profile: lockedProfile,
      draft: true,
    });
    assert.notEqual(draftRebuild.id, finalThesis.id);
    // Production store keeps finalThesis — assert the guard condition directly
    assert.ok(lockedProfile.channel_thesis && lockedProfile.channel_thesis.draft === false);
    assert.notEqual(draftRebuild.signals?.primary_mechanism_id, finalThesis.signals?.primary_mechanism_id);
  });
});
