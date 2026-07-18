import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import { buildGrowthControlPlane } from "./cmoGrowthPlane";
import {
  completeDistributionSlot,
  createDistributionOperatorFromThesis,
  evaluateHookPerformance,
  getNextDistributionSlot,
  isDistributionOperatorGate,
  resolveDailyVolumeTarget,
  rollupOperatorKpis,
  syncLaneBFromOperator,
  validateDistributionProof,
} from "./cmoDistributionOperator";
import type { ProjectProfile } from "./types";

function baseProject(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "Consumer viral app for creators",
    ...overrides,
  };
}

describe("cmoDistributionOperator", () => {
  it("viral_short_form Week 1 → 7 daily targets, min 3 posts D1, 3 hooks A/B/C", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const ws = createDistributionOperatorFromThesis(thesis)!;
    assert.equal(ws.mode, "short_form_volume");
    assert.equal(ws.hooks.length, 3);
    assert.equal(ws.daily_targets.length, 7);
    assert.equal(ws.daily_targets[0]!.min_posts, 3);
    assert.ok(ws.slots.some((s) => s.hook_id === "hook.a" && s.slot_kind === "post"));
  });

  it("founder_social → 14-day grid, linkedin default", () => {
    const thesis = buildCmoIntake({
      project: baseProject({ readmeSummary: "B2B SaaS devtools for teams" }),
      persona: "marketing",
      profile: {
        product_name: "",
        product_description: "",
        category: "",
        business_model: "saas",
        target_audience: [],
        primary_problem: "",
        main_value_proposition: "",
        differentiators: [],
        competitors: [],
        company_stage: "prelaunch",
        main_markets: [],
        available_channels: [],
        marketing_goals: [],
        brand_voice: "",
        existing_proof: [],
        available_assets: [],
        constraints: [],
        previous_experiments: [],
        successful_experiments: [],
        failed_experiments: [],
        last_updated: "",
        confidence_score: 0,
        gaps: [],
      },
      context: { force_thesis_id: "founder_social" },
    });
    const ws = createDistributionOperatorFromThesis(thesis)!;
    assert.equal(ws.mode, "founder_grid");
    assert.equal(ws.daily_targets.length, 14);
    assert.ok(ws.slots.some((s) => s.platform === "linkedin" && s.slot_kind === "post"));
  });

  it("retention scale rule → 2 slots ≥ target → scale", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    let ws = createDistributionOperatorFromThesis(thesis)!;
    const hookAPosts = ws.slots.filter((s) => s.hook_id === "hook.a" && s.slot_kind === "post");
    for (let i = 0; i < 2; i++) {
      const r = completeDistributionSlot(ws, hookAPosts[i]!.id, {
        post_url: "https://tiktok.com/v/1",
        retention_3s_pct: 68,
        views_24h: 500,
      });
      ws = r.workspace;
    }
    const verdict = evaluateHookPerformance(ws);
    assert.equal(verdict.kind, "scale");
    assert.equal(verdict.hook_id, "hook.a");
  });

  it("kill rule → 3 posts <45% retention → kill", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    let ws = createDistributionOperatorFromThesis(thesis)!;
    const hookBPosts = ws.slots.filter((s) => s.hook_id === "hook.b" && s.slot_kind === "post");
    for (let i = 0; i < 3; i++) {
      const r = completeDistributionSlot(ws, hookBPosts[i]!.id, {
        post_url: `https://tiktok.com/v/${i}`,
        retention_3s_pct: 30,
        views_24h: 100,
      });
      ws = r.workspace;
    }
    const verdict = evaluateHookPerformance(ws);
    assert.equal(verdict.kind, "kill");
    assert.equal(verdict.hook_id, "hook.b");
  });

  it("double down → scale + KPI ≥50% target", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    let ws = createDistributionOperatorFromThesis(thesis)!;
    const hookAPosts = ws.slots.filter((s) => s.hook_id === "hook.a" && s.slot_kind === "post");
    for (let i = 0; i < 2; i++) {
      ws = completeDistributionSlot(ws, hookAPosts[i]!.id, {
        post_url: "https://tiktok.com/v/1",
        retention_3s_pct: 70,
        views_24h: 600,
      }).workspace;
    }
    const verdict = evaluateHookPerformance(ws, { pctOfTarget: 55 });
    assert.equal(verdict.kind, "double_down");
  });

  it("proof validation → missing retention on measure → error", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const ws = createDistributionOperatorFromThesis(thesis)!;
    const measure = ws.slots.find((s) => s.slot_kind === "measure")!;
    const v = validateDistributionProof(measure, { post_url: "https://x.com" }, "short_form_volume");
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => /retention/i.test(e)));
  });

  it("rollupOperatorKpis → views sum → short_form_views", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    let ws = createDistributionOperatorFromThesis(thesis)!;
    const post = ws.slots.find((s) => s.slot_kind === "post")!;
    ws = completeDistributionSlot(ws, post.id, {
      post_url: "https://tiktok.com/v/1",
      retention_3s_pct: 66,
      views_24h: 400,
    }).workspace;
    const kpis = rollupOperatorKpis(ws);
    const views = kpis.find((k) => k.id === "short_form_views");
    assert.equal(views?.value, 400);
  });

  it("getNextDistributionSlot → first pending post", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const ws = createDistributionOperatorFromThesis(thesis)!;
    const next = getNextDistributionSlot(ws);
    assert.ok(next);
    assert.equal(next!.slot_kind, "post");
    assert.equal(next!.status, "pending");
  });

  it("syncLaneBFromOperator → lane B items from slots", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const ws = createDistributionOperatorFromThesis(thesis)!;
    const laneB = createLaneBWorkspaceFromThesis(thesis);
    const synced = syncLaneBFromOperator(ws, laneB);
    assert.ok(synced.laneB.items.length >= 3);
    assert.ok(synced.workspace.slots.some((s) => s.linked_lane_b_id));
  });

  it("gate off when binding is conversion", () => {
    const project = baseProject({ hasAnalytics: true });
    const profile = {
      product_name: "",
      product_description: "",
      category: "",
      business_model: "saas" as const,
      target_audience: [],
      primary_problem: "",
      main_value_proposition: "",
      differentiators: [],
      competitors: [],
      company_stage: "launched" as const,
      main_markets: [],
      available_channels: [],
      marketing_goals: [],
      brand_voice: "",
      existing_proof: [],
      available_assets: [],
      constraints: [],
      previous_experiments: [],
      successful_experiments: [],
      failed_experiments: [],
      connector_snapshots: {
        ga4: {
          fetched_at: new Date().toISOString(),
          metrics: [
            { name: "sessions", value: 1200 },
            { name: "conversions", value: 8 },
          ],
        },
      },
      last_updated: "",
      confidence_score: 0,
      gaps: [],
    };
    const thesis = buildCmoIntake({
      project,
      persona: "marketing",
      profile,
      context: { force_thesis_id: "viral_short_form" },
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const plane = buildGrowthControlPlane({
      project,
      persona: "marketing",
      profile,
      thesis,
      opsCadence: cadence,
    });
    assert.equal(plane.binding.gtm, "conversion");
    assert.equal(
      isDistributionOperatorGate({ thesis, opsCadence: cadence, growthPlane: plane }),
      false,
    );
  });

  it("gate on when binding is awareness", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const plane = buildGrowthControlPlane({
      project: baseProject(),
      persona: "marketing",
      thesis,
      opsCadence: cadence,
    });
    assert.ok(
      isDistributionOperatorGate({ thesis, opsCadence: cadence, growthPlane: plane }),
    );
  });

  it("resolveDailyVolumeTarget tracks done posts", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    let ws = createDistributionOperatorFromThesis(thesis)!;
    const day1 = ws.slots.filter((s) => s.day_index === 1 && s.slot_kind === "post");
    ws = completeDistributionSlot(ws, day1[0]!.id, {
      post_url: "https://tiktok.com/v/1",
    }).workspace;
    const vol = resolveDailyVolumeTarget(ws, 1);
    assert.equal(vol.done, 1);
    assert.equal(vol.remaining, 2);
  });
});
