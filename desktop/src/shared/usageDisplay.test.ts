import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeUsage,
  usageStatusChip,
  utcNextMonthStartISO,
  formatQuotaResetLabel,
  packageForTier,
} from "./usageDisplay.js";

describe("usageDisplay", () => {
  it("computes primary pct as max dimension", () => {
    const summary = summarizeUsage({
      tier: "pro",
      tierLabel: "Pro",
      usage: {
        plan: 4,
        agent: 160,
        browser_min: 10,
        tokens_in: 50_000,
        tokens_out: 20_000,
        cost_cents: 800,
      },
      quota: {
        plan_limit: 20,
        agent_limit: 200,
        browser_min_limit: 30,
        cost_budget_cents: 1500,
      },
    });
    assert.equal(summary.primaryPct, 80);
    assert.equal(summary.nearLimit, true);
    assert.equal(summary.agentTurnsRemaining, 40);
  });

  it("flags free tier without AI access", () => {
    const summary = summarizeUsage({
      tier: "free",
      usage: {
        plan: 0,
        agent: 0,
        browser_min: 0,
        tokens_in: 0,
        tokens_out: 0,
        cost_cents: 0,
      },
      quota: {
        plan_limit: 0,
        agent_limit: 0,
        browser_min_limit: 0,
        cost_budget_cents: 0,
      },
    });
    assert.equal(summary.hasAiAccess, false);
    assert.match(usageStatusChip(summary), /Upgrade/);
  });

  it("formats reset label", () => {
    const iso = utcNextMonthStartISO(new Date("2026-07-15T12:00:00Z"));
    assert.equal(iso.startsWith("2026-08-01"), true);
    const label = formatQuotaResetLabel(iso);
    assert.ok(label?.includes("Aug"));
  });

  it("resolves package for tier", () => {
    assert.equal(packageForTier("pro").priceLabel, "$20");
  });
});
