import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCommandSurfaceModel,
  isCommandSurfaceActive,
  isCommandSurfaceOwnedAction,
  resolveCommandSurfaceGovernance,
  resolveTodayWhy,
} from "./cmoCommandSurface";
import type { LaneDWorkspace } from "./cmoLaneD";
import type { MonetizationWorkspace } from "./cmoRevenuePlane";
import type { DelegateOperatorWorkspace } from "./cmoDelegateOperator";
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import type { GrowthControlPlane } from "./cmoGrowthPlane";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";
import type { CmoOpsCadence } from "./cmoOpsCadence";

function cadence(overrides: Partial<CmoOpsCadence> = {}): CmoOpsCadence {
  return {
    id: "ops.1",
    thesis_id: "viral_short_form",
    started_at: "2026-07-01T00:00:00.000Z",
    week_index: 1,
    day_index: 1,
    tasks: [
      {
        id: "task.1",
        priority_index: 0,
        what: "Publish proof post",
        why: "This tests the binding distribution hypothesis.",
        owner: "user",
        done_when: "Live URL logged",
        status: "in_progress",
        day_slot: "now",
      },
    ],
    week_review: {
      week_index: 1,
      due_at: "2099-07-08T00:00:00.000Z",
      status: "pending",
    },
    last_focus_reset_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function plane(overrides: Partial<GrowthControlPlane> = {}): GrowthControlPlane {
  return {
    id: "gcp.1",
    computed_at: "2026-07-01T00:00:00.000Z",
    equation: { product_class: "consumer", formula: "attention → signup", stages: [] },
    binding: {
      stage_id: "attention",
      gtm: "distribution",
      headline: "Distribution volume is the binding constraint.",
      rationale: ["Reach is below the threshold needed to learn."],
      evidence: [],
    },
    red_list: [],
    thesis_id: "viral_short_form",
    thesis_aligned: true,
    primary_lever: "Test short-form hooks",
    today: {
      what: "Publish proof post",
      why: "This tests the binding distribution hypothesis.",
      done_when: "Live URL logged",
      owner: "user",
      ops_task_id: "task.1",
    },
    ...overrides,
  };
}

function distribution(): DistributionOperatorWorkspace {
  return {
    id: "dist.1",
    mode: "short_form_volume",
    thesis_id: "viral_short_form",
    week_index: 1,
    started_at: "2026-07-01T00:00:00.000Z",
    hooks: [
      {
        id: "hook.a",
        label: "Hook A",
        formula: "contrarian",
        script_hint: "Contrarian",
        retention_target_3s: 60,
      },
    ],
    slots: [
      {
        id: "slot.1",
        day_index: 1,
        hook_id: "hook.a",
        slot_kind: "post",
        platform: "tiktok",
        status: "pending",
      },
    ],
    daily_targets: [{ day_index: 1, min_posts: 1, max_posts: 3, done_posts: 0 }],
    primary_kpi_id: "short_form_views",
  };
}

function influencer(stage: "research" | "replied" = "research"): InfluencerOperatorWorkspace {
  return {
    id: "inf.1",
    mode: "micro_influencer_dm",
    thesis_id: "influencer_partnerships",
    week_index: 1,
    started_at: "2026-07-01T00:00:00.000Z",
    pitches: [
      {
        id: "pitch.b",
        label: "Pitch B",
        template_id: "warm_intro",
        script_scaffold: "Warm intro",
        reply_target: 1,
      },
    ],
    touches: [
      {
        id: "touch.1",
        day_index: 1,
        pitch_id: "pitch.b",
        pipeline_stage: stage,
        platform: "instagram",
        target_name: "Creator",
        target_handle: "@creator",
        sort_order: 0,
      },
    ],
    weekly_targets: [{ day_index: 1, min_dms: 1, max_dms: 5, done_dms: 0 }],
    primary_kpi_id: "influencer_replies",
  };
}

function delegate(): DelegateOperatorWorkspace {
  return {
    id: "del.1",
    thesis_id: "founder_social",
    week_index: 1,
    started_at: "2026-07-01T00:00:00.000Z",
    briefs: [
      {
        id: "brief.1",
        title: "Creator delivery",
        role: "creator",
        what: "Film posts",
        why: "Increase volume",
        deliverables: ["Three clips"],
        acceptance_criteria: ["Three clips delivered"],
        due_day: 1,
        status: "in_progress",
        sort_order: 0,
      },
    ],
    hire_blocks: [],
    daily_rubrics: [
      {
        id: "rubric.1",
        brief_id: "brief.1",
        day_index: 1,
        title: "First delivery",
        checklist: [{ id: "check.1", label: "Three clips", required: true }],
        status: "pending",
      },
    ],
    lane_links: [],
  };
}

describe("P12 command surface", () => {
  it("uses linked ops-task why before all fallbacks", () => {
    assert.equal(
      resolveTodayWhy({ plane: plane(), today: plane().today!, cadence: cadence() }),
      "This tests the binding distribution hypothesis.",
    );
  });

  it("uses distribution hook context when no linked task exists", () => {
    assert.match(
      resolveTodayWhy({
        plane: plane(),
        today: { ...plane().today!, ops_task_id: undefined },
        cadence: cadence({ tasks: [] }),
        distributionOperator: distribution(),
      }),
      /Hook A.*retention gate/,
    );
  });

  it("uses influencer pitch context for research", () => {
    assert.equal(
      resolveTodayWhy({
        plane: plane(),
        today: { ...plane().today!, ops_task_id: undefined },
        influencerOperator: influencer(),
      }),
      "Test Pitch B against the warm-reply target.",
    );
  });

  it("uses deal context for an influencer reply", () => {
    assert.match(
      resolveTodayWhy({
        plane: plane(),
        today: { ...plane().today!, ops_task_id: undefined },
        influencerOperator: influencer("replied"),
      }),
      /trackable deal terms/,
    );
  });

  it("uses delegate rubric context", () => {
    assert.match(
      resolveTodayWhy({
        plane: plane(),
        today: { ...plane().today!, ops_task_id: undefined },
        cadence: cadence(),
        delegateOperator: delegate(),
      }),
      /Day 1 delivery rubric/,
    );
  });

  it("falls back to binding rationale", () => {
    assert.equal(
      resolveTodayWhy({
        plane: plane(),
        today: { ...plane().today!, why: "", ops_task_id: undefined },
      }),
      "Reach is below the threshold needed to learn.",
    );
  });

  it("falls back to the primary lever when rationale is empty", () => {
    const p = plane({
      binding: { ...plane().binding, rationale: [] },
      primary_lever: "Use the winning hook",
    });
    assert.equal(
      resolveTodayWhy({ plane: p, today: { ...p.today!, why: "", ops_task_id: undefined } }),
      "Use the winning hook",
    );
  });

  it("is active only with cadence and today move", () => {
    assert.equal(isCommandSurfaceActive({ growthControlPlane: plane(), opsCadence: cadence() }), true);
    assert.equal(isCommandSurfaceActive({ growthControlPlane: plane({ today: undefined }), opsCadence: cadence() }), false);
    assert.equal(isCommandSurfaceActive({ growthControlPlane: plane() }), false);
  });

  it("owns ops and governance action IDs", () => {
    for (const id of ["ops-user-1", "ops-system-1", "ops-week-review", "ops-pivot", "cmo-start-next-cycle"]) {
      assert.equal(isCommandSurfaceOwnedAction(id), true, id);
    }
  });

  it("owns Lane B and Lane C action IDs but not blocking apply actions", () => {
    assert.equal(isCommandSurfaceOwnedAction("lane-b-post.1"), true);
    assert.equal(isCommandSurfaceOwnedAction("lane-c-rubric-1"), true);
    assert.equal(isCommandSurfaceOwnedAction("apply-from-receipt"), false);
  });

  it("prioritizes replan governance over other states", () => {
    const c = cadence({
      week_review: { week_index: 1, due_at: "2020-01-01T00:00:00.000Z", status: "completed" },
    });
    const governance = resolveCommandSurfaceGovernance({
      cadence: c,
      continuous: {
        current_cycle_index: 1,
        phase: "pivot_ready",
        cycles: [
          {
            cycle_index: 1,
            thesis_id: "viral_short_form",
            thesis_title: "Viral",
            started_at: c.started_at,
            ops_cadence_id: c.id,
          },
        ],
        updated_at: c.started_at,
      },
    });
    assert.equal(governance?.kind, "replan");
  });

  it("returns week-review governance when due", () => {
    const governance = resolveCommandSurfaceGovernance({
      cadence: cadence({
        week_review: { week_index: 1, due_at: "2020-01-01T00:00:00.000Z", status: "due" },
      }),
      now: Date.parse("2026-07-01T00:00:00.000Z"),
    });
    assert.equal(governance?.kind, "week_review");
  });

  it("surfaces product-loop governance while marketing is paused", () => {
    const laneD: LaneDWorkspace = {
      id: "laned",
      thesis_id: "landing_conversion",
      started_at: "2026-07-08T00:00:00.000Z",
      product_binding: {
        active: true,
        stage_id: "activation",
        headline: "Activation is binding",
        rationale: [],
        evidence: [],
        confidence: "measured",
      },
      marketing_paused: true,
      paused_reason: "Activation is binding",
      requests: [],
    };
    const governance = resolveCommandSurfaceGovernance({
      cadence: cadence(),
      continuous: {
        current_cycle_index: 1,
        phase: "executing",
        cycles: [],
        marketing_paused: true,
        updated_at: "2026-07-08T00:00:00.000Z",
      },
      laneDWorkspace: laneD,
    });
    assert.equal(governance?.kind, "product_loop");
  });

  it("surfaces revenue-focus governance when monetization binding is active", () => {
    const monetization: MonetizationWorkspace = {
      id: "mon.1",
      thesis_id: "landing_conversion",
      started_at: "2026-07-08T00:00:00.000Z",
      revenue_binding: {
        active: true,
        stage_id: "revenue",
        headline: "Checkout missing",
        rationale: ["Paying-customer goal without checkout"],
        evidence: ["revenue.checkout_missing"],
        confidence: "missing",
        trigger: "paying_customers_goal_no_infra",
      },
      tasks: [
        {
          id: "mon.1",
          priority: "P0",
          title: "Instrument checkout_start event",
          problem: "Add analytics event",
          fix_scope: "site_level",
          status: "pending",
          sort_order: 0,
          acceptance_criteria: ["Event fires"],
          growth_impact: "Unlock funnel measurement",
        },
      ],
    };
    const governance = resolveCommandSurfaceGovernance({
      cadence: cadence(),
      monetizationWorkspace: monetization,
    });
    assert.equal(governance?.kind, "revenue_focus");
    assert.match(governance?.title ?? "", /Instrument checkout/i);
  });

  it("returns pivot governance after completed review", () => {
    const governance = resolveCommandSurfaceGovernance({
      cadence: cadence({
        week_review: { week_index: 1, due_at: "2020-01-01T00:00:00.000Z", status: "completed" },
        pivot_suggestion: {
          verdict: "flat",
          headline: "Pivot the channel",
          rationale: ["No movement"],
          suggested_thesis_ids: ["founder_social"],
          suggested_actions: ["Test founder social"],
          generated_at: "2026-07-08T00:00:00.000Z",
        },
      }),
    });
    assert.equal(governance?.kind, "pivot");
  });

  it("returns measuring governance without a ready replan", () => {
    const governance = resolveCommandSurfaceGovernance({
      cadence: cadence(),
      continuous: {
        current_cycle_index: 1,
        phase: "measuring",
        cycles: [],
        updated_at: "2026-07-08T00:00:00.000Z",
      },
    });
    assert.equal(governance?.kind, "measuring");
  });

  it("builds the four fields and backstage counts", () => {
    const model = buildCommandSurfaceModel({
      plane: plane(),
      cadence: cadence({
        tasks: [
          ...cadence().tasks,
          { ...cadence().tasks[0]!, id: "task.2", status: "done" },
        ],
      }),
      laneBWorkspace: {
        id: "lane-b.1",
        thesis_id: "viral_short_form",
        mode: "posting_calendar",
        started_at: "2026-07-01T00:00:00.000Z",
        items: [
          {
            id: "lane.1",
            title: "Post",
            mode: "posting_calendar",
            status: "pending",
            sort_order: 0,
          },
        ],
      },
    });
    assert.deepEqual(
      [model?.bottleneck, model?.today, model?.why, model?.doneWhen],
      [
        "Distribution volume is the binding constraint.",
        "Publish proof post",
        "This tests the binding distribution hypothesis.",
        "Live URL logged",
      ],
    );
    assert.equal(model?.pendingOps, 1);
    assert.equal(model?.pendingLaneB, 1);
  });

  it("includes an operator summary in the backstage model", () => {
    const model = buildCommandSurfaceModel({
      plane: plane(),
      cadence: cadence({ tasks: [] }),
      distributionOperator: distribution(),
    });
    assert.match(model?.operatorSummary ?? "", /posts/);
  });
});
