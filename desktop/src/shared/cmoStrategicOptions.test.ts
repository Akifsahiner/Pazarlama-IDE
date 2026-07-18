import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake, buildFinalChannelThesis } from "./cmoIntake";
import { synthesizeGrowthNarrative } from "./cmoGrowthNarrative";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { createDistributionOperatorFromThesis } from "./cmoDistributionOperator";
import {
  buildStrategicDecision,
  buildThirtyDayTarget,
  isAdvicePhaseActive,
  isStrategicDecisionSealed,
  sealStrategicDecision,
} from "./cmoStrategicOptions";
import type { FounderFitProfile, MarketingProfile, ProjectProfile } from "./types";

function project(readmeSummary = "B2B SaaS for teams"): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/project" },
    name: "Acme",
    framework: "Next.js",
    readmeSummary,
    routes: ["app/page.tsx", "app/signup/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
  };
}

function fit(overrides: Partial<FounderFitProfile> = {}): FounderFitProfile {
  return {
    brand_face_readiness: "sometimes",
    controversy_tolerance: "selective",
    monthly_budget_band: "under_500",
    scale_readiness: "probably",
    magic_moment: "creates a verified result in under two minutes",
    weekly_marketing_hours: "3_7",
    thirty_day_win: "qualified_signups",
    completed_at: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

function decision(overrides: Partial<FounderFitProfile> = {}, readme?: string) {
  const p = project(readme);
  const founderFit = fit(overrides);
  const baseline = buildCmoIntake({ project: p, persona: "marketing", draft: true });
  const narrative = synthesizeGrowthNarrative({ project: p, founderFit });
  return {
    p,
    founderFit,
    baseline,
    narrative,
    result: buildStrategicDecision({
      project: p,
      founderFit,
      narrative,
      baselineThesis: baseline,
      now: "2026-07-15T00:00:00.000Z",
    }),
  };
}

describe("strategic options", () => {
  it("always presents exactly A/B/C", () => {
    assert.deepEqual(
      decision().result.options.map((option) => option.id),
      ["A", "B", "C"],
    );
  });

  it("keeps option postures distinct", () => {
    assert.deepEqual(
      decision().result.options.map((option) => option.posture),
      ["safe", "balanced", "category_attack"],
    );
  });

  it("never recommends an ineligible option", () => {
    const result = decision({
      brand_face_readiness: "never",
      scale_readiness: "not_yet",
    }).result;
    const recommended = result.options.find((option) => option.id === result.recommended_id)!;
    assert.equal(recommended.eligible, true);
  });

  it("marks founder social ineligible for camera-shy founders", () => {
    const result = decision({ brand_face_readiness: "never" }).result;
    const founder = result.options.find((option) => option.thesis_id === "founder_social");
    if (founder) assert.equal(founder.eligible, false);
  });

  it("labels targets as assumptions without a baseline", () => {
    const target = buildThirtyDayTarget("founder_social", fit(), null);
    assert.equal(target.confidence, "assumption");
    assert.equal(target.target, undefined);
  });

  it("uses a conservative measured target from a real KPI", () => {
    const profile = {
      manual_kpis: [
        {
          id: "signup",
          name: "Qualified signups",
          value: 100,
          updated_at: "now",
          source: "manual",
        },
      ],
    } as MarketingProfile;
    const target = buildThirtyDayTarget("founder_social", fit(), profile);
    assert.equal(target.confidence, "measured");
    assert.equal(target.target, 120);
  });

  it("seals an eligible selected option", () => {
    const original = decision().result;
    const sealed = sealStrategicDecision(original, original.recommended_id, "sealed");
    assert.equal(sealed.sealed_at, "sealed");
    assert.equal(sealed.selected_id, original.recommended_id);
  });

  it("does not seal an ineligible option", () => {
    const original = decision().result;
    const blocked = {
      ...original,
      options: original.options.map((option, index) =>
        index === 0
          ? { ...option, eligible: false, ineligible_reason: "Mechanism blocked for test." }
          : option,
      ) as typeof original.options,
    };
    assert.equal(sealStrategicDecision(blocked, blocked.options[0]!.id).sealed_at, undefined);
  });

  it("recognizes legacy active operations as implicitly sealed", () => {
    assert.equal(isStrategicDecisionSealed({ ops_cadence: {} as never }), true);
  });

  it("advice phase ends after seal", () => {
    const data = decision();
    const sealed = sealStrategicDecision(data.result, data.result.recommended_id);
    assert.equal(
      isAdvicePhaseActive({
        channel_thesis: data.baseline,
        strategic_decision: sealed,
      }),
      false,
    );
  });

  it("final thesis inherits narrative and selected option", () => {
    const data = decision();
    const option = data.result.options.find((item) => item.id === data.result.recommended_id)!;
    const final = buildFinalChannelThesis({
      project: data.p,
      persona: "marketing",
      founder_fit: data.founderFit,
      selected_option: option,
      narrative: data.narrative,
    });
    assert.equal(final.headline, data.narrative.one_liner);
    assert.equal(final.strategic_option_id, option.id);
    assert.equal(final.draft, false);
  });

  it("does not allow a not-ready scan to seal any option", () => {
    const p = project();
    p.source = { kind: "url", url: "https://example.com" };
    p.scannedFileCount = 0;
    const founderFit = fit();
    const baseline = buildCmoIntake({ project: p, persona: "marketing", draft: true });
    const narrative = synthesizeGrowthNarrative({ project: p, founderFit });
    const result = buildStrategicDecision({
      project: p,
      founderFit,
      narrative,
      baselineThesis: baseline,
    });
    assert.ok(result.options.every((option) => !option.eligible));
    assert.equal(sealStrategicDecision(result, "A").sealed_at, undefined);
  });

  it("passes the sealed narrative into Lane B details", () => {
    const data = decision();
    const option = data.result.options.find((item) => item.id === data.result.recommended_id)!;
    const final = buildFinalChannelThesis({
      project: data.p,
      persona: "marketing",
      founder_fit: data.founderFit,
      selected_option: option,
      narrative: data.narrative,
    });
    const lane = createLaneBWorkspaceFromThesis(final, { narrative: data.narrative });
    assert.match(lane.items[0]?.detail ?? "", new RegExp(data.p.name));
  });

  it("passes the sealed narrative into distribution hook scaffolds", () => {
    const p = project("Consumer viral AI assistant");
    const founderFit = fit({
      brand_face_readiness: "primary_channel",
      controversy_tolerance: "lean_in",
      scale_readiness: "yes",
      weekly_marketing_hours: "15_plus",
    });
    const baseline = buildCmoIntake({
      project: p,
      persona: "marketing",
      profile: { business_model: "consumer" } as never,
    });
    const narrative = synthesizeGrowthNarrative({
      project: p,
      founderFit,
      profile: { business_model: "consumer" } as never,
    });
    const operator = createDistributionOperatorFromThesis(
      { ...baseline, id: "viral_short_form" },
      { narrative },
    )!;
    assert.match(operator.hooks[0]!.script_hint, new RegExp(p.name));
  });
});
