import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { synthesizeGrowthNarrative } from "./cmoGrowthNarrative";
import type { FounderFitProfile, ProjectProfile } from "./types";

const founderFit: FounderFitProfile = {
  brand_face_readiness: "sometimes",
  controversy_tolerance: "selective",
  monthly_budget_band: "under_500",
  scale_readiness: "yes",
  magic_moment: "gets the first useful answer during a live meeting",
  weekly_marketing_hours: "3_7",
  thirty_day_win: "qualified_signups",
  completed_at: "2026-07-15T00:00:00.000Z",
};

function project(readmeSummary: string, productType = "web"): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/project" },
    name: "Acme",
    productType,
    framework: "Next.js",
    readmeSummary,
    routes: ["app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 50,
  };
}

describe("growth narrative", () => {
  it("builds controversial consumer AI tension", () => {
    const result = synthesizeGrowthNarrative({
      project: project("Consumer AI undetectable assistant that helps people cheat"),
      founderFit,
      profile: { business_model: "consumer" } as never,
    });
    assert.match(result.cultural_tension, /hidden advantages/i);
  });

  it("builds devtool tension", () => {
    const result = synthesizeGrowthNarrative({
      project: project("Open source SDK and CLI for developers"),
      founderFit,
    });
    assert.match(result.cultural_tension, /Developers/i);
  });

  it("builds B2B outcome tension", () => {
    const result = synthesizeGrowthNarrative({
      project: project("B2B SaaS workspace for enterprise teams"),
      founderFit,
    });
    assert.match(result.enemy_frame!, /activity/i);
  });

  it("uses the profile product name", () => {
    const result = synthesizeGrowthNarrative({
      project: project("B2B SaaS"),
      founderFit,
      profile: { product_name: "Proofly", business_model: "saas" } as never,
    });
    assert.match(result.one_liner, /^Proofly/);
  });

  it("inherits the founder magic moment as proof", () => {
    const result = synthesizeGrowthNarrative({
      project: project("General web product"),
      founderFit,
    });
    assert.match(result.proof_angle, /live meeting/i);
  });

  it("records deterministic audit signals", () => {
    const result = synthesizeGrowthNarrative({
      project: project("Consumer mobile community"),
      founderFit,
      profile: { business_model: "consumer" } as never,
    });
    assert.equal(result.signals.narrative_class, "consumer");
    assert.equal(result.signals.source, "repo_readme+founder_fit");
  });

  it("falls back to project profile without a readme", () => {
    const p = project("");
    const result = synthesizeGrowthNarrative({ project: p, founderFit });
    assert.equal(result.signals.source, "project_profile+founder_fit");
  });

  it("always produces one canonical sentence", () => {
    const result = synthesizeGrowthNarrative({
      project: project("Creator mobile app"),
      founderFit,
    });
    assert.ok(result.one_liner.length > 20);
    assert.equal(result.one_liner.endsWith("."), true);
  });
});
