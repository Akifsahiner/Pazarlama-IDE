import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolvePlanDeepLink, planPlaybookMarkdownLink } from "./planNavigation";
import type { MarketingPlan } from "./types";
import { emptyProgressSnapshot } from "./planProgress";
import { parseCanvasLink } from "./canvasLinks";

const miniPlan = {
  id: "p1",
  positioning: "Test",
  icp: "Test",
  readiness: [],
  strategyNote: "",
  thesis: "t",
  playbooks: [
    { id: "pb1", title: "Landing", subtitle: "", tasks: [] },
    { id: "pb2", title: "Research", subtitle: "", tasks: [] },
  ],
  taskGraph: [
    {
      id: "t1",
      day: 1,
      title: "Fix hero CTA",
      playbookId: "pb1",
      dependsOn: [],
      execution_mode: "repo",
    },
    {
      id: "t2",
      day: 2,
      title: "Scan competitors",
      playbookId: "pb2",
      dependsOn: ["t1"],
      execution_mode: "browser",
    },
  ],
  contentCalendar: [],
} as unknown as MarketingPlan;

describe("resolvePlanDeepLink", () => {
  it("plan-task:// resolves awaiting_apply task", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    snap.byTaskId.t1 = {
      taskId: "t1",
      status: "awaiting_apply",
      updatedAt: new Date().toISOString(),
    };
    const r = resolvePlanDeepLink({ plan: miniPlan, planProgress: snap, taskId: "t1" });
    assert.equal(r?.taskId, "t1");
    assert.equal(r?.taskDay, 1);
  });

  it("plan-task:// resolves exact task", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    const r = resolvePlanDeepLink({ plan: miniPlan, planProgress: snap, taskId: "t2" });
    assert.equal(r?.taskId, "t2");
    assert.equal(r?.taskDay, 2);
  });

  it("surface://plan-playbook picks next actionable task not first", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    snap.byTaskId.t1 = { taskId: "t1", status: "done", updatedAt: new Date().toISOString() };
    const r = resolvePlanDeepLink({ plan: miniPlan, planProgress: snap, playbookId: "pb2" });
    assert.equal(r?.taskId, "t2");
  });

  it("planPlaybookMarkdownLink points at next actionable task", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    snap.byTaskId.t1 = { taskId: "t1", status: "done", updatedAt: new Date().toISOString() };
    const link = planPlaybookMarkdownLink("pb2", "Research", miniPlan as never, snap);
    assert.match(link, /plan-task:\/\/t2/);
  });
});

describe("parseCanvasLink", () => {
  it("parses surface and plan links", () => {
    assert.deepEqual(parseCanvasLink("surface://campaign-plan"), {
      type: "surface",
      surface: "campaign-plan",
    });
    assert.deepEqual(parseCanvasLink("plan-task://t1"), { type: "plan-task", taskId: "t1" });
    assert.deepEqual(parseCanvasLink("surface://plan-playbook/pb1"), {
      type: "plan-playbook",
      playbookId: "pb1",
    });
  });
});
