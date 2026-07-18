import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import {
  attachTodayMove,
  buildGrowthControlPlane,
  buildProductRedList,
  buildRedList,
  buildRevenueRedList,
  checkThesisAlignment,
  hydrateGrowthControlPlaneFromJson,
} from "./cmoGrowthPlane";
import type { MarketingProfile, ProjectProfile } from "./types";

function emptyMarketingProfile(): MarketingProfile {
  return {
    product_name: "",
    product_description: "",
    category: "",
    business_model: "",
    target_audience: [],
    primary_problem: "",
    main_value_proposition: "",
    differentiators: [],
    competitors: [],
    company_stage: "",
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
    manual_kpis: [],
    last_updated: new Date().toISOString(),
    confidence_score: 0,
    gaps: [],
  };
}

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
    ...overrides,
  };
}

function profile(overrides: Partial<MarketingProfile> = {}): MarketingProfile {
  return { ...emptyMarketingProfile(), ...overrides };
}

describe("cmoGrowthPlane", () => {
  it("blocks acquisition scale while product binding is active", () => {
    const list = buildProductRedList({
      active: true,
      stage_id: "activation",
      headline: "Activation",
      rationale: [],
      evidence: ["15% activation"],
      confidence: "measured",
    });
    assert.equal(list.length, 3);
    assert.ok(list.some((item) => item.id === "red.product.paid_scale"));
  });
  it("prelaunch consumer → binding awareness, red list includes SEO primary", () => {
    const project = baseProject({
      readmeSummary: "Consumer viral mobile app for creators on TikTok",
    });
    const thesis = buildCmoIntake({
      project,
      persona: "marketing",
      profile: profile({
        business_model: "consumer",
        company_stage: "prelaunch",
      }),
      context: { force_thesis_id: "viral_short_form" },
    });
    const plane = buildGrowthControlPlane({
      project,
      persona: "marketing",
      profile: profile({ business_model: "consumer", company_stage: "prelaunch" }),
      thesis,
    });
    assert.equal(plane.binding.gtm, "awareness");
    assert.match(plane.binding.headline, /Attention/i);
    assert.ok(plane.red_list.some((r) => /SEO/i.test(r.tactic)));
  });

  it("GA4 1200 sessions + 8 signups → binding conversion", () => {
    const project = baseProject({ hasAnalytics: true });
    const prof = profile({
      company_stage: "launched",
      connector_snapshots: {
        ga4: {
          fetched_at: new Date().toISOString(),
          metrics: [
            { name: "sessions", value: 1200 },
            { name: "conversions", value: 8 },
          ],
        },
      },
    });
    const thesis = buildCmoIntake({ project, persona: "marketing", profile: prof });
    const plane = buildGrowthControlPlane({
      project,
      persona: "marketing",
      profile: prof,
      thesis,
    });
    assert.equal(plane.binding.gtm, "conversion");
    assert.match(plane.binding.headline, /Conversion/i);
    assert.doesNotMatch(plane.binding.headline, /Distribution/i);
  });

  it("no analytics + launched → binding measurement, red list rejects paid ads", () => {
    const project = baseProject({ hasAnalytics: false });
    const prof = profile({ company_stage: "launched" });
    const thesis = buildCmoIntake({ project, persona: "marketing", profile: prof });
    const plane = buildGrowthControlPlane({
      project,
      persona: "marketing",
      profile: prof,
      thesis,
    });
    assert.equal(plane.binding.gtm, "measurement");
    assert.ok(plane.red_list.some((r) => /Paid ads/i.test(r.tactic)));
  });

  it("blocks paid ads scale when checkout is missing and paid spend is active", () => {
    const prof = profile({
      gaps: ["revenue.checkout_missing"],
      manual_kpis: [{ id: "paid_spend", name: "Paid spend", value: 120, updated_at: "2026-07-01T00:00:00.000Z", source: "manual" }],
    });
    const list = buildRevenueRedList(prof);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, "red.revenue.paid_scale");
  });

  it("sales + empty pipeline → binding revenue", () => {
    const project = baseProject();
    const prof = profile({ sales_pipeline_empty: true });
    const thesis = buildCmoIntake({ project, persona: "sales", profile: prof });
    const plane = buildGrowthControlPlane({
      project,
      persona: "sales",
      profile: prof,
      thesis,
    });
    assert.equal(plane.binding.gtm, "revenue");
    assert.match(plane.binding.headline, /Revenue/i);
  });

  it("launch in 14 days → binding distribution", () => {
    const project = baseProject();
    const prof = profile({ days_until_launch: 14, company_stage: "prelaunch" });
    const thesis = buildCmoIntake({ project, persona: "marketing", profile: prof });
    const plane = buildGrowthControlPlane({
      project,
      persona: "marketing",
      profile: prof,
      thesis,
    });
    assert.equal(plane.binding.gtm, "distribution");
    assert.match(plane.binding.headline, /Distribution/i);
  });

  it("thesis seo_content + binding awareness → thesis_aligned false", () => {
    const project = baseProject({
      readmeSummary: "Consumer viral app",
    });
    const prof = profile({ business_model: "consumer", company_stage: "prelaunch" });
    const thesis = buildCmoIntake({
      project,
      persona: "marketing",
      profile: prof,
      context: { force_thesis_id: "seo_content" },
    });
    const plane = buildGrowthControlPlane({
      project,
      persona: "marketing",
      profile: prof,
      thesis,
    });
    assert.equal(plane.binding.gtm, "awareness");
    assert.equal(plane.thesis_aligned, false);
    assert.ok(plane.alignment_note);
  });

  it("ops cadence with user task → today populated from getNowTask", () => {
    const project = baseProject();
    const thesis = buildCmoIntake({
      project,
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const plane = buildGrowthControlPlane({
      project,
      persona: "marketing",
      thesis,
      opsCadence: cadence,
    });
    assert.ok(plane.today);
    assert.ok(plane.today!.what.length > 0);
    assert.equal(
      plane.today!.why,
      cadence.tasks.find((task) => task.id === plane.today!.ops_task_id)!.why,
    );
    assert.ok(plane.today!.done_when.length > 0);
    assert.ok(plane.today!.ops_task_id);
  });

  it("missing all metrics → stages confidence missing, qualitative binding", () => {
    const project = baseProject({ hasAnalytics: false });
    const prof = profile({ company_stage: "idea" });
    const thesis = buildCmoIntake({ project, persona: "marketing", profile: prof });
    const plane = buildGrowthControlPlane({
      project,
      persona: "marketing",
      profile: prof,
      thesis,
    });
    const missing = plane.equation.stages.filter((s) => s.confidence === "missing");
    assert.ok(missing.length >= 1);
    assert.ok(plane.binding.headline.length > 0);
    assert.ok(plane.binding.evidence.length >= 0);
  });

  it("buildRedList merges thesis deprioritize", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "viral_short_form" },
    });
    const binding = {
      stage_id: "attention" as const,
      gtm: "awareness" as const,
      headline: "Attention",
      rationale: [],
      evidence: ["test"],
    };
    const list = buildRedList(binding, thesis);
    assert.ok(list.length >= 3);
  });

  it("checkThesisAlignment compatible distribution/awareness", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { force_thesis_id: "product_hunt_launch" },
    });
    const binding = {
      stage_id: "attention" as const,
      gtm: "distribution" as const,
      headline: "Distribution",
      rationale: [],
      evidence: [],
    };
    const r = checkThesisAlignment(thesis, binding);
    assert.equal(typeof r.aligned, "boolean");
  });

  it("attachTodayMove no-ops without cadence", () => {
    const plane = buildGrowthControlPlane({
      project: baseProject(),
      persona: "marketing",
    });
    const next = attachTodayMove(plane, null);
    assert.equal(next.today, undefined);
  });

  it("hydrates a legacy today move with deterministic why fallback", () => {
    const current = buildGrowthControlPlane({
      project: baseProject(),
      persona: "marketing",
    });
    const hydrated = hydrateGrowthControlPlaneFromJson({
      ...current,
      today: {
        what: "Legacy move",
        done_when: "Proof logged",
        owner: "user",
      },
    });
    assert.equal(hydrated?.today?.why, current.binding.rationale[0]);
  });

  it("includes mechanism label and anti-pattern red list when profile set", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
    });
    const plane = buildGrowthControlPlane({
      project: baseProject(),
      persona: "marketing",
      thesis: {
        ...thesis,
        signals: { ...thesis.signals, primary_mechanism_id: "proprietary_data" },
      },
      profile: {
        ...emptyMarketingProfile(),
        growth_mechanism_profile: {
          primary_mechanism_id: "proprietary_data",
          configured_at: "2026-07-16T00:00:00.000Z",
          assessment: {
            ranked: [{ engine_id: "proprietary_data", score: 80, blockers: [], evidence: [], confidence: "assumption" }],
            primary: "proprietary_data",
            computed_at: "2026-07-16T00:00:00.000Z",
          },
        },
      },
    });
    assert.equal(plane.mechanism_label, "Proprietary Data Authority");
    assert.ok(plane.mechanism_anti_pattern?.length);
    assert.ok(plane.red_list.some((item) => item.id.includes("mechanism") || item.id.includes("mascot")));
  });

  it("does not throw when growth_mechanism_profile lacks assessment", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
    });
    assert.doesNotThrow(() =>
      buildGrowthControlPlane({
        project: baseProject(),
        persona: "marketing",
        thesis,
        profile: {
          ...emptyMarketingProfile(),
          growth_mechanism_profile: {
            primary_mechanism_id: "proprietary_data",
            configured_at: "2026-07-16T00:00:00.000Z",
            assessment: undefined as unknown as import("./cmoGrowthEngine").GrowthMechanismAssessment,
          },
        },
      }),
    );
  });
});
