import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DRAFT_QUALITY_REVISE_THRESHOLD,
  DRAFT_QUALITY_WARN_THRESHOLD,
  draftCritiqueSchema,
  shouldReviseDraft,
  shouldWarnDraftQuality,
} from "./critic.js";

describe("draftCritiqueSchema", () => {
  it("parses valid draft critique", () => {
    const parsed = draftCritiqueSchema.parse({
      specificity: 8,
      actionability: 7,
      brand_voice: 8,
      generality_penalty: 2,
      total: 28,
      revisions: [],
      approve: true,
    });
    assert.equal(parsed.total, 28);
    assert.equal(parsed.approve, true);
  });
});

describe("draft quality thresholds", () => {
  const low: import("./critic.js").DraftCritique = {
    specificity: 4,
    actionability: 4,
    brand_voice: 4,
    generality_penalty: 8,
    total: 18,
    revisions: ["Add product name"],
    approve: false,
  };

  it("warns below warn threshold", () => {
    assert.equal(DRAFT_QUALITY_WARN_THRESHOLD, 23);
    assert.equal(shouldWarnDraftQuality(low), true);
  });

  it("revises below revise threshold", () => {
    assert.equal(DRAFT_QUALITY_REVISE_THRESHOLD, 20);
    assert.equal(shouldReviseDraft(low), true);
  });

  it("does not revise approved drafts", () => {
    const ok = { ...low, total: 30, approve: true, revisions: [] };
    assert.equal(shouldReviseDraft(ok), false);
    assert.equal(shouldWarnDraftQuality(ok), false);
  });
});
