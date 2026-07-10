import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RunEvent } from "./types";
import {
  countPendingPatches,
  firstAwaitingApplyTask,
  firstAwaitingReviewTask,
  resolveTaskExecutionMode,
  shouldReconcileArchiveToDone,
  transitionAfterApply,
  transitionAfterBrowserComplete,
  transitionAfterConnectorReadNoOAuth,
  transitionAfterRepoRunComplete,
} from "./planTaskCompletion";
import { mergeReconciledRuns } from "./planProgress";
import type { MarketingPlan } from "./types";

function patchEvent(file: string, type: "file.patch_created" | "file.patch_updated" = "file.patch_created"): RunEvent {
  return {
    id: `e-${file}`,
    runId: "r1",
    seq: 1,
    timestamp: new Date().toISOString(),
    type,
    title: file,
    payload: { file },
  };
}

const miniPlan = {
  id: "p1",
  positioning: "Test",
  icp: "Test",
  readiness: [],
  strategyNote: "",
  thesis: "t",
  playbooks: [],
  taskGraph: [
    {
      id: "t1",
      day: 1,
      title: "Edit hero",
      dependsOn: [],
      execution_mode: "repo",
    },
    {
      id: "t2",
      day: 2,
      title: "Research",
      dependsOn: ["t1"],
      execution_mode: "browser",
    },
    {
      id: "t3",
      day: 3,
      title: "Draft email",
      dependsOn: ["t2"],
      execution_mode: "asset",
    },
  ],
  contentCalendar: [],
} as unknown as MarketingPlan;

describe("transitionAfterRepoRunComplete", () => {
  it("repo run with patches → awaiting_apply", () => {
    const t = transitionAfterRepoRunComplete([patchEvent("src/a.tsx")]);
    assert.equal(t.status, "awaiting_apply");
    assert.equal(t.gate, "apply-pending");
    assert.equal(t.clearActiveTask, false);
  });

  it("repo run with zero patches → awaiting_review", () => {
    const t = transitionAfterRepoRunComplete([]);
    assert.equal(t.status, "awaiting_review");
    assert.equal(t.gate, "review-pending");
  });

  it("counts pending patches excluding discarded", () => {
    const events: RunEvent[] = [
      patchEvent("keep.ts"),
      patchEvent("drop.ts"),
      {
        ...patchEvent("drop.ts"),
        type: "file.patch_discarded",
        id: "disc",
      },
    ];
    assert.equal(countPendingPatches(events), 1);
  });
});

describe("transitionAfterBrowserComplete", () => {
  it("findings ≥ 1 → done", () => {
    const t = transitionAfterBrowserComplete(2);
    assert.equal(t.status, "done");
    assert.equal(t.clearActiveTask, true);
  });

  it("zero findings → awaiting_review (not done)", () => {
    const t = transitionAfterBrowserComplete(0);
    assert.equal(t.status, "awaiting_review");
    assert.equal(t.gate, "research-pending");
    assert.equal(t.clearActiveTask, false);
  });
});

describe("transitionAfterApply", () => {
  it("apply all files → done", () => {
    const t = transitionAfterApply(2, 0);
    assert.equal(t.status, "done");
  });

  it("partial apply → partial status", () => {
    const t = transitionAfterApply(1, 2);
    assert.equal(t.status, "partial");
    assert.equal(t.gate, "partial-apply");
  });

  it("zero applied → stays awaiting_apply", () => {
    const t = transitionAfterApply(0, 3);
    assert.equal(t.status, "awaiting_apply");
  });
});

describe("firstAwaitingApplyTask", () => {
  it("returns lowest-day awaiting_apply task", () => {
    const byTaskId = {
      t1: { status: "awaiting_apply" as const },
      t2: { status: "partial" as const },
    };
    const hit = firstAwaitingApplyTask(miniPlan, byTaskId);
    assert.equal(hit?.task.id, "t1");
    assert.equal(hit?.status, "awaiting_apply");
  });
});

describe("firstAwaitingReviewTask", () => {
  it("returns first awaiting_review by day", () => {
    const byTaskId = {
      t2: { status: "awaiting_review" as const },
    };
    const hit = firstAwaitingReviewTask(miniPlan, byTaskId);
    assert.equal(hit?.id, "t2");
  });
});

describe("shouldReconcileArchiveToDone", () => {
  it("blocks reconcile when awaiting_apply", () => {
    assert.equal(shouldReconcileArchiveToDone("awaiting_apply"), false);
  });

  it("allows reconcile from running", () => {
    assert.equal(shouldReconcileArchiveToDone("running"), true);
  });
});

describe("mergeReconciledRuns", () => {
  it("does not overwrite awaiting_apply with archive done", () => {
    const base = {
      t1: { taskId: "t1", status: "awaiting_apply" as const },
    };
    const merged = mergeReconciledRuns(miniPlan, base, ["t1"], { t1: "run-1" });
    assert.equal(merged.t1.status, "awaiting_apply");
  });
});

describe("resolveTaskExecutionMode", () => {
  it("infers browser from action_type", () => {
    const mode = resolveTaskExecutionMode({
      id: "x",
      day: 1,
      title: "Scan",
      dependsOn: [],
      action_type: "browser_research",
    });
    assert.equal(mode, "browser");
  });

  it("defaults repo for edit tasks", () => {
    const mode = resolveTaskExecutionMode({
      id: "x",
      day: 1,
      title: "Fix",
      dependsOn: [],
      action_type: "edit_files",
    });
    assert.equal(mode, "repo");
  });

  it("connector_read without GA4 → awaiting_review + connector gate", () => {
    const t = transitionAfterConnectorReadNoOAuth();
    assert.equal(t.status, "awaiting_review");
    assert.equal(t.gate, "connector-pending");
    assert.equal(t.clearActiveTask, false);
  });
});
