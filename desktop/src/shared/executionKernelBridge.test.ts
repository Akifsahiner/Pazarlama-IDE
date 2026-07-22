import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCmoIntake } from "./cmoIntake";
import type { ProjectProfile } from "./types";
import { bootstrapExecutionKernel, dispatchExecutionTask } from "./executionKernel";
import { createOpsCadenceFromThesis } from "./cmoOpsCadence";
import {
  failActiveKernelTaskForRun,
  finalizeVerifyRun,
  mergeReplayTimeline,
  planVerifyAfterApply,
  resolveFailedKernelTaskId,
  shouldBlockTaskComplete,
} from "./executionKernelBridge";
import { buildShipReceiptFromApply } from "./shipReceipt";

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

describe("executionKernelBridge", () => {
  it("plans verify when browse available", () => {
    const plan = planVerifyAfterApply({
      previewUrl: "http://localhost:3000",
      canBrowse: true,
      task: {
        id: "t1",
        priority_index: 0,
        what: "Ship hero",
        why: "w",
        owner: "system",
        done_when: "Live URL verified",
        status: "in_progress",
        day_slot: "now",
      },
    });
    assert.ok(plan?.shouldSchedule);
  });

  it("finalize verify marks receipt passed", () => {
    const receipt = buildShipReceiptFromApply({
      runId: "r1",
      filesApplied: ["page.tsx"],
      previewUrl: "http://localhost:3000",
    });
    const result = finalizeVerifyRun({
      receipt,
      runId: "verify-1",
      url: "http://localhost:3000",
      report: { validations: [{ label: "Hero CTA visible", passed: true }] },
    });
    assert.equal(result.passed, true);
    assert.equal(result.pipelineEvent, "verify.completed");
  });

  it("blocks complete without browser evidence", () => {
    const block = shouldBlockTaskComplete({
      task: {
        id: "t1",
        priority_index: 0,
        what: "Ship",
        why: "w",
        owner: "system",
        done_when: "Live URL in repo",
        status: "in_progress",
        day_slot: "now",
        expected_proof_kind: "browser_evidence",
      },
    });
    assert.equal(block.blocked, true);
  });

  it("resolveFailedKernelTaskId prefers verifying then run_id match", () => {
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
      status: "verifying",
      run_id: "verify-run",
    };
    assert.equal(resolveFailedKernelTaskId(kernel, "other-run"), systemTask.id);

    kernel.instances[systemTask.id] = {
      ...kernel.instances[systemTask.id]!,
      status: "running",
      run_id: "run-abc",
    };
    assert.equal(resolveFailedKernelTaskId(kernel, "run-abc"), systemTask.id);
  });

  it("failActiveKernelTaskForRun transitions active task to failed", () => {
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
      status: "running",
      run_id: "run-fail",
    };
    const result = failActiveKernelTaskForRun({
      kernel,
      runId: "run-fail",
      error: "Run failed.",
    });
    assert.equal(result.taskId, systemTask.id);
    assert.equal(result.kernel.instances[systemTask.id]?.status, "failed");
  });

  it("mergeReplayTimeline interleaves kernel and run events", () => {
    const thesis = buildCmoIntake({
      project: baseProject(),
      persona: "marketing",
      profile: { company_stage: "prelaunch" } as never,
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const kernel = bootstrapExecutionKernel({ cadence, projectId: "p1" });
    const systemTask = cadence.tasks.find((t) => t.owner === "system")!;
    kernel.instances[systemTask.id] = {
      ...kernel.instances[systemTask.id]!,
      status: "ready",
    };
    const prov = { source: "ops_board" as const, at: new Date().toISOString() };
    const dispatched = dispatchExecutionTask(kernel, systemTask.id, prov);
    const merged = mergeReplayTimeline({
      kernel: dispatched.kernel,
      taskId: systemTask.id,
      runId: "run-1",
      runEvents: [
        {
          seq: 1,
          id: "e1",
          timestamp: new Date().toISOString(),
          runId: "run-1",
          type: "run.failed",
          title: "Run failed",
          summary: "NO_PATCHES",
        },
      ],
    });
    assert.ok(merged.some((e) => e.kind === "kernel"));
    assert.ok(merged.some((e) => e.kind === "run"));
  });
});
