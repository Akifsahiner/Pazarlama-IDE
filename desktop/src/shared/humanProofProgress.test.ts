import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAdvanceToMetrics,
  canCompleteHumanProof,
  validatePostedUrl,
} from "./humanProofProgress";

describe("humanProofProgress", () => {
  it("validatePostedUrl requires min 8 chars", () => {
    assert.equal(validatePostedUrl("short").ok, false);
    assert.equal(validatePostedUrl("https://tiktok.com/post/123").ok, true);
  });

  it("canAdvanceToMetrics requires posted URL", () => {
    assert.equal(canAdvanceToMetrics(null), false);
    assert.equal(canAdvanceToMetrics({ posted_url: "https://example.com/p" }), true);
  });

  it("canCompleteHumanProof blocks KPI when required and missing", () => {
    const r = canCompleteHumanProof({ posted_url: "https://example.com/post" }, true);
    assert.equal(r.ok, false);
    const ok = canCompleteHumanProof(
      { posted_url: "https://example.com/post", kpi_value: 42 },
      true,
    );
    assert.equal(ok.ok, true);
  });
});
