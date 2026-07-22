import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tierQuotaFor } from "../tier/tiers.js";

describe("tier cost budgets", () => {
  it("free tier has zero cost budget", () => {
    assert.equal(tierQuotaFor("free").cost_budget_cents, 0);
  });

  it("pro tier includes API budget", () => {
    assert.equal(tierQuotaFor("pro").cost_budget_cents, 1500);
  });

  it("team tier has higher budget than pro", () => {
    assert.ok(tierQuotaFor("team").cost_budget_cents > tierQuotaFor("pro").cost_budget_cents);
  });
});
