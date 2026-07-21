import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import type { ProjectProfile } from "./types";
import {
  bootstrapExecutionKernel,
  dispatchExecutionTask,
  completeExecutionTask,
  retryExecutionTask,
  pauseExecutionTask,
  resumeExecutionTask,
  cancelExecutionTask,
  projectKernelToOpsCadence,
  opsStatusFromKernel,
  weekReviewGovernanceId,
} from "./executionKernel";
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

describe("executionKernel", () => {
  it("bootstraps instances from cadence", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const kernel = bootstrapExecutionKernel({ cadence, projectId: "p1" });
    assert.equal(Object.keys(kernel.instances).length, cadence.tasks.length + 1);
    assert.ok(kernel.instances[weekReviewGovernanceId(cadence.id)]);
  });

  it("dispatch is idempotent while running", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    let kernel = bootstrapExecutionKernel({ cadence, projectId: "p1" });
    const systemTask = cadence.tasks.find((t) => t.owner === "system")!;
    kernel.instances[systemTask.id] = {
      ...kernel.instances[systemTask.id]!,
      status: "ready",
    };
    const prov = { source: "ops_board" as const, at: new Date().toISOString() };
    const first = dispatchExecutionTask(kernel, systemTask.id, prov);
    const second = dispatchExecutionTask(first.kernel, systemTask.id, prov);
    assert.equal(second.noop, true);
    assert.equal(second.instance.status, "running");
  });

  it("projects lifecycle to ops status", () => {
    assert.equal(opsStatusFromKernel("ready"), "pending");
    assert.equal(opsStatusFromKernel("running"), "in_progress");
    assert.equal(opsStatusFromKernel("completed"), "done");
    assert.equal(opsStatusFromKernel("cancelled"), "skipped");
  });

  it("complete transitions to completed", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    let kernel = bootstrapExecutionKernel({ cadence, projectId: "p1" });
    const task = cadence.tasks[0]!;
    kernel.instances[task.id] = { ...kernel.instances[task.id]!, status: "running" };
    kernel = completeExecutionTask(
      kernel,
      task.id,
      { proof: { note: "done", completed_at: new Date().toISOString() }, toStatus: "completed" },
      { source: "ops_board", at: new Date().toISOString() },
    );
    assert.equal(kernel.instances[task.id]?.status, "completed");
    const projected = projectKernelToOpsCadence(kernel, cadence);
    assert.equal(projected.tasks.find((t) => t.id === task.id)?.status, "done");
  });

  it("retry increments attempt without new task ids", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    let kernel = bootstrapExecutionKernel({ cadence, projectId: "p1" });
    const task = cadence.tasks[0]!;
    kernel.instances[task.id] = {
      ...kernel.instances[task.id]!,
      status: "failed",
      attempt: 1,
    };
    const beforeIds = Object.keys(kernel.instances);
    kernel = retryExecutionTask(kernel, task.id, {
      source: "ops_board",
      at: new Date().toISOString(),
    });
    assert.deepEqual(Object.keys(kernel.instances), beforeIds);
    assert.equal(kernel.instances[task.id]?.attempt, 2);
    assert.equal(kernel.instances[task.id]?.status, "ready");
  });

  it("pause and resume", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    let kernel = bootstrapExecutionKernel({ cadence, projectId: "p1" });
    const task = cadence.tasks[0]!;
    kernel.instances[task.id] = { ...kernel.instances[task.id]!, status: "running" };
    const prov = { source: "ops_board" as const, at: new Date().toISOString() };
    kernel = pauseExecutionTask(kernel, task.id, prov);
    assert.equal(kernel.instances[task.id]?.status, "paused");
    kernel = resumeExecutionTask(kernel, task.id, prov);
    assert.equal(kernel.instances[task.id]?.status, "running");
  });

  it("cancel marks cancelled", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    let kernel = bootstrapExecutionKernel({ cadence, projectId: "p1" });
    const task = cadence.tasks[0]!;
    kernel.instances[task.id] = { ...kernel.instances[task.id]!, status: "ready" };
    kernel = cancelExecutionTask(kernel, task.id, {
      source: "ops_board",
      at: new Date().toISOString(),
    });
    assert.equal(kernel.instances[task.id]?.status, "cancelled");
  });
});
