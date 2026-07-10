import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MarketingProfile } from "./types";
import { resolveChannelActuals } from "./measurementMerge";
import { kpiFromPreset } from "./kpiPresets";

describe("resolveChannelActuals", () => {
  it("maps waitlist manual KPI to signups", () => {
    const profile = {
      manual_kpis: [kpiFromPreset("waitlist_signups", 42, 100)!],
    } as MarketingProfile;
    const actuals = resolveChannelActuals("waitlist-hype", profile);
    assert.equal(actuals.signups, 42);
    assert.equal(actuals.signupsSource, "manual");
  });

  it("computes CPA when spend and signups present on channel", () => {
    const waitlist = kpiFromPreset("waitlist_signups", 10, 100)!;
    const profile = {
      manual_kpis: [{ ...waitlist, channel: "paid-ads-opt" }, kpiFromPreset("paid_spend", 500, undefined)!],
    } as MarketingProfile;
    const actuals = resolveChannelActuals("paid-ads-opt", profile);
    assert.equal(actuals.spend, 500);
    assert.equal(actuals.signups, 10);
    assert.equal(actuals.cpa, 50);
  });

  it("returns empty when no data", () => {
    const actuals = resolveChannelActuals("waitlist-hype", null);
    assert.equal(actuals.signups, undefined);
    assert.equal(actuals.spend, undefined);
  });

  it("labels experiment signups separately from manual", () => {
    const profile = {
      previous_experiments: [
        {
          id: "e1",
          hypothesis: "h",
          outcome: "success",
          metric: { name: "Waitlist signups", value: 12 },
        },
      ],
    } as MarketingProfile;
    const actuals = resolveChannelActuals("waitlist-hype", profile);
    assert.equal(actuals.signups, 12);
    assert.equal(actuals.signupsSource, "experiment");
  });
});
