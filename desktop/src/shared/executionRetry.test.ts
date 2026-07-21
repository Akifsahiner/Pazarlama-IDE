import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import type { ProjectProfile } from "./types";
import { bootstrapExecutionKernel, retryExecutionTask } from "./executionKernel";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";

function baseProject(): ProjectProfile {
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
  };
}

describe("executionRetry", () => {
  it("retry does not duplicate tasks or assets", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const taskCountBefore = cadence.tasks.length;
    let kernel = bootstrapExecutionKernel({ cadence, projectId: "p1" });
    const humanTask = cadence.tasks.find((t) => t.owner === "user");
    if (!humanTask) return;
    const assetBefore = humanTask.human_execution_asset;
    kernel.instances[humanTask.id] = {
      ...kernel.instances[humanTask.id]!,
      status: "failed",
    };
    kernel = retryExecutionTask(kernel, humanTask.id, {
      source: "ops_board",
      at: new Date().toISOString(),
    });
    assert.equal(cadence.tasks.length, taskCountBefore);
    assert.equal(Object.keys(kernel.instances).length, taskCountBefore);
    const taskAfter = cadence.tasks.find((t) => t.id === humanTask.id);
    assert.deepEqual(taskAfter?.human_execution_asset, assetBefore);
  });
});
