import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allocationTemplate,
  applyBudgetReallocation,
  budgetAmountFromBand,
  budgetPlanSummary,
  buildBudgetAllocation,
  buildBudgetReplanPreview,
  buildBudgetSnapshot,
  hydrateBudgetPlanFromJson,
  rollupBudgetActuals,
  seedActionCosts,
  type BudgetBucketId,
} from "./cmoBudgetPlane";
import type { ChannelThesisId } from "./cmoIntake";
import type { FounderFitProfile, MarketingProfile } from "./types";

const IDS: ChannelThesisId[] = [
  "viral_short_form",
  "founder_social",
  "product_hunt_launch",
  "landing_conversion",
  "seo_content",
  "outbound_sales",
  "community_launch",
  "influencer_partnerships",
];

function fit(overrides: Partial<FounderFitProfile> = {}): FounderFitProfile {
  return {
    brand_face_readiness: "sometimes",
    controversy_tolerance: "selective",
    monthly_budget_band: "500_2000",
    scale_readiness: "probably",
    magic_moment: "Gets a useful result",
    weekly_marketing_hours: "3_7",
    thirty_day_win: "qualified_signups",
    completed_at: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

function plan(id: ChannelThesisId = "influencer_partnerships", amount = 1000) {
  return buildBudgetAllocation({ id }, fit(), {
    monthlyAmountUsd: amount,
    cpaCeilingUsd: 80,
    now: "2026-07-15T00:00:00.000Z",
  });
}

function bucketPct(id: ChannelThesisId, bucket: BudgetBucketId): number {
  return allocationTemplate(id)[bucket];
}

describe("P14 budget plane", () => {
  it("maps zero band to zero", () => assert.equal(budgetAmountFromBand("0"), 0));
  it("maps under-500 band to 250", () => assert.equal(budgetAmountFromBand("under_500"), 250));
  it("maps 500-2000 band to 1250", () => assert.equal(budgetAmountFromBand("500_2000"), 1250));
  it("maps open upper band to conservative 2500 floor", () =>
    assert.equal(budgetAmountFromBand("over_2000"), 2500));

  for (const id of IDS) {
    it(`${id} template sums to 100`, () => {
      assert.equal(Object.values(allocationTemplate(id)).reduce((a, b) => a + b, 0), 100);
    });
  }

  it("uses band amount as an explicit assumption", () => {
    const result = buildBudgetAllocation({ id: "outbound_sales" }, fit());
    assert.equal(result.monthly_amount_usd, 1250);
    assert.equal(result.amount_confidence, "assumption");
    assert.equal(result.amount_source, "band_midpoint");
  });

  it("uses valid user amount as measured", () => {
    const result = plan("outbound_sales", 777);
    assert.equal(result.monthly_amount_usd, 777);
    assert.equal(result.amount_confidence, "measured");
  });

  it("labels deterministic CPA defaults as assumptions", () => {
    const result = buildBudgetAllocation({ id: "outbound_sales" }, fit());
    assert.equal(result.cpa_ceiling_usd, 400);
    assert.equal(result.cpa_ceiling_confidence, "assumption");
  });

  it("does not accept a negative user amount", () => {
    const result = buildBudgetAllocation({ id: "outbound_sales" }, fit(), {
      monthlyAmountUsd: -1,
    });
    assert.equal(result.monthly_amount_usd, 1250);
  });

  it("zero budget collapses every cash bucket", () => {
    const result = buildBudgetAllocation(
      { id: "influencer_partnerships" },
      fit({ monthly_budget_band: "0" }),
    );
    assert.equal(result.allocations.find((x) => x.bucket_id === "primary_channel")?.pct, 100);
    assert.equal(result.allocations.filter((x) => x.bucket_id !== "primary_channel").every((x) => x.pct === 0), true);
  });

  it("camera-shy founder moves five points to delegation", () => {
    const result = buildBudgetAllocation(
      { id: "founder_social" },
      fit({ brand_face_readiness: "never" }),
      { monthlyAmountUsd: 1000 },
    );
    assert.equal(result.allocations.find((x) => x.bucket_id === "delegate_labor")?.pct, 20);
    assert.equal(result.allocations.find((x) => x.bucket_id === "primary_channel")?.pct, 30);
  });

  it("low weekly hours move ten points to reserve", () => {
    const result = buildBudgetAllocation(
      { id: "outbound_sales" },
      fit({ weekly_marketing_hours: "under_3" }),
      { monthlyAmountUsd: 1000 },
    );
    assert.equal(result.allocations.find((x) => x.bucket_id === "reserve")?.pct, 25);
  });

  it("rounding remainder lands in reserve", () => {
    const result = plan("influencer_partnerships", 1000.01);
    assert.equal(
      result.allocations.reduce((sum, row) => sum + row.amount_usd, 0),
      1000.01,
    );
  });

  it("weekly cap is one quarter of each monthly allocation", () => {
    const result = plan("landing_conversion", 1000);
    const paid = result.allocations.find((x) => x.bucket_id === "paid_ads")!;
    assert.equal(paid.amount_usd, 400);
    assert.equal(paid.weekly_cap_usd, 100);
  });

  it("seeds influencer action estimates without exceeding weekly cap", () => {
    const seeded = seedActionCosts(plan(), {
      influencer: { touches: [{ id: "a" }, { id: "b" }, { id: "c" }] } as never,
    });
    const costs = seeded.action_costs.filter((x) => x.source === "influencer");
    assert.equal(costs.reduce((sum, x) => sum + (x.cost_estimate_usd ?? 0), 0), 137.5);
  });

  it("seeds organic distribution slots at zero", () => {
    const seeded = seedActionCosts(plan(), {
      distribution: { slots: [{ id: "slot.1" }] } as never,
    });
    assert.equal(seeded.action_costs[0]?.cost_estimate_usd, 0);
  });

  it("separates Lane B paid and influencer buckets", () => {
    const seeded = seedActionCosts(plan(), {
      laneB: {
        items: [
          { id: "ad", channel: "paid-ad" },
          { id: "dm", channel: "creator-dm" },
        ],
      } as never,
    });
    assert.equal(seeded.action_costs.find((x) => x.action_id === "ad")?.bucket_id, "paid_ads");
    assert.equal(seeded.action_costs.find((x) => x.action_id === "dm")?.bucket_id, "influencer");
  });

  it("computes measured influencer CPA from logged proof", () => {
    const closeout = rollupBudgetActuals(plan(), null, {
      influencer: {
        touches: [{ proof: { spend_usd: 120, signups: 6 } }],
      } as never,
    });
    const influencer = closeout.find((x) => x.bucket_id === "influencer")!;
    assert.equal(influencer.cpa_usd, 20);
    assert.equal(influencer.cpa_confidence, "measured");
  });

  it("does not compute CPA without outcomes", () => {
    const closeout = rollupBudgetActuals(plan(), null, {
      influencer: { touches: [{ proof: { spend_usd: 120 } }] } as never,
    });
    assert.equal(closeout.find((x) => x.bucket_id === "influencer")?.cpa_usd, undefined);
  });

  it("does not compute CPA without spend", () => {
    const closeout = rollupBudgetActuals(plan(), null, {
      influencer: { touches: [{ proof: { signups: 6 } }] } as never,
    });
    assert.equal(closeout.find((x) => x.bucket_id === "influencer")?.cpa_usd, undefined);
  });

  it("rolls up manual paid spend as USD actual", () => {
    const profile = {
      manual_kpis: [{ id: "paid_spend", name: "Paid ad spend", value: 50 }],
    } as MarketingProfile;
    const row = rollupBudgetActuals(plan(), profile, {}).find((x) => x.bucket_id === "paid_ads")!;
    assert.equal(row.actual_spend_usd, 50);
  });

  it("does not double count influencer proof mirrored into Lane B", () => {
    const closeout = rollupBudgetActuals(plan(), null, {
      influencer: { touches: [{ proof: { spend_usd: 100, signups: 5 } }] } as never,
      laneB: { items: [{ channel: "creator-dm", proof: { spend_usd: 100 } }] } as never,
    });
    assert.equal(closeout.find((x) => x.bucket_id === "influencer")?.actual_spend_usd, 100);
  });

  it("prefers direct paid action proof over aggregate paid_spend KPI", () => {
    const profile = {
      manual_kpis: [{ id: "paid_spend", name: "Paid ad spend", value: 80 }],
    } as MarketingProfile;
    const closeout = rollupBudgetActuals(plan(), profile, {
      laneB: { items: [{ channel: "paid-ad", proof: { spend_usd: 80 } }] } as never,
    });
    assert.equal(closeout.find((x) => x.bucket_id === "paid_ads")?.actual_spend_usd, 80);
  });

  it("builds a measured snapshot headline only from measured CPA", () => {
    const closeout = rollupBudgetActuals(plan(), null, {
      influencer: { touches: [{ proof: { spend_usd: 100, signups: 5 } }] } as never,
    });
    assert.match(buildBudgetSnapshot(plan(), closeout).headline, /measured/);
  });

  it("uses an unavailable headline when outcomes are missing", () => {
    const closeout = rollupBudgetActuals(plan(), null, {});
    assert.match(buildBudgetSnapshot(plan(), closeout).headline, /unavailable/);
  });

  it("scales best measured bucket from reserve by ten points", () => {
    const p = plan();
    const closeout = rollupBudgetActuals(p, null, {
      influencer: { touches: [{ proof: { spend_usd: 100, signups: 5 } }] } as never,
    });
    const preview = buildBudgetReplanPreview(p, closeout, { mode: "double_down" });
    assert.equal(preview.scale_bucket_id, "influencer");
    assert.equal(preview.confidence, "stretch");
  });

  it("cuts a half-spent zero-outcome bucket to reserve", () => {
    const p = plan("landing_conversion");
    const profile = {
      manual_kpis: [
        { id: "paid_spend", name: "Paid ad spend", value: 250 },
        {
          id: "paid_signups",
          name: "Paid signups",
          value: 0,
          channel: "paid-ads-opt",
        },
      ],
    } as MarketingProfile;
    const preview = buildBudgetReplanPreview(p, rollupBudgetActuals(p, profile, {}), {
      mode: "double_down",
    });
    assert.ok(preview.cut_bucket_ids.includes("paid_ads"));
  });

  it("does not reallocate on insufficient evidence", () => {
    const p = plan();
    const preview = buildBudgetReplanPreview(p, rollupBudgetActuals(p, null, {}), {
      mode: "double_down",
    });
    assert.equal(preview.mutations.length, 0);
  });

  it("resets allocation to a new thesis template on pivot", () => {
    const p = plan("influencer_partnerships");
    const preview = buildBudgetReplanPreview(p, [], {
      mode: "pivot",
      targetThesisId: "outbound_sales",
      founderFit: fit(),
    });
    assert.equal(
      preview.mutations.find((x) => x.bucket_id === "delegate_labor")?.to_pct,
      bucketPct("outbound_sales", "delegate_labor"),
    );
  });

  it("applies preview without changing monthly ceiling", () => {
    const p = plan();
    const next = applyBudgetReallocation(p, {
      mutations: [
        { bucket_id: "reserve", from_pct: 5, to_pct: 0, reason: "test" },
        { bucket_id: "influencer", from_pct: 55, to_pct: 60, reason: "test" },
      ],
    });
    assert.equal(next.monthly_amount_usd, p.monthly_amount_usd);
    assert.equal(next.allocations.find((x) => x.bucket_id === "influencer")?.pct, 60);
  });

  it("clears stale action estimates when reallocation applies", () => {
    const p = { ...plan(), action_costs: [{ action_id: "x" }] as never };
    const next = applyBudgetReallocation(p, {
      mutations: [{ bucket_id: "reserve", from_pct: 5, to_pct: 6, reason: "test" }],
    });
    assert.deepEqual(next.action_costs, []);
  });

  it("hydrates valid USD plans", () => assert.ok(hydrateBudgetPlanFromJson(plan())));
  it("rejects non-USD plans", () =>
    assert.equal(hydrateBudgetPlanFromJson({ ...plan(), currency: "EUR" }), null));
  it("summary never reports estimates as spend", () => {
    const p = { ...plan(), action_costs: [{ action_id: "x", cost_estimate_usd: 99 }] as never };
    assert.match(budgetPlanSummary(p)!, /Spent \$0/);
  });
});
