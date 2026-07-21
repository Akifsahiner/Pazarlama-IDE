import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake, cluelyLikeReadme } from "./cmoIntake";
import type { ProjectProfile } from "./types";
import {
  assertTaskContractComplete,
  assertCadenceContractComplete,
  GENERIC_TASK_DELIVERABLE_RE,
  isMeasurableForReview,
  taskContractEffortMinutes,
} from "./marketingTaskContract";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import type { ChannelThesisId } from "./cmoIntake";
import { GROWTH_MECHANISM_IDS } from "./cmoGrowthMechanismKnowledge";
import { buildMechanismWeek1Tasks } from "./cmoGrowthEngine";

function baseProject(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/console/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS for teams.",
    ...overrides,
  };
}

const ALL_THESES: ChannelThesisId[] = [
  "viral_short_form",
  "founder_social",
  "product_hunt_launch",
  "landing_conversion",
  "seo_content",
  "outbound_sales",
  "community_launch",
  "influencer_partnerships",
];

describe("marketingTaskContract", () => {
  it("assertTaskContractComplete passes enriched thesis tasks", () => {
    const thesis = buildCmoIntake({
      project: baseProject({ name: "Cluely", readmeSummary: cluelyLikeReadme() }),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    for (const task of thesis.week1_priorities) {
      const errors = assertTaskContractComplete(task);
      assert.equal(errors.length, 0, `${task.id}: ${errors.join(", ")}`);
    }
  });

  it("createOpsCadenceFromThesis materializes full contract on ops tasks", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: {} as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    assert.equal(assertCadenceContractComplete(cadence).length, 0);
    assert.ok(cadence.tasks.every((t) => t.deliverable && t.execution_mode));
    assert.ok(cadence.tasks.every((t) => t.when?.due_at));
  });

  it("isMeasurableForReview respects metric.measurable flag", () => {
    assert.equal(isMeasurableForReview({ metric: { id: "x", name: "x", measurable: true } }), true);
    assert.equal(isMeasurableForReview({ metric: { id: "x", name: "x", measurable: false } }), false);
  });

  it("taskContractEffortMinutes returns positive for all modes", () => {
    assert.ok(taskContractEffortMinutes("repo_edit") >= 60);
    assert.ok(taskContractEffortMinutes("human_post") >= 20);
  });

  it("GENERIC_TASK_DELIVERABLE_RE catches vague deliverables", () => {
    assert.ok(GENERIC_TASK_DELIVERABLE_RE.test("Improve marketing"));
    assert.ok(!GENERIC_TASK_DELIVERABLE_RE.test("3 live post URLs with UTM"));
  });

  it("all 8 thesis templates produce contract-complete week1 priorities", () => {
    for (const thesisId of ALL_THESES) {
      const thesis = buildCmoIntake({
        project: baseProject(),
        persona: "marketing",
        profile: { company_stage: "prelaunch" } as never,
        context: { force_thesis_id: thesisId },
      });
      assert.equal(thesis.id, thesisId);
      for (const task of thesis.week1_priorities) {
        const errors = assertTaskContractComplete(task);
        assert.equal(errors.length, 0, `${thesisId}/${task.id}: ${errors.join(", ")}`);
      }
    }
  });

  it("all 14 mechanism templates produce contract-complete tasks", () => {
    for (const mechanismId of GROWTH_MECHANISM_IDS) {
      const tasks = buildMechanismWeek1Tasks(mechanismId, 1);
      for (const task of tasks) {
        const errors = assertTaskContractComplete(task);
        assert.equal(errors.length, 0, `${mechanismId}: ${errors.join(", ")}`);
      }
    }
  });
});
