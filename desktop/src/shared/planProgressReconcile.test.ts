import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconcileProgressAfterPlanChange } from "./planProgressReconcile";
import type { MarketingPlan } from "./types";

const basePlan: MarketingPlan = {
  id: "plan-1",
  schemaVersion: 2,
  positioning: "Test",
  icp: "Devs",
  readiness: [],
  playbooks: [],
  taskGraph: [
    { id: "t1", title: "Write blog", dependsOn: [], day: 3, playbookId: "content" },
    { id: "t2", title: "Post tweet", dependsOn: ["t1"], day: 4, playbookId: "content" },
  ],
  contentCalendar: [],
  strategyNote: "Launch",
};

describe("planProgressReconcile", () => {
  it("carries progress for unchanged task ids", () => {
    const revised = structuredClone(basePlan);
    revised.taskGraph.push({
      id: "t3",
      title: "TikTok clip",
      dependsOn: [],
      day: 5,
      playbookId: "social",
    });
    const prev = {
      t1: { taskId: "t1", status: "done" as const, completedAt: "2026-01-01" },
      t2: { taskId: "t2", status: "running" as const },
    };
    const result = reconcileProgressAfterPlanChange(basePlan, revised, prev);
    assert.equal(result.carried, 2);
    assert.equal(result.byTaskId.t1?.status, "done");
    assert.equal(result.byTaskId.t2?.status, "running");
    assert.equal(result.byTaskId.t3?.status, "pending");
    assert.equal(result.initialized, 1);
  });

  it("remaps progress when task id changes but title/day match", () => {
    const revised = structuredClone(basePlan);
    revised.taskGraph = [
      { id: "t1-new", title: "Write blog", dependsOn: [], day: 3, playbookId: "content" },
      { id: "t2", title: "Post tweet", dependsOn: ["t1-new"], day: 4, playbookId: "content" },
    ];
    const prev = {
      t1: { taskId: "t1", status: "done" as const },
      t2: { taskId: "t2", status: "pending" as const },
    };
    const result = reconcileProgressAfterPlanChange(basePlan, revised, prev);
    assert.equal(result.remapped, 1);
    assert.equal(result.byTaskId["t1-new"]?.status, "done");
    assert.equal(result.dropped, 0);
  });

  it("drops orphan progress for removed tasks", () => {
    const revised = structuredClone(basePlan);
    revised.taskGraph = [revised.taskGraph[1]!];
    const prev = {
      t1: { taskId: "t1", status: "done" as const },
      t2: { taskId: "t2", status: "pending" as const },
    };
    const result = reconcileProgressAfterPlanChange(basePlan, revised, prev);
    assert.equal(result.dropped, 1);
    assert.equal(result.byTaskId.t2?.status, "pending");
    assert.equal(result.byTaskId.t1, undefined);
  });
});
