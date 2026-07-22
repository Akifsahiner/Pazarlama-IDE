import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake, cluelyLikeReadme } from "./cmoIntake";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import {
  archiveCompletedCycle,
  buildIntakeDelta,
  canStartNextCycle,
  createInitialContinuousState,
  isContinuousReplanReady,
  resolveNextCycleThesisId,
} from "./cmoContinuous";
import { evaluateWeek1Metrics } from "./cmoProofLoop";
import type { ProjectProfile } from "./types";
import type { CmoOpsCadence } from "./cmoOpsCadence";

function baseProject(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: true,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS for teams.",
    ...overrides,
  };
}

function completedCadence(thesis: ReturnType<typeof buildCmoIntake>): CmoOpsCadence {
  const cadence = createOpsCadenceFromThesis(thesis);
  return {
    ...cadence,
    week_review: {
      ...cadence.week_review,
      status: "completed",
      summary: "Flat on views.",
      completed_at: new Date().toISOString(),
    },
    pivot_suggestion: {
      verdict: "flat",
      headline: "Week 1 flat",
      rationale: ["KPI below threshold"],
      suggested_thesis_ids: ["landing_conversion"],
      suggested_actions: ["Pivot"],
      generated_at: new Date().toISOString(),
    },
    tasks: cadence.tasks.map((t, i) => ({
      ...t,
      status: i === cadence.tasks.length - 1 ? "done" : "done",
      proof:
        i === cadence.tasks.length - 1
          ? { kpi_id: "short_form_views", kpi_value: 0, completed_at: new Date().toISOString() }
          : undefined,
    })),
  };
}

describe("cmoContinuous", () => {
  it("archiveCompletedCycle enters measuring / pivot_ready", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = completedCadence(thesis);
    const assessment = evaluateWeek1Metrics(cadence, null, thesis);
    const state = createInitialContinuousState();
    const next = archiveCompletedCycle(state, {
      cadence,
      thesis,
      assessment,
      weekReviewSummary: "Views flat",
      pivot: cadence.pivot_suggestion,
      budgetSnapshot: {
        plan: { id: "budget.test" },
        closeout: [],
        total_spend_usd: 0,
        headline: "$0 logged · CPA unavailable",
      } as never,
    });
    assert.equal(next.phase, "pivot_ready");
    assert.equal(next.cycles.length, 1);
    assert.equal(next.cycles[0]?.cycle_index, 1);
    assert.equal(next.cycles[0]?.budget_snapshot?.total_spend_usd, 0);
  });

  it("buildIntakeDelta captures thesis shift", () => {
    const prior = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const next = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
      context: { force_thesis_id: "landing_conversion", cycle_index: 2, mode: "pivot" },
    });
    const delta = buildIntakeDelta(prior, next, {
      fromCycleIndex: 1,
      toCycleIndex: 2,
      pivot: { verdict: "flat", headline: "flat", rationale: ["x"], suggested_thesis_ids: ["landing_conversion"], suggested_actions: [], generated_at: new Date().toISOString() },
    });
    assert.equal(delta.thesis_changed, true);
    assert.match(delta.headline, /Week 2/);
    assert.equal(delta.new_thesis_id, "landing_conversion");
  });

  it("resolveNextCycleThesisId respects mode", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = {
      ...createOpsCadenceFromThesis(thesis),
      pivot_suggestion: {
        verdict: "flat" as const,
        headline: "flat",
        rationale: [],
        suggested_thesis_ids: ["landing_conversion" as const],
        suggested_actions: [],
        generated_at: new Date().toISOString(),
      },
    };
    assert.equal(
      resolveNextCycleThesisId(cadence, { mode: "pivot" }),
      "landing_conversion",
    );
    assert.equal(
      resolveNextCycleThesisId(cadence, { mode: "double_down" }),
      cadence.thesis_id,
    );
  });

  it("canStartNextCycle requires archived week in measuring phase", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = createOpsCadenceFromThesis(thesis);
    const state = createInitialContinuousState();
    assert.equal(canStartNextCycle(state, cadence).ok, false);

    const archived = archiveCompletedCycle(state, {
      cadence: completedCadence(thesis),
      thesis,
      assessment: evaluateWeek1Metrics(completedCadence(thesis), null, thesis),
      weekReviewSummary: "done",
      pivot: completedCadence(thesis).pivot_suggestion,
    });
    assert.equal(canStartNextCycle(archived, completedCadence(thesis)).ok, true);
  });

  it("isContinuousReplanReady when measuring + archived", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = completedCadence(thesis);
    const state = archiveCompletedCycle(createInitialContinuousState(), {
      cadence,
      thesis,
      assessment: evaluateWeek1Metrics(cadence, null, thesis),
      weekReviewSummary: "done",
    });
    assert.equal(
      isContinuousReplanReady(state, cadence, "measuring"),
      true,
    );
    assert.equal(
      isContinuousReplanReady(state, cadence, "executing"),
      false,
    );
  });

  it("isContinuousReplanReady before archive when week close ready", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = completedCadence(thesis);
    const state = createInitialContinuousState();
    assert.equal(
      isContinuousReplanReady(state, cadence, "executing", true),
      true,
    );
    assert.equal(
      isContinuousReplanReady(state, cadence, "planning", true),
      false,
    );
  });
});

describe("buildCmoIntake P4 context", () => {
  it("force_thesis_id overrides pick", () => {
    const thesis = buildCmoIntake({
      project: baseProject({ readmeSummary: cluelyLikeReadme(), name: "Cluely" }),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
      context: { force_thesis_id: "landing_conversion", cycle_index: 2 },
    });
    assert.equal(thesis.id, "landing_conversion");
    assert.ok(thesis.week1_priorities[0]?.id?.includes(".w2."));
    assert.ok(thesis.rationale.some((r) => /Week 2/i.test(r)));
  });
});

describe("createOpsCadenceFromThesis week 2", () => {
  it("uses week_index in task ids", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      context: { cycle_index: 2, force_thesis_id: "founder_social" },
    });
    const cadence = createOpsCadenceFromThesis(thesis, { week_index: 2, prior_ops_cadence_id: "ops.old" });
    assert.equal(cadence.week_index, 2);
    assert.equal(cadence.prior_ops_cadence_id, "ops.old");
    assert.ok(cadence.tasks[0]?.id.includes(".w2."));
  });
});
