import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBillingIssueMarkdown,
  buildPaymentFunnel,
  buildRevenueCloseout,
  buildRevenueProfile,
  buildRevenueReplanPreview,
  buildRevenueTarget,
  completeLinkedMonetizationTaskOnApply,
  completeMonetizationTask,
  computeLtvCacRatio,
  createMonetizationWorkspaceFromBinding,
  detectRevenueBinding,
  harvestRevenueFromCycle,
  hydrateMonetizationWorkspaceFromJson,
  hydrateRevenueProfileFromJson,
  inferPricingThesis,
  linkSiteLevelMonetizationToLaneA,
  logRevenueAttribution,
  rollupRevenueAttribution,
  rollupRevenueFunnel,
  validateMonetizationTaskProof,
  type RevenueBinding,
} from "./cmoRevenuePlane";
import type { ChannelThesis } from "./cmoIntake";
import type { FounderFitProfile, ManualKpi } from "./types";

const NOW = "2026-07-15T00:00:00.000Z";

function kpi(id: string, name: string, value: number, target?: number): ManualKpi {
  return { id, name, value, target, updated_at: NOW, source: "manual" };
}

function founderFit(
  overrides: Partial<FounderFitProfile> = {},
): FounderFitProfile {
  return {
    brand_face_readiness: "sometimes",
    controversy_tolerance: "selective",
    monthly_budget_band: "500_2000",
    thirty_day_win: "paying_customers",
    magic_moment: "ships first useful output",
    scale_readiness: "probably",
    weekly_marketing_hours: "7_15",
    completed_at: NOW,
    ...overrides,
  };
}

function thesisStub(): ChannelThesis {
  return {
    id: "landing_conversion",
    title: "Landing conversion",
    headline: "Fix landing conversion",
    verdict: "marketable",
    verdict_reason: "Ready",
    primary_bottleneck: "conversion",
    rationale: [],
    week1_priorities: [],
    primary_playbook_ids: [],
    lane_a: [],
    lane_b: [],
    deprioritize: [],
    signals: {},
    generated_at: NOW,
  };
}

function revenueBinding(overrides: Partial<RevenueBinding> = {}): RevenueBinding {
  return {
    active: true,
    stage_id: "revenue",
    headline: "Revenue binding",
    rationale: ["Monetization infra missing."],
    evidence: ["revenue.pricing_page_missing"],
    confidence: "assumption",
    trigger: "paying_customers_goal_no_infra",
    ...overrides,
  };
}

describe("P16 Revenue Plane", () => {
  it("infers sales_led when sales persona with empty pipeline", () => {
    const thesis = inferPricingThesis({
      founderFit: founderFit(),
      persona: "sales",
      salesPipelineEmpty: true,
      scan: { routes: ["/pricing", "/signup"] },
    });
    assert.equal(thesis.model, "sales_led");
    assert.match(thesis.headline, /Sales-led/i);
  });

  it("infers plg_self_serve when pricing signup checkout exist", () => {
    const thesis = inferPricingThesis({
      scan: {
        routes: ["/pricing", "/signup", "/checkout"],
        hasPricing: true,
        hasSignup: true,
        hasCheckout: true,
      },
    });
    assert.equal(thesis.model, "plg_self_serve");
    assert.equal(thesis.confidence, "measured");
  });

  it("infers not_yet when paying goal but no pricing page", () => {
    const thesis = inferPricingThesis({
      founderFit: founderFit(),
      scan: { routes: ["/"], hasPricing: false },
    });
    assert.equal(thesis.model, "not_yet");
    assert.ok(thesis.evidence.some((e) => e.includes("revenue.pricing_page_missing")));
  });

  it("builds consumer freemium funnel with trial stage", () => {
    const stages = buildPaymentFunnel("freemium");
    assert.ok(stages.some((s) => s.id === "trial_start"));
    assert.equal(stages[0]?.event_name, "pricing_page_viewed");
  });

  it("does not compute funnel conversion with one missing stage", () => {
    const stages = buildPaymentFunnel("plg_self_serve", { pricing_view: 100 });
    const pricing = stages.find((s) => s.id === "pricing_view")!;
    assert.equal(pricing.count, 100);
    assert.equal(pricing.conversion_confidence, "insufficient_data");
  });

  it("computes conversion when both stages measured", () => {
    const stages = buildPaymentFunnel("plg_self_serve", {
      pricing_view: 100,
      checkout_start: 20,
    });
    const pricing = stages.find((s) => s.id === "pricing_view")!;
    assert.equal(pricing.conversion_to_next_pct, 20);
    assert.equal(pricing.conversion_confidence, "measured");
  });

  it("builds paying customers target with default 30 assumption", () => {
    const target = buildRevenueTarget(founderFit());
    assert.equal(target.metric_id, "paid_customers");
    assert.equal(target.target, 30);
    assert.equal(target.confidence, "assumption");
  });

  it("uses baseline for target when manual KPI exists", () => {
    const target = buildRevenueTarget(founderFit(), null, [
      kpi("paid_customers", "Paying customers", 5, 10),
    ]);
    assert.equal(target.baseline, 5);
    assert.equal(target.confidence, "measured");
    assert.ok((target.target ?? 0) > 5);
  });

  it("builds revenue profile with measured paid count", () => {
    const profile = buildRevenueProfile({
      founderFit: founderFit(),
      scan: { routes: ["/pricing", "/signup", "/checkout"], hasPricing: true, hasSignup: true, hasCheckout: true },
      intake: { paidCustomers: 12, mrrUsd: 600 },
      now: NOW,
    });
    assert.equal(profile.funnel_stages.find((s) => s.id === "paid")?.count, 12);
    assert.equal(profile.mrr_usd, 600);
    assert.equal(profile.metric_confidence.paid_customers, "measured");
  });

  it("detects revenue binding for paying goal without infra", () => {
    const binding = detectRevenueBinding({
      founderFit: founderFit(),
      gaps: ["revenue.pricing_page_missing"],
      productBindingActive: false,
      marketingPaused: false,
    });
    assert.equal(binding.active, true);
    assert.equal(binding.trigger, "paying_customers_goal_no_infra");
  });

  it("does not bind revenue when product loop pauses marketing", () => {
    const binding = detectRevenueBinding({
      founderFit: founderFit(),
      gaps: ["revenue.pricing_page_missing"],
      productBindingActive: true,
      marketingPaused: true,
    });
    assert.equal(binding.active, false);
  });

  it("detects trial_to_paid below floor", () => {
    const binding = detectRevenueBinding({
      founderFit: founderFit(),
      manualKpis: [
        kpi("trial_starts", "Trial starts", 20),
        kpi("trial_to_paid_pct", "Trial to paid", 3),
      ],
    });
    assert.equal(binding.active, true);
    assert.equal(binding.trigger, "trial_to_paid_below_floor");
    assert.equal(binding.confidence, "measured");
  });

  it("creates monetization workspace with pricing page task", () => {
    const profile = buildRevenueProfile({
      founderFit: founderFit(),
      scan: { routes: ["/"] },
      now: NOW,
    });
    const ws = createMonetizationWorkspaceFromBinding({
      thesis: { id: "landing_conversion" },
      binding: revenueBinding(),
      revenueProfile: profile,
      gaps: ["revenue.pricing_page_missing", "revenue.funnel_events_missing"],
      now: NOW,
    })!;
    assert.ok(ws.tasks.some((t) => t.title.includes("pricing page")));
    assert.ok(ws.tasks.every((t) => t.priority === "P0"));
  });

  it("links site-level monetization tasks to Lane A", () => {
    const profile = buildRevenueProfile({ founderFit: founderFit(), now: NOW });
    const ws = createMonetizationWorkspaceFromBinding({
      thesis: { id: "landing_conversion" },
      binding: revenueBinding(),
      revenueProfile: profile,
      gaps: ["revenue.pricing_page_missing"],
      now: NOW,
    })!;
    const linked = linkSiteLevelMonetizationToLaneA(ws, null, thesisStub());
    assert.ok(linked.laneA?.items.length);
    assert.ok(linked.workspace.tasks[0]?.linked_lane_a_item_id);
  });

  it("builds billing issue markdown", () => {
    const md = buildBillingIssueMarkdown({
      id: "x",
      priority: "P0",
      title: "Integrate Stripe",
      problem: "No billing",
      acceptance_criteria: ["Checkout works"],
      growth_impact: "Revenue",
      fix_scope: "core_billing",
      status: "pending",
      sort_order: 0,
    });
    assert.match(md, /MONETIZATION REQUEST/);
    assert.match(md, /Integrate Stripe/);
  });

  it("rollup attribution computes CAC only with spend and paid customers", () => {
    const profile = buildRevenueProfile({ founderFit: founderFit(), now: NOW });
    const withPaid = logRevenueAttribution(profile, {
      source_id: "paid_ads",
      source_label: "paid ads",
      channel_kind: "paid_ads",
      spend_usd: 500,
      spend_confidence: "measured",
      paid_customers: 5,
      attribution_confidence: "measured",
    });
    const rows = rollupRevenueAttribution(withPaid, [
      {
        bucket_id: "paid_ads",
        allocated_usd: 500,
        actual_spend_usd: 500,
        cpa_confidence: "insufficient_data",
        burn_pct: 100,
      },
    ]);
    const paidAds = rows.find((r) => r.source_id === "paid_ads")!;
    assert.equal(paidAds.cac_usd, 100);
    assert.equal(paidAds.cac_confidence, "measured");
  });

  it("does not compute CAC without attributed paid customers", () => {
    const profile = buildRevenueProfile({ founderFit: founderFit(), now: NOW });
    const rows = rollupRevenueAttribution(profile, [
      {
        bucket_id: "paid_ads",
        allocated_usd: 500,
        actual_spend_usd: 500,
        cpa_confidence: "insufficient_data",
        burn_pct: 100,
      },
    ]);
    assert.equal(rows.find((r) => r.source_id === "paid_ads")?.cac_confidence, "insufficient_data");
  });

  it("computeLtvCacRatio requires measured LTV and CAC", () => {
    const profile = buildRevenueProfile({
      founderFit: founderFit(),
      intake: { ltvUsd: 300 },
      now: NOW,
    });
    const noCac = computeLtvCacRatio(profile, []);
    assert.equal(noCac.confidence, "insufficient_data");
    const withCac = computeLtvCacRatio(profile, [
      {
        source_id: "paid_ads",
        source_label: "paid",
        channel_kind: "paid_ads",
        spend_usd: 100,
        spend_confidence: "measured",
        paid_customers: 2,
        attribution_confidence: "measured",
        cac_usd: 50,
        cac_confidence: "measured",
      },
    ]);
    assert.equal(withCac.ratio, 6);
    assert.equal(withCac.confidence, "measured");
  });

  it("detects funnel leak at checkout when paid missing", () => {
    const profile = buildRevenueProfile({
      founderFit: founderFit(),
      intake: { pricingViews: 200, checkoutStarts: 40 },
      now: NOW,
    });
    const funnel = rollupRevenueFunnel(profile);
    assert.equal(funnel.leak_stage_id, "checkout_start");
  });

  it("buildRevenueCloseout headline includes progress", () => {
    const profile = buildRevenueProfile({
      founderFit: founderFit(),
      intake: { paidCustomers: 8 },
      now: NOW,
    });
    const closeout = buildRevenueCloseout(profile);
    assert.match(closeout.headline, /8\/30/);
  });

  it("buildRevenueReplanPreview suggests pricing page hint", () => {
    const profile = buildRevenueProfile({ founderFit: founderFit(), now: NOW });
    const closeout = buildRevenueCloseout(profile);
    const preview = buildRevenueReplanPreview({
      profile,
      closeout,
      gaps: ["revenue.pricing_page_missing"],
    });
    assert.ok(preview.hints.some((h) => h.kind === "pricing_page"));
  });

  it("harvestRevenueFromCycle isolates message_ids", () => {
    const profile = buildRevenueProfile({
      founderFit: founderFit(),
      intake: { pricingViews: 100, checkoutStarts: 5 },
      now: NOW,
    });
    const closeout = buildRevenueCloseout(profile);
    const ex = harvestRevenueFromCycle(closeout, 1, "landing_conversion", NOW);
    assert.ok(ex.length > 0);
    assert.ok(ex.every((e) => e.message_ids.length === 0));
    assert.ok(ex.every((e) => e.source === "revenue_signal"));
  });

  it("validates core billing proof requires issue URL", () => {
    const errors = validateMonetizationTaskProof(
      {
        id: "x",
        priority: "P0",
        title: "Billing",
        problem: "p",
        acceptance_criteria: [],
        growth_impact: "g",
        fix_scope: "core_billing",
        status: "pending",
        sort_order: 0,
      },
      {},
    );
    assert.ok(errors.some((e) => /issue URL/i.test(e)));
  });

  it("completes monetization task with valid proof", () => {
    const profile = buildRevenueProfile({ founderFit: founderFit(), now: NOW });
    const ws = createMonetizationWorkspaceFromBinding({
      thesis: { id: "landing_conversion" },
      binding: revenueBinding(),
      revenueProfile: profile,
      gaps: ["revenue.billing_integration_missing"],
      now: NOW,
    })!;
    const taskId = ws.tasks.find((t) => t.fix_scope === "core_billing")!.id;
    const result = completeMonetizationTask(ws, taskId, {
      issue_url: "https://github.com/org/repo/issues/1",
    }, NOW);
    assert.equal(result.error, undefined);
    assert.equal(result.workspace.tasks.find((t) => t.id === taskId)?.status, "shipped");
  });

  it("auto-completes linked monetization task on Lane A apply", () => {
    const profile = buildRevenueProfile({ founderFit: founderFit(), now: NOW });
    let ws = createMonetizationWorkspaceFromBinding({
      thesis: { id: "landing_conversion" },
      binding: revenueBinding(),
      revenueProfile: profile,
      gaps: ["revenue.pricing_page_missing"],
      now: NOW,
    })!;
    const linked = linkSiteLevelMonetizationToLaneA(ws, null, thesisStub());
    ws = linked.workspace;
    const laneId = ws.tasks[0]!.linked_lane_a_item_id!;
    const done = completeLinkedMonetizationTaskOnApply(ws, laneId, NOW);
    assert.equal(done.tasks[0]?.status, "shipped");
  });

  it("hydrates revenue profile from json", () => {
    const profile = buildRevenueProfile({
      founderFit: founderFit(),
      scan: { routes: ["/pricing"], hasPricing: true },
      now: NOW,
    });
    const hydrated = hydrateRevenueProfileFromJson(JSON.parse(JSON.stringify(profile)));
    assert.equal(hydrated?.id, profile.id);
    assert.equal(hydrated?.pricing_thesis.model, profile.pricing_thesis.model);
  });

  it("hydrates monetization workspace from json", () => {
    const profile = buildRevenueProfile({ founderFit: founderFit(), now: NOW });
    const ws = createMonetizationWorkspaceFromBinding({
      thesis: { id: "landing_conversion" },
      binding: revenueBinding(),
      revenueProfile: profile,
      gaps: ["revenue.pricing_page_missing"],
      now: NOW,
    })!;
    const hydrated = hydrateMonetizationWorkspaceFromJson(JSON.parse(JSON.stringify({ ...ws, id: ws.id })));
    assert.equal(hydrated?.id, ws.id);
    assert.equal(hydrated?.tasks.length, ws.tasks.length);
  });

  it("revenue binding does not imply marketing_paused field", () => {
    const profile = buildRevenueProfile({ founderFit: founderFit(), now: NOW });
    const ws = createMonetizationWorkspaceFromBinding({
      thesis: { id: "landing_conversion" },
      binding: revenueBinding(),
      revenueProfile: profile,
      gaps: ["revenue.pricing_page_missing"],
      now: NOW,
    })!;
    assert.ok(!("marketing_paused" in ws));
  });

  it("logRevenueAttribution updates existing row", () => {
    let profile = buildRevenueProfile({ founderFit: founderFit(), now: NOW });
    profile = logRevenueAttribution(profile, {
      source_id: "organic",
      source_label: "Organic",
      channel_kind: "organic",
      spend_confidence: "missing",
      paid_customers: 3,
      attribution_confidence: "measured",
    });
    profile = logRevenueAttribution(profile, {
      source_id: "organic",
      source_label: "Organic",
      channel_kind: "organic",
      spend_confidence: "missing",
      paid_customers: 5,
      attribution_confidence: "measured",
    });
    assert.equal(profile.attributions.find((r) => r.source_id === "organic")?.paid_customers, 5);
  });
});
