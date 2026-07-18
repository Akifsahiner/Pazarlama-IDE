import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake, type ChannelThesisId } from "./cmoIntake";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { createDistributionOperatorFromThesis } from "./cmoDistributionOperator";
import { createInfluencerOperatorFromThesis } from "./cmoInfluencerOperator";
import {
  applyMemoryReplan,
  appendExperimentLedger,
  buildReplanPreview,
  createInitialGrowthMemory,
  growthMemorySummary,
  harvestMemoryFromCycle,
  harvestBudgetFromCycle,
  harvestProductFixesFromCycle,
  hydrateGrowthMemoryFromJson,
  isGrowthMemoryGate,
  mutatePrioritiesFromMemory,
  recommendNextCycleMode,
  replanLaneBFromMemory,
  rollupGrowthMemoryKpis,
  type GrowthMemoryState,
  type GrowthMessageRecord,
} from "./cmoGrowthMemory";
import { buildBudgetAllocation } from "./cmoBudgetPlane";
import { buildRevenueCloseout, buildRevenueProfile, harvestRevenueFromCycle } from "./cmoRevenuePlane";
import type { LaneDWorkspace } from "./cmoLaneD";
import type { ProjectProfile } from "./types";

function project(): ProjectProfile {
  return {
    id: "p11",
    source: { kind: "folder", path: "/p11" },
    name: "Memory",
    framework: "Next.js",
    routes: ["app/page.tsx"],
    hasAnalytics: true,
    excludedPaths: [],
    scannedFileCount: 50,
    readmeSummary: "Consumer creator app with viral distribution",
  };
}

function thesis(id: ChannelThesisId = "viral_short_form") {
  return buildCmoIntake({
    project: project(),
    persona: "marketing",
    context: { force_thesis_id: id },
  });
}

function message(
  verdict: GrowthMessageRecord["verdict"],
  kind: GrowthMessageRecord["kind"] = "hook",
  sourceRef = "hook.a",
): GrowthMessageRecord {
  return {
    id: `m.${verdict}.${sourceRef}`,
    cycle_index: 1,
    thesis_id: kind === "pitch" ? "influencer_partnerships" : "viral_short_form",
    kind,
    label: `${verdict} ${kind}`,
    body: "A concrete tested message",
    source_ref: sourceRef,
    metric_name: "metric",
    metric_value: verdict === "winner" ? 70 : 20,
    metric_target: 60,
    verdict,
    evidence: ["2/2 tests met target"],
    recorded_at: "2026-07-14T00:00:00.000Z",
  };
}

function memoryWith(...messages: GrowthMessageRecord[]): GrowthMemoryState {
  return {
    ...createInitialGrowthMemory("p11", "2026-07-14T00:00:00.000Z"),
    messages,
    last_harvest_cycle_index: 1,
  };
}

describe("cmoGrowthMemory", () => {
  it("harvests shipped product fixes without message winners", () => {
    const laneD: LaneDWorkspace = {
      id: "laned.test",
      thesis_id: "landing_conversion",
      started_at: "2026-07-15T00:00:00.000Z",
      product_binding: {
        active: true,
        stage_id: "activation",
        headline: "Activation",
        rationale: [],
        evidence: [],
        confidence: "measured",
      },
      marketing_paused: true,
      paused_reason: "Activation",
      requests: [
        {
          id: "p0.activation",
          priority: "P0",
          title: "Fix activation",
          problem: "Users drop",
          acceptance_criteria: ["Ship fix"],
          growth_impact: "Unblock marketing",
          marketing_status: "paused",
          fix_scope: "core_product",
          status: "shipped",
          sort_order: 0,
          proof: {
            issue_url: "https://github.com/acme/app/issues/1",
            metric_name: "activation_rate_pct",
            metric_value: 35,
            completed_at: "2026-07-15T00:00:00.000Z",
          },
        },
      ],
    };
    const records = harvestProductFixesFromCycle(
      laneD,
      1,
      "landing_conversion",
      "2026-07-15T00:00:00.000Z",
    );
    assert.equal(records.length, 1);
    assert.equal(records[0]?.source, "product_fix");
    assert.deepEqual(records[0]?.message_ids, []);
  });
  it("harvests money as an experiment without creating message verdicts", () => {
    const experiments = harvestBudgetFromCycle(
      [{
        bucket_id: "influencer",
        allocated_usd: 500,
        actual_spend_usd: 120,
        outcomes: 6,
        cpa_usd: 20,
        cpa_confidence: "measured",
        burn_pct: 24,
      }],
      1,
      "influencer_partnerships",
      "2026-07-15T00:00:00.000Z",
    );
    assert.equal(experiments.length, 1);
    assert.deepEqual(experiments[0]?.message_ids, []);
    assert.equal(experiments[0]?.cpa_usd, 20);
  });

  it("harvests revenue signals without message verdicts", () => {
    const profile = buildRevenueProfile({
      founderFit: {
        brand_face_readiness: "sometimes",
        controversy_tolerance: "selective",
        monthly_budget_band: "500_2000",
        scale_readiness: "yes",
        magic_moment: "Gets value fast",
        weekly_marketing_hours: "3_7",
        thirty_day_win: "paying_customers",
        completed_at: "2026-07-15T00:00:00.000Z",
      },
      intake: { paidCustomers: 2 },
    });
    const closeout = buildRevenueCloseout(profile);
    const experiments = harvestRevenueFromCycle(
      closeout,
      1,
      "landing_conversion",
      "2026-07-15T00:00:00.000Z",
    );
    assert.ok(experiments.length >= 1);
    assert.equal(experiments[0]?.source, "revenue_signal");
    assert.deepEqual(experiments[0]?.message_ids, []);
  });

  it("merges deterministic budget mutations into the message replan preview", () => {
    const currentThesis = thesis("influencer_partnerships");
    const budgetPlan = buildBudgetAllocation(
      currentThesis,
      {
        brand_face_readiness: "sometimes",
        controversy_tolerance: "selective",
        monthly_budget_band: "500_2000",
        scale_readiness: "yes",
        magic_moment: "Sees useful value immediately",
        weekly_marketing_hours: "3_7",
        thirty_day_win: "qualified_signups",
        completed_at: "2026-07-15T00:00:00.000Z",
      },
      { monthlyAmountUsd: 1000, cpaCeilingUsd: 80 },
    );
    const preview = buildReplanPreview(memoryWith(message("winner")), {
      thesis: currentThesis,
      nextWeekIndex: 2,
      preferredMode: "double_down",
      budgetPlan,
      budgetCloseout: [{
        bucket_id: "influencer",
        allocated_usd: 550,
        actual_spend_usd: 100,
        outcomes: 5,
        cpa_usd: 20,
        cpa_confidence: "measured",
        burn_pct: 18,
      }],
    });
    assert.equal(preview.budget_hints?.scale_bucket_id, "influencer");
    assert.ok(preview.budget_mutations?.length);
  });

  it("harvests a measured P8 hook into message and experiment ledgers", () => {
    const currentThesis = thesis();
    const cadence = createOpsCadenceFromThesis(currentThesis);
    const operator = createDistributionOperatorFromThesis(currentThesis)!;
    const slots = operator.slots.filter((slot) => slot.hook_id === "hook.a" && slot.slot_kind === "post");
    operator.slots = operator.slots.map((slot) =>
      slots.slice(0, 2).some((candidate) => candidate.id === slot.id)
        ? {
            ...slot,
            status: "measured",
            proof: {
              post_url: `https://video.test/${slot.id}`,
              retention_3s_pct: 68,
              completed_at: "2026-07-14T00:00:00.000Z",
            },
          }
        : slot,
    );
    const harvested = harvestMemoryFromCycle({
      memory: createInitialGrowthMemory("p11"),
      cadence,
      thesis: currentThesis,
      distributionOperator: operator,
    });
    assert.equal(harvested.messages.find((item) => item.source_ref === "hook.a")?.verdict, "winner");
    assert.ok(harvested.experiments.some((item) => item.source_id === "hook.a"));
  });

  it("classifies a hook as winner at two retention hits", () => {
    const preview = buildReplanPreview(memoryWith(message("winner")), {
      thesis: thesis(),
      nextWeekIndex: 2,
      assessment: { pctOfTarget: 70 },
    });
    assert.equal(preview.mode, "double_down");
    assert.equal(preview.operator_hints.winning_hook_id, "hook.a");
  });

  it("classifies all-low hook evidence as loser", () => {
    const currentThesis = thesis();
    const cadence = createOpsCadenceFromThesis(currentThesis);
    const operator = createDistributionOperatorFromThesis(currentThesis)!;
    const slots = operator.slots.filter((slot) => slot.hook_id === "hook.a" && slot.slot_kind === "post");
    operator.slots = operator.slots.map((slot) =>
      slots.slice(0, 2).some((candidate) => candidate.id === slot.id)
        ? {
            ...slot,
            status: "measured",
            proof: { retention_3s_pct: 30, completed_at: "2026-07-14T00:00:00.000Z" },
          }
        : slot,
    );
    const harvested = harvestMemoryFromCycle({
      memory: createInitialGrowthMemory(),
      cadence,
      thesis: currentThesis,
      distributionOperator: operator,
    });
    assert.equal(harvested.messages.find((item) => item.source_ref === "hook.a")?.verdict, "loser");
  });

  it("classifies a P9 pitch as winner with two warm replies", () => {
    const currentThesis = thesis("influencer_partnerships");
    const cadence = createOpsCadenceFromThesis(currentThesis);
    const operator = createInfluencerOperatorFromThesis(currentThesis)!;
    const touches = operator.touches.filter((touch) => touch.pitch_id === "pitch.a").slice(0, 2);
    operator.touches = operator.touches.map((touch) =>
      touches.some((candidate) => candidate.id === touch.id)
        ? {
            ...touch,
            pipeline_stage: "replied",
            proof: {
              reply_received: true,
              reply_interest: "warm",
              completed_at: "2026-07-14T00:00:00.000Z",
            },
          }
        : touch,
    );
    const harvested = harvestMemoryFromCycle({
      memory: createInitialGrowthMemory(),
      cadence,
      thesis: currentThesis,
      influencerOperator: operator,
    });
    assert.equal(harvested.messages.find((item) => item.source_ref === "pitch.a")?.verdict, "winner");
  });

  it("classifies five P9 sends without replies as loser", () => {
    const currentThesis = thesis("influencer_partnerships");
    const cadence = createOpsCadenceFromThesis(currentThesis);
    const operator = createInfluencerOperatorFromThesis(currentThesis)!;
    const touches = operator.touches.filter((touch) => touch.pitch_id === "pitch.a").slice(0, 5);
    operator.touches = operator.touches.map((touch) =>
      touches.some((candidate) => candidate.id === touch.id)
        ? {
            ...touch,
            pipeline_stage: "pitched",
            proof: { reply_received: false, completed_at: "2026-07-14T00:00:00.000Z" },
          }
        : touch,
    );
    const harvested = harvestMemoryFromCycle({
      memory: createInitialGrowthMemory(),
      cadence,
      thesis: currentThesis,
      influencerOperator: operator,
    });
    assert.equal(harvested.messages.find((item) => item.source_ref === "pitch.a")?.verdict, "loser");
  });

  it("harvests Lane B outreach proof as an outbound message", () => {
    const currentThesis = thesis("outbound_sales");
    const cadence = createOpsCadenceFromThesis(currentThesis);
    const laneB = createLaneBWorkspaceFromThesis(currentThesis, { opsCadence: cadence });
    laneB.items[0] = {
      ...laneB.items[0]!,
      status: "done",
      proof: { note: "Personalized opener sent", completed_at: "2026-07-14T00:00:00.000Z" },
    };
    const harvested = harvestMemoryFromCycle({
      memory: createInitialGrowthMemory(),
      cadence,
      thesis: currentThesis,
      laneB,
    });
    assert.equal(harvested.messages[0]?.kind, "outbound_opener");
    assert.equal(harvested.messages[0]?.verdict, "neutral");
  });

  it("harvests ops proof and links the generated experiment", () => {
    const currentThesis = thesis();
    const cadence = createOpsCadenceFromThesis(currentThesis);
    cadence.tasks[0] = {
      ...cadence.tasks[0]!,
      status: "done",
      proof: {
        note: "Published five variants",
        kpi_id: "short_form_views",
        kpi_value: 700,
        kpi_target: 1000,
        completed_at: "2026-07-14T00:00:00.000Z",
      },
    };
    const harvested = harvestMemoryFromCycle({
      memory: createInitialGrowthMemory(),
      cadence,
      thesis: currentThesis,
    });
    const experiment = harvested.experiments.find((item) => item.source === "ops_task")!;
    assert.equal(experiment.outcome, "won");
    assert.equal(experiment.message_ids.length, 1);
  });

  it("harvests engine_signal experiments when mechanism profile is set", () => {
    const currentThesis = {
      ...thesis("seo_content"),
      signals: { primary_mechanism_id: "solution_ecosystem" },
    };
    const cadence = createOpsCadenceFromThesis(currentThesis);
    cadence.tasks[0]!.status = "done";
    cadence.tasks[1]!.status = "done";
    const harvested = harvestMemoryFromCycle({
      memory: createInitialGrowthMemory(),
      cadence,
      thesis: currentThesis,
      growthMechanismProfile: {
        primary_mechanism_id: "solution_ecosystem",
        configured_at: "2026-07-16T00:00:00.000Z",
        assessment: {
          ranked: [],
          primary: "solution_ecosystem",
          computed_at: "2026-07-16T00:00:00.000Z",
        },
      },
    });
    const engine = harvested.experiments.find((item) => item.source === "engine_signal");
    assert.ok(engine);
    assert.equal(engine?.message_ids.length, 0);
  });

  it("buildReplanPreview includes engine_hints from mechanism profile", () => {
    const currentThesis = thesis("seo_content");
    const memory = createInitialGrowthMemory();
    memory.last_harvest_cycle_index = 1;
    const preview = buildReplanPreview(memory, {
      thesis: currentThesis,
      nextWeekIndex: 2,
      growthMechanismProfile: {
        primary_mechanism_id: "solution_ecosystem",
        configured_at: "2026-07-16T00:00:00.000Z",
        assessment: {
          ranked: [],
          primary: "solution_ecosystem",
          computed_at: "2026-07-16T00:00:00.000Z",
        },
      },
    });
    assert.ok(preview.engine_hints?.length);
  });

  it("re-harvest is idempotent for a cycle", () => {
    const state = createInitialGrowthMemory();
    const m = message("winner");
    const once = appendExperimentLedger(state, [m], [], 1);
    const twice = appendExperimentLedger(once, [m], [], 1);
    assert.equal(twice.messages.length, 1);
  });

  it("recommends double_down for a winner and promising KPI", () => {
    assert.equal(recommendNextCycleMode(memoryWith(message("winner")), { pctOfTarget: 70 }), "double_down");
  });

  it("recommends pivot for two losers of the same kind", () => {
    const memory = memoryWith(message("loser", "hook", "hook.a"), message("loser", "hook", "hook.b"));
    assert.equal(recommendNextCycleMode(memory, { pctOfTarget: 10 }), "pivot");
  });

  it("rewrites viral priority zero from the winning hook", () => {
    const currentThesis = thesis();
    const priorities = mutatePrioritiesFromMemory(
      currentThesis.week1_priorities,
      memoryWith(message("winner")),
      2,
      "double_down",
    );
    assert.match(priorities[0]!.what, /Film 5 variants/);
    assert.match(priorities[0]!.id, /\.w2\./);
  });

  it("applies memory into a new ops cadence", () => {
    const currentThesis = thesis();
    const memory = memoryWith(message("winner"));
    const preview = buildReplanPreview(memory, {
      thesis: currentThesis,
      nextWeekIndex: 2,
      assessment: { pctOfTarget: 60 },
    });
    const applied = applyMemoryReplan(memory, currentThesis, preview, { weekIndex: 2 });
    assert.equal(applied.cadence.week_index, 2);
    assert.match(applied.cadence.tasks[0]!.what, /Film 5 variants/);
    assert.equal(applied.memory.pending_replan, undefined);
  });

  it("passes the winning pitch id through operator hints", () => {
    const currentThesis = thesis("influencer_partnerships");
    const memory = memoryWith(message("winner", "pitch", "pitch.b"));
    const preview = buildReplanPreview(memory, {
      thesis: currentThesis,
      nextWeekIndex: 2,
      assessment: { pctOfTarget: 80 },
    });
    assert.equal(preview.operator_hints.winning_pitch_id, "pitch.b");
  });

  it("migrates legacy experiments without loss", () => {
    const hydrated = hydrateGrowthMemoryFromJson(null, {
      projectId: "p11",
      thesisId: "viral_short_form",
      legacyExperiments: [
        {
          id: "legacy-1",
          date: "2026-07-01",
          hypothesis: "Test founder hook",
          discipline: "distribution",
          outcome: "success",
        },
      ],
    })!;
    assert.equal(hydrated.experiments.length, 1);
    assert.equal(hydrated.experiments[0]!.outcome, "won");
  });

  it("gate remains off for an empty Week 1 memory", () => {
    assert.equal(isGrowthMemoryGate(createInitialGrowthMemory(), 0), false);
    assert.equal(isGrowthMemoryGate(createInitialGrowthMemory(), 1), true);
  });

  it("replans Lane B rows with the winning message", () => {
    const currentThesis = thesis();
    const laneB = createLaneBWorkspaceFromThesis(currentThesis);
    const memory = memoryWith(message("winner"));
    const preview = buildReplanPreview(memory, {
      thesis: currentThesis,
      nextWeekIndex: 2,
      assessment: { pctOfTarget: 70 },
    });
    const replanned = replanLaneBFromMemory(laneB, preview, memory);
    assert.match(replanned.items[0]!.title, /winner hook/);
  });

  it("rolls up experiment, winner, and replan KPIs", () => {
    const memory = memoryWith(message("winner"));
    memory.experiments = [
      {
        id: "e1",
        cycle_index: 1,
        thesis_id: "viral_short_form",
        source: "ops_task",
        source_id: "t1",
        hypothesis: "Test",
        outcome: "won",
        learning: "Worked",
        message_ids: [],
        recorded_at: "2026-07-14",
      },
    ];
    const kpis = rollupGrowthMemoryKpis(memory, true);
    assert.deepEqual(kpis.map((kpi) => kpi.value), [1, 1, 1]);
    assert.match(growthMemorySummary(memory), /1 winners.*1 experiments/);
  });
});
