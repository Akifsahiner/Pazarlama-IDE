import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake, cluelyLikeReadme } from "./cmoIntake";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import {
  bindHumanExecutionForCadence,
  humanTasksFromCadence,
  measureUserOpsTaskId,
  primaryUserOpsTaskId,
  validateHumanTaskCoverage,
} from "./cmoHumanExecutionBind";
import type { ProjectProfile } from "./types";

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
    readmeSummary: cluelyLikeReadme(),
  };
}

describe("cmoHumanExecutionBind", () => {
  it("binds human_execution_ref on user ops tasks from Lane B", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = createOpsCadenceFromThesis(thesis);
    const laneB = createLaneBWorkspaceFromThesis(thesis, { opsCadence: cadence });

    const result = bindHumanExecutionForCadence({
      cadence,
      thesis,
      laneB,
    });

    const human = humanTasksFromCadence(result.cadence);
    assert.ok(human.length > 0);
    for (const task of human) {
      assert.ok(task.human_execution_ref, `missing ref on ${task.id}`);
      assert.ok(task.human_execution_asset, `missing asset on ${task.id}`);
      assert.ok(task.human_execution_asset!.copy_blocks.length > 0);
    }
    assert.equal(validateHumanTaskCoverage(result.cadence).ok, true);
    assert.ok(
      result.laneB?.items.some((i) => i.linked_ops_task_id === primaryUserOpsTaskId(cadence)),
    );
  });

  it("measure task prefers contract metric.measurable row", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = createOpsCadenceFromThesis(thesis);
    const measure = measureUserOpsTaskId(cadence);
    assert.ok(measure);
    const task = cadence.tasks.find((t) => t.id === measure);
    assert.ok(task);
    assert.equal(task!.metric?.measurable, true);
  });

  it("validateHumanTaskCoverage fails before bind", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const cadence = createOpsCadenceFromThesis(thesis);
    const coverage = validateHumanTaskCoverage(cadence);
    assert.equal(coverage.ok, false);
    assert.ok(coverage.missing.length > 0);
  });
});
