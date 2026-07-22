import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import { createOpsCadenceFromThesis, completeOpsTask } from "./cmoOpsCadence";
import {
  buildAutoWeekCloseSummary,
  buildPivotSuggestion,
  buildRevenueWeekReviewNudge,
  canCompleteWeekReview,
  evaluateWeek1Metrics,
  resolveOpsKpiGate,
  validateFullOpsProof,
  validateKpiProof,
} from "./cmoProofLoop";
import { buildRevenueProfile } from "./cmoRevenuePlane";
import type { FounderFitProfile, ProjectProfile } from "./types";

function baseProject(): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS for teams.",
  };
}

describe("cmoProofLoop", () => {
  it("resolveOpsKpiGate maps user task to a KPI preset", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const userTask = thesis.week1_priorities.find((p) => p.owner === "user");
    assert.ok(userTask);
    const gate = resolveOpsKpiGate(userTask, thesis.id);
    assert.ok(gate?.presetId);
  });

  it("validateKpiProof rejects missing numeric KPI", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const user = thesis.week1_priorities.find((p) => p.owner === "user")!;
    const v = validateKpiProof(user, { urls: ["https://x.com/p/1"], note: "posted three times" });
    assert.equal(v.ok, false);
  });

  it("validateFullOpsProof accepts KPI + URL for user task", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    let cadence = createOpsCadenceFromThesis(thesis);
    for (const t of cadence.tasks.filter((x) => x.owner === "system")) {
      cadence = completeOpsTask(cadence, t.id, { metric_snapshot: "2" }).cadence;
    }
    const user = cadence.tasks.find((t) => t.owner === "user")!;
    const v = validateFullOpsProof(user, {
      urls: ["https://tiktok.com/@u/v/1"],
      kpi_value: 1200,
      metric_snapshot: "1200 views",
    });
    assert.equal(v.ok, true);
  });

  it("buildPivotSuggestion returns flat when KPI is zero", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    let cadence = createOpsCadenceFromThesis(thesis);
    for (const t of cadence.tasks) {
      if (t.owner === "system") {
        cadence = completeOpsTask(cadence, t.id, { metric_snapshot: "1" }).cadence;
      }
    }
    const user = cadence.tasks.find((t) => t.owner === "user")!;
    cadence = completeOpsTask(cadence, user.id, {
      urls: ["https://x.com/p/1"],
      kpi_value: 0,
      metric_snapshot: "0 views",
      kpi_id: "short_form_views",
      kpi_name: "views",
    }).cadence;

    const assessment = evaluateWeek1Metrics(cadence, { manual_kpis: [] } as never, thesis);
    assert.equal(assessment.verdict, "flat");

    const pivot = buildPivotSuggestion(cadence, { manual_kpis: [] } as never, thesis);
    assert.ok(pivot);
    assert.equal(pivot.verdict, "flat");
    assert.ok(pivot.suggested_thesis_ids.length >= 1);
  });

  it("buildRevenueWeekReviewNudge reports paying-customer progress", () => {
    const founderFit: FounderFitProfile = {
      brand_face_readiness: "sometimes",
      controversy_tolerance: "selective",
      monthly_budget_band: "500_2000",
      scale_readiness: "yes",
      magic_moment: "Gets value fast",
      weekly_marketing_hours: "3_7",
      thirty_day_win: "paying_customers",
      completed_at: "2026-07-01T00:00:00.000Z",
    };
    const profile = buildRevenueProfile({
      founderFit,
      intake: { paidCustomers: 4 },
    });
    const nudge = buildRevenueWeekReviewNudge(
      { founder_fit: founderFit } as never,
      profile,
    );
    assert.match(nudge ?? "", /4\/30/);
  });

  it("canCompleteWeekReview no longer requires free-text summary", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    let cadence = createOpsCadenceFromThesis(thesis);
    for (const task of cadence.tasks) {
      cadence = completeOpsTask(cadence, task.id, {
        kpi_value: task.owner === "user" ? 42 : undefined,
        metric_snapshot: task.owner === "system" ? "42" : undefined,
        note: task.owner === "user" ? "Logged" : undefined,
      }).cadence;
    }
    const assessment = evaluateWeek1Metrics(cadence, null, thesis);
    const check = canCompleteWeekReview(cadence, null, thesis);
    assert.equal(check.ok, true);
    assert.match(buildAutoWeekCloseSummary(cadence, assessment, thesis), /Week 1/);
  });

  it("canCompleteWeekReview blocks when monetization P0 is still open", () => {
    const cadence = createOpsCadenceFromThesis(
      buildCmoIntake({ project: baseProject(), persona: "marketing" }),
    );
    const check = canCompleteWeekReview(
      cadence,
      null,
      null,
      "Week summary",
      null,
      {
        id: "mon.1",
        thesis_id: "landing_conversion",
        started_at: "2026-07-01T00:00:00.000Z",
        revenue_binding: {
          active: true,
          stage_id: "revenue",
          headline: "Checkout missing",
          rationale: [],
          evidence: [],
          confidence: "missing",
        },
        tasks: [
          {
            id: "mon.1",
            priority: "P0",
            title: "Ship pricing page",
            problem: "Add /pricing",
            fix_scope: "site_level",
            status: "pending",
            sort_order: 0,
            acceptance_criteria: ["Live URL"],
            growth_impact: "Unlock self-serve checkout",
          },
        ],
      },
    );
    assert.equal(check.ok, false);
    assert.match(check.errors[0] ?? "", /Ship pricing page/);
  });
});
