import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveNextAction, type NextActionInput } from "./nextAction";
import type { MarketingPlan } from "./types";
import { emptyProgressSnapshot } from "./planProgress";

function base(overrides: Partial<NextActionInput> = {}): NextActionInput {
  return {
    scope: "page",
    route: "home",
    hasProject: true,
    connected: true,
    persona: "marketing",
    hasAgentCwd: true,
    canvasMode: "empty",
    workSurface: null,
    plan: null,
    planLoading: false,
    planPreviewMode: false,
    planProgress: null,
    runActive: false,
    runNeedsApproval: false,
    browserActive: false,
    browserNeedsApproval: false,
    feedItems: [],
    runsCount: 0,
    assetsCount: 0,
    ...overrides,
  };
}

const miniPlan = {
  id: "p1",
  positioning: "Test",
  icp: "Test",
  readiness: [],
  strategyNote: "",
  thesis: "t",
  playbooks: [{ id: "pb1", title: "Landing", subtitle: "", tasks: [] }],
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
      playbookId: "pb1",
      dependsOn: ["t1"],
      execution_mode: "browser",
    },
  ],
  contentCalendar: [],
} as unknown as MarketingPlan;

describe("resolveNextAction", () => {
  it("prioritizes open project when no project", () => {
    const a = resolveNextAction(base({ hasProject: false }));
    assert.equal(a?.dispatch.type, "open_project");
  });

  it("prioritizes awaiting_apply before feed gate and next task", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    snap.byTaskId.t1 = {
      taskId: "t1",
      status: "awaiting_apply",
      updatedAt: new Date().toISOString(),
    };
    const a = resolveNextAction(
      base({
        feedItems: [
          {
            id: "g1",
            ts: 1,
            source: "run",
            category: "gate",
            title: "Allow file write",
            status: "waiting",
          },
        ],
        plan: miniPlan,
        planProgress: snap,
      }),
    );
    assert.equal(a?.dispatch.type, "apply_plan_changes");
    assert.equal(a?.dispatch.type === "apply_plan_changes" && a.dispatch.taskId, "t1");
  });

  it("surfaces waiting feed gate before plan task when no pending apply", () => {
    const a = resolveNextAction(
      base({
        feedItems: [
          {
            id: "g1",
            ts: 1,
            source: "run",
            category: "gate",
            title: "Allow file write",
            status: "waiting",
          },
        ],
        plan: miniPlan,
        planProgress: emptyProgressSnapshot(miniPlan),
      }),
    );
    assert.equal(a?.dispatch.type, "open_feed_gate");
  });

  it("suggests next plan task when plan exists", () => {
    const a = resolveNextAction(
      base({
        scope: "page",
        plan: miniPlan,
        planProgress: emptyProgressSnapshot(miniPlan),
      }),
    );
    assert.equal(a?.dispatch.type, "continue_plan");
    assert.equal(a?.dispatch.type === "continue_plan" && a.dispatch.taskId, "t1");
  });

  it("allows offline plan preview when no plan", () => {
    const a = resolveNextAction(base({ connected: false, plan: null }));
    assert.equal(a?.dispatch.type, "preview_plan");
  });

  it("hides return-run when already on run canvas", () => {
    const withRun = resolveNextAction(
      base({
        scope: "workspace",
        route: "workspace",
        runActive: true,
        canvasMode: "run",
        plan: miniPlan,
        planProgress: emptyProgressSnapshot(miniPlan),
      }),
    );
    assert.notEqual(withRun?.id, "return-run");
  });

  it("suggests generate plan when connected and no plan", () => {
    const a = resolveNextAction(
      base({ connected: true, plan: null, route: "workspace", scope: "workspace" }),
    );
    assert.equal(a?.dispatch.type, "generate_plan");
  });

  it("uses sales persona value on home", () => {
    const a = resolveNextAction(
      base({ persona: "sales", route: "home", scope: "page", connected: true }),
    );
    assert.equal(a?.title, "Build your ICP");
    assert.equal(a?.eyebrow, "Sales");
  });

  it("uses marketing offline preview title", () => {
    const a = resolveNextAction(
      base({ persona: "marketing", connected: false, route: "home", scope: "page" }),
    );
    assert.equal(a?.title, "Preview launch outline");
  });

  it("prefixes eyebrow with campaign phase when session active", () => {
    const session = {
      id: "c1",
      projectId: "p1",
      goal: "30-day launch",
      persona: "marketing" as const,
      startedAt: new Date().toISOString(),
      phase: "executing" as const,
      milestones: [],
      runIds: [],
      assetIds: [],
    };
    const a = resolveNextAction(
      base({
        plan: miniPlan,
        planProgress: emptyProgressSnapshot(miniPlan),
        campaignSession: session,
      }),
    );
    assert.ok(a?.eyebrow.startsWith("Campaign ·"));
    assert.ok(a?.reason.includes("30-day launch"));
  });
});
