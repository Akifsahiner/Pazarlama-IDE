import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStrategicDecision, sealStrategicDecision } from "./cmoStrategicOptions";
import { buildCmoIntake } from "./cmoIntake";
import { synthesizeGrowthNarrative } from "./cmoGrowthNarrative";
import {
  buildContractView,
  formatThirtyDayTarget,
  isContractDefaultExpanded,
} from "./contractView";
import type { FounderFitProfile, ProjectProfile } from "./types";

function project(): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/project" },
    name: "Acme",
    framework: "Next.js",
    readmeSummary: "B2B SaaS",
    routes: ["app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
  };
}

function fit(): FounderFitProfile {
  return {
    brand_face_readiness: "sometimes",
    controversy_tolerance: "selective",
    monthly_budget_band: "under_500",
    scale_readiness: "probably",
    magic_moment: "creates a verified result",
    weekly_marketing_hours: "3_7",
    thirty_day_win: "qualified_signups",
    completed_at: "2026-07-15T00:00:00.000Z",
  };
}

describe("contractView", () => {
  it("returns null when not sealed", () => {
    assert.equal(buildContractView({ strategic_decision: undefined }), null);
  });

  it("builds view from sealed option", () => {
    const p = project();
    const founderFit = fit();
    const baseline = buildCmoIntake({ project: p, persona: "marketing", draft: true });
    const narrative = synthesizeGrowthNarrative({ project: p, founderFit });
    const result = buildStrategicDecision({
      project: p,
      founderFit,
      narrative,
      baselineThesis: baseline,
    });
    const sealed = sealStrategicDecision(result, result.recommended_id, "2026-07-20T00:00:00.000Z");
    const view = buildContractView({ strategic_decision: sealed });
    assert.ok(view);
    assert.equal(view!.optionId, sealed.selected_id);
    assert.ok(view!.cmoCommits.length >= 1);
    assert.ok(view!.founderCommits.length >= 1);
    assert.equal(view!.sealedAt, "2026-07-20T00:00:00.000Z");
  });

  it("formats assumption target without fake number", () => {
    const formatted = formatThirtyDayTarget({
      metric_label: "Qualified signups",
      confidence: "assumption",
      calibration_note: "No trustworthy baseline exists.",
    });
    assert.match(formatted.headline, /Qualified signups \(assumption\)/);
    assert.equal(formatted.headline.includes("undefined"), false);
  });

  it("default expanded within 7 days of seal", () => {
    const recent = Date.now() - 2 * 24 * 60 * 60 * 1000;
    assert.equal(isContractDefaultExpanded(new Date(recent).toISOString()), true);
    const old = Date.now() - 10 * 24 * 60 * 60 * 1000;
    assert.equal(isContractDefaultExpanded(new Date(old).toISOString()), false);
  });
});
