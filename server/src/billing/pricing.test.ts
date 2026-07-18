import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateCostCents } from "./pricing.js";

describe("estimateCostCents", () => {
  it("prices sonnet 1M in + 1M out at list rates", () => {
    // $3 + $15 = $18 → 1800 cents
    assert.equal(estimateCostCents("claude-sonnet-4-6", 1_000_000, 1_000_000), 1800);
  });

  it("returns 0 for zero tokens", () => {
    assert.equal(estimateCostCents("claude-sonnet-4-6", 0, 0), 0);
  });

  it("resolves opus by substring", () => {
    const cost = estimateCostCents("claude-opus-4-1-20250514", 1_000_000, 0);
    assert.equal(cost, 1500);
  });

  it("handles small token counts without underflow to zero incorrectly", () => {
    // 1000 in @ $3/M = $0.003 → 0.3 cents → rounds to 0.3
    const cost = estimateCostCents("claude-sonnet-4-6", 1000, 0);
    assert.ok(cost >= 0.3 && cost <= 0.31);
  });
});
