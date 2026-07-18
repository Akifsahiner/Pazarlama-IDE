import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FOUNDER_FIT_QUESTIONS,
  filterEligibleTheses,
  scoreThesisEligibility,
  validateFounderFit,
} from "./cmoFounderFit";
import type { FounderFitProfile } from "./types";

function fit(overrides: Partial<FounderFitProfile> = {}): FounderFitProfile {
  return {
    brand_face_readiness: "sometimes",
    controversy_tolerance: "selective",
    monthly_budget_band: "under_500",
    scale_readiness: "probably",
    magic_moment: "sees a useful answer in under one minute",
    weekly_marketing_hours: "3_7",
    thirty_day_win: "qualified_signups",
    completed_at: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("founder fit", () => {
  it("contains exactly seven critical questions", () => {
    assert.equal(FOUNDER_FIT_QUESTIONS.length, 7);
  });

  it("validates a complete profile", () => {
    assert.equal(validateFounderFit(fit()), null);
  });

  it("rejects a missing answer", () => {
    assert.match(validateFounderFit({ ...fit(), thirty_day_win: "" as never })!, /What outcome/i);
  });

  it("rejects a vague magic moment", () => {
    assert.match(validateFounderFit(fit({ magic_moment: "value" }))!, /12 characters/i);
  });

  it("blocks founder social when founder will never be the face", () => {
    const result = scoreThesisEligibility(
      "founder_social",
      fit({ brand_face_readiness: "never" }),
    );
    assert.equal(result.blockers.length, 1);
  });

  it("blocks viral volume while scale readiness is not ready", () => {
    const result = scoreThesisEligibility("viral_short_form", fit({ scale_readiness: "not_yet" }));
    assert.match(result.blockers[0]!, /unsafe/i);
  });

  it("boosts influencer path for a camera-shy founder", () => {
    const shy = scoreThesisEligibility(
      "influencer_partnerships",
      fit({ brand_face_readiness: "never" }),
    );
    const visible = scoreThesisEligibility(
      "influencer_partnerships",
      fit({ brand_face_readiness: "primary_channel" }),
    );
    assert.ok(shy.score > visible.score);
  });

  it("returns only eligible theses ordered by score", () => {
    const ids = filterEligibleTheses(
      "founder_social",
      fit({ brand_face_readiness: "never" }),
      { is_b2b: true },
    );
    assert.ok(!ids.includes("founder_social"));
    assert.ok(ids.length >= 3);
  });
});
