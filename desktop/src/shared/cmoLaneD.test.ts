import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProductActivationProfile,
  buildProductIssueMarkdown,
  canResumeMarketing,
  completeLinkedProductRequestOnApply,
  completeProductRequest,
  createLaneDWorkspaceFromBinding,
  createProductLoopOpsCadence,
  detectProductBinding,
  getNextProductRequest,
  hydrateLaneDWorkspaceFromJson,
  isMarketingPaused,
  laneDProgress,
  linkSiteLevelToLaneA,
  resumeMarketing,
  skipProductRequest,
  validateProductRequestProof,
  type LaneDWorkspace,
  type ProductActivationProfile,
  type ProductBinding,
} from "./cmoLaneD";
import type { LaneAWorkspace } from "./cmoLaneA";
import type { ManualKpi } from "./types";

const NOW = "2026-07-15T00:00:00.000Z";

function activation(overrides: Partial<ProductActivationProfile> = {}): ProductActivationProfile {
  return buildProductActivationProfile({
    founderFit: { magic_moment: "creates the first useful project" },
    existing: {
      signup_count: 100,
      activated_count: 15,
      activation_rate_target_pct: 40,
      onboarding_path_exists: false,
      ...overrides,
    },
    now: NOW,
  });
}

function binding(overrides: Partial<ProductBinding> = {}): ProductBinding {
  return {
    active: true,
    stage_id: "activation",
    headline: "Activation is binding",
    rationale: ["Users do not reach value."],
    evidence: ["15% activation"],
    confidence: "measured",
    trigger: "activation_below_target",
    ...overrides,
  };
}

function workspace(): LaneDWorkspace {
  return createLaneDWorkspaceFromBinding({
    thesis: { id: "landing_conversion" },
    binding: binding(),
    activation: activation(),
    gaps: ["product.activation_event_missing", "product.onboarding_missing"],
    hasAnalytics: false,
    now: NOW,
  })!;
}

describe("P15 Product Loop", () => {
  it("uses magic moment as activation event", () => {
    assert.equal(
      buildProductActivationProfile({
        founderFit: { magic_moment: "gets a useful answer" },
        now: NOW,
      }).activation_event_label,
      "gets a useful answer",
    );
  });

  it("calculates activation rate deterministically", () => {
    assert.equal(activation().activation_rate_pct, 15);
  });

  it("does not calculate a rate without signups", () => {
    const result = buildProductActivationProfile({
      existing: { activated_count: 2 },
      now: NOW,
    });
    assert.equal(result.activation_rate_pct, undefined);
  });

  it("labels entered counts measured", () => {
    assert.equal(activation().metric_confidence.signup_count, "measured");
  });

  it("labels default 40% target assumption", () => {
    const result = buildProductActivationProfile({ now: NOW });
    assert.equal(result.activation_rate_target_pct, 40);
    assert.equal(result.metric_confidence.activation_rate_target_pct, "assumption");
  });

  it("reads activation KPIs", () => {
    const kpis: ManualKpi[] = [
      {
        id: "activation_rate_pct",
        name: "Activation",
        value: 31,
        target: 45,
        source: "manual",
        updated_at: NOW,
      },
    ];
    const result = buildProductActivationProfile({ manualKpis: kpis, now: NOW });
    assert.equal(result.activation_rate_pct, 31);
    assert.equal(result.activation_rate_target_pct, 45);
  });

  it("infers onboarding route without inventing metrics", () => {
    const result = buildProductActivationProfile({
      scan: { routes: ["src/app/onboarding/page.tsx"] },
      now: NOW,
    });
    assert.equal(result.onboarding_path_exists, true);
    assert.equal(result.activation_rate_pct, undefined);
  });

  it("binds when scale readiness is not yet", () => {
    const result = detectProductBinding({
      founderFit: { scale_readiness: "not_yet", magic_moment: "sees value" },
    });
    assert.equal(result.trigger, "scale_not_ready");
  });

  it("binds from activation growth stage", () => {
    const result = detectProductBinding({
      growthBinding: { stage_id: "activation", headline: "Activation", evidence: ["users"] },
    });
    assert.equal(result.trigger, "growth_plane_activation");
  });

  it("binds below measured target", () => {
    assert.equal(detectProductBinding({ activation: activation() }).trigger, "activation_below_target");
  });

  it("uses conservative floor only after ten signups", () => {
    const result = detectProductBinding({
      activation: activation({ signup_count: 10, activated_count: 1, activation_rate_target_pct: undefined }),
    });
    assert.equal(result.active, true);
  });

  it("does not apply floor below ten signups", () => {
    const profile = {
      ...activation(),
      signup_count: 9,
      activated_count: 1,
      activation_rate_pct: 11.1,
      activation_rate_target_pct: undefined,
    };
    const result = detectProductBinding({
      activation: profile,
    });
    assert.equal(result.active, false);
  });

  it("binds missing onboarding only with magic moment", () => {
    const result = detectProductBinding({
      gaps: ["product.onboarding_missing"],
      founderFit: { scale_readiness: "yes", magic_moment: "gets value" },
    });
    assert.equal(result.trigger, "onboarding_missing");
  });

  it("returns inactive without product evidence", () => {
    assert.equal(detectProductBinding({}).active, false);
  });

  it("does not create Lane D for inactive binding", () => {
    assert.equal(
      createLaneDWorkspaceFromBinding({
        thesis: { id: "seo_content" },
        binding: detectProductBinding({}),
        activation: activation(),
      }),
      null,
    );
  });

  it("creates at most three P0 requests", () => {
    const result = workspace();
    assert.ok(result.requests.length <= 3);
    assert.ok(result.requests.every((item) => item.priority === "P0"));
  });

  it("marks every request marketing paused", () => {
    assert.ok(workspace().requests.every((item) => item.marketing_status === "paused"));
  });

  it("creates site instrumentation request", () => {
    assert.equal(workspace().requests[0]?.fix_scope, "site_level");
  });

  it("creates core activation request", () => {
    assert.ok(workspace().requests.some((item) => item.fix_scope === "core_product"));
  });

  it("creates deterministic product ops cadence", () => {
    const result = createProductLoopOpsCadence({
      thesis: { id: "landing_conversion" },
      activation: activation(),
      now: NOW,
    });
    assert.equal(result.tasks.length, 3);
    assert.equal(result.tasks[0]?.owner, "system");
    assert.equal(result.tasks[2]?.owner, "user");
  });

  it("links site requests to Lane A", () => {
    const laneA: LaneAWorkspace = {
      id: "a",
      thesis_id: "landing_conversion",
      started_at: NOW,
      items: [],
    };
    const result = linkSiteLevelToLaneA(laneA, workspace());
    assert.ok(result.laneA.items.length >= 1);
    assert.ok(result.laneD.requests.some((item) => item.linked_lane_a_item_id));
  });

  it("does not duplicate linked Lane A items", () => {
    const laneA: LaneAWorkspace = {
      id: "a",
      thesis_id: "landing_conversion",
      started_at: NOW,
      items: [],
    };
    const once = linkSiteLevelToLaneA(laneA, workspace());
    const twice = linkSiteLevelToLaneA(once.laneA, once.laneD);
    assert.equal(twice.laneA.items.length, once.laneA.items.length);
  });

  it("requires issue or PR URL for core work", () => {
    const core = workspace().requests.find((item) => item.fix_scope === "core_product")!;
    assert.equal(validateProductRequestProof(core, { note: "done but no external proof" }).ok, false);
  });

  it("rejects malformed proof URLs", () => {
    const request = workspace().requests[0]!;
    assert.equal(validateProductRequestProof(request, { pr_url: "not-url" }).ok, false);
  });

  it("completes a core request with issue proof", () => {
    const initial = workspace();
    const core = initial.requests.find((item) => item.fix_scope === "core_product")!;
    const result = completeProductRequest(initial, core.id, {
      issue_url: "https://github.com/acme/app/issues/1",
      note: "Acceptance criteria added to the issue.",
    });
    assert.equal(result.error, undefined);
    assert.equal(result.workspace.requests.find((item) => item.id === core.id)?.status, "shipped");
  });

  it("completes linked site request on apply", () => {
    const laneA: LaneAWorkspace = {
      id: "a",
      thesis_id: "landing_conversion",
      started_at: NOW,
      items: [],
    };
    const linked = linkSiteLevelToLaneA(laneA, workspace());
    const request = linked.laneD.requests.find((item) => item.linked_lane_a_item_id)!;
    const result = completeLinkedProductRequestOnApply(
      linked.laneD,
      request.linked_lane_a_item_id!,
      { note: "Site-level onboarding shipped through Lane A." },
    );
    assert.equal(result.requests.find((item) => item.id === request.id)?.status, "shipped");
  });

  it("tracks progress including explicit skips", () => {
    const initial = workspace();
    const next = skipProductRequest(initial, initial.requests[0]!.id, "Not applicable");
    assert.equal(laneDProgress(next).done, 1);
  });

  it("returns the next pending request", () => {
    assert.equal(getNextProductRequest(workspace())?.sort_order, 0);
  });

  it("keeps marketing paused while requests remain", () => {
    assert.equal(isMarketingPaused(workspace()), true);
    assert.equal(canResumeMarketing(workspace()), false);
  });

  it("resumes only after all requests are terminal", () => {
    let result = workspace();
    for (const item of result.requests) result = skipProductRequest(result, item.id, "Founder decision");
    assert.equal(canResumeMarketing(result), true);
    assert.equal(resumeMarketing(result, NOW).marketing_paused, false);
  });

  it("exports issue markdown with required sections", () => {
    const markdown = buildProductIssueMarkdown(workspace().requests[0]!);
    assert.match(markdown, /P0 PRODUCT REQUEST/);
    assert.match(markdown, /Acceptance criteria/);
    assert.match(markdown, /Marketing status/);
  });

  it("hydrates a valid workspace", () => {
    const initial = workspace();
    assert.equal(hydrateLaneDWorkspaceFromJson(JSON.parse(JSON.stringify(initial)))?.id, initial.id);
  });

  it("rejects invalid hydration", () => {
    assert.equal(hydrateLaneDWorkspaceFromJson({ id: "broken" }), null);
  });
});
