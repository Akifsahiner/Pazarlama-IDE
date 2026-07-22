import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveNextAction, type NextActionInput, isBlockingNextAction, shouldSuppressWorkspaceNextActionBar } from "./nextAction";
import type { MarketingPlan } from "./types";
import { emptyProgressSnapshot } from "./planProgress";
import { buildCmoIntake } from "./cmoIntake";
import { createOpsCadenceFromThesis, completeOpsTask } from "./cmoOpsCadence";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { createDelegateWorkspaceFromThesis } from "./cmoLaneC";
import { isCommandSurfaceOwnedAction } from "./cmoCommandSurface";
import type { GrowthControlPlane } from "./cmoGrowthPlane";

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

  it("prefers unlocked user ops task when cadence active and no plan", () => {
    const thesis = buildCmoIntake({
      project: {
        id: "p1",
        source: { kind: "folder", path: "/p" },
        name: "Acme",
        framework: "Next",
        routes: ["app/page.tsx"],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 10,
      },
      persona: "marketing",
    });
    let cadence = createOpsCadenceFromThesis(thesis);
    for (const t of cadence.tasks.filter((x) => x.owner === "system")) {
      cadence = completeOpsTask(cadence, t.id, { metric_snapshot: "1" }).cadence;
    }
    const userTask = cadence.tasks.find((t) => t.owner === "user");
    assert.ok(userTask);
    const a = resolveNextAction(
      base({
        plan: null,
        opsCadence: cadence,
        scope: "workspace",
        route: "workspace",
      }),
    );
    assert.equal(a?.id, `ops-user-${userTask.id}`);
    assert.equal(a?.primaryLabel, "Mark done");
    assert.equal(a?.dispatch.type, "open_ops_proof");
  });

  it("hides Lane B while ops user task is still active", () => {
    const thesis = buildCmoIntake({
      project: {
        id: "p1",
        source: { kind: "folder", path: "/p" },
        name: "Acme",
        framework: "Next",
        routes: ["app/page.tsx"],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 10,
      },
      persona: "marketing",
      context: { force_thesis_id: "landing_conversion" },
    });
    let cadence = createOpsCadenceFromThesis(thesis);
    const laneB = createLaneBWorkspaceFromThesis(thesis, { opsCadence: cadence });
    const a = resolveNextAction(
      base({
        plan: null,
        opsCadence: cadence,
        laneBWorkspace: laneB,
        scope: "workspace",
        route: "workspace",
      }),
    );
    assert.ok(a?.id.startsWith("ops-"));

    for (const t of cadence.tasks) {
      const result = completeOpsTask(cadence, t.id, {
        kpi_value: t.owner === "user" ? 10 : undefined,
        note:
          t.owner === "user"
            ? "Logged measurable outcome for the week review gate."
            : "System task shipped — metric_snapshot 42.",
        metric_snapshot: t.owner === "system" ? "42" : undefined,
      });
      cadence = result.cadence;
    }
    const cleared = resolveNextAction(
      base({
        plan: null,
        opsCadence: cadence,
        laneBWorkspace: laneB,
        scope: "workspace",
        route: "workspace",
      }),
    );
    assert.equal(cleared?.id, "cmo-start-next-cycle");
  });

  it("hides Lane C delegate brief while ops queue is active", () => {
    const thesis = buildCmoIntake({
      project: {
        id: "p1",
        source: { kind: "folder", path: "/p" },
        name: "Acme",
        framework: "Next",
        routes: ["app/page.tsx"],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 10,
        readmeSummary: "B2B SaaS for teams.",
      },
      persona: "sales",
      profile: { sales_pipeline_empty: true } as never,
    });
    let cadence = createOpsCadenceFromThesis(thesis);
    const delegateWs = createDelegateWorkspaceFromThesis(thesis, { opsCadence: cadence });
    assert.ok(delegateWs);
    const blocked = resolveNextAction(
      base({
        plan: null,
        opsCadence: cadence,
        delegateWorkspace: delegateWs!,
        scope: "workspace",
        route: "workspace",
      }),
    );
    assert.ok(blocked?.id.startsWith("ops-"));

    for (const t of cadence.tasks) {
      const result = completeOpsTask(cadence, t.id, {
        kpi_value: t.owner === "user" ? 5 : undefined,
        note:
          t.owner === "user"
            ? "Logged measurable outcome for the week review gate."
            : "System task shipped — metric_snapshot 42.",
        metric_snapshot: t.owner === "system" ? "42" : undefined,
      });
      cadence = result.cadence;
    }
    const cleared = resolveNextAction(
      base({
        plan: null,
        opsCadence: cadence,
        delegateWorkspace: delegateWs!,
        scope: "workspace",
        route: "workspace",
      }),
    );
    assert.equal(cleared?.id, "cmo-start-next-cycle");
  });

  it("lets the command surface own CMO daily actions", () => {
    const thesis = buildCmoIntake({
      project: {
        id: "p1",
        source: { kind: "folder", path: "/p" },
        name: "Acme",
        framework: "Next",
        routes: ["app/page.tsx"],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 10,
      },
      persona: "marketing",
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const now = cadence.tasks[0]!;
    const growthControlPlane = {
      binding: { headline: "Distribution is binding", rationale: [], evidence: [] },
      primary_lever: thesis.headline,
      today: {
        what: now.what,
        why: now.why,
        done_when: now.done_when,
        owner: now.owner,
        ops_task_id: now.id,
      },
    } as unknown as GrowthControlPlane;
    const action = resolveNextAction(
      base({
        opsCadence: cadence,
        growthControlPlane,
        route: "workspace",
        scope: "workspace",
      }),
    );
    assert.equal(action ? isCommandSurfaceOwnedAction(action.id) : false, false);
  });

  it("keeps blocking approval visible above the command surface", () => {
    const thesis = buildCmoIntake({
      project: {
        id: "p1",
        source: { kind: "folder", path: "/p" },
        name: "Acme",
        framework: "Next",
        routes: ["app/page.tsx"],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 10,
      },
      persona: "marketing",
    });
    const cadence = createOpsCadenceFromThesis(thesis);
    const now = cadence.tasks[0]!;
    const action = resolveNextAction(
      base({
        opsCadence: cadence,
        growthControlPlane: {
          binding: { headline: "Distribution is binding", rationale: [], evidence: [] },
          primary_lever: thesis.headline,
          today: {
            what: now.what,
            why: now.why,
            done_when: now.done_when,
            owner: now.owner,
            ops_task_id: now.id,
          },
        } as unknown as GrowthControlPlane,
        runNeedsApproval: true,
        route: "workspace",
        scope: "workspace",
      }),
    );
    assert.equal(action?.id, "run-approval");
  });
});

describe("shouldSuppressWorkspaceNextActionBar", () => {
  function thesisCadence() {
    const thesis = buildCmoIntake({
      project: {
        id: "p1",
        source: { kind: "folder", path: "/p" },
        name: "Acme",
        framework: "Next",
        routes: ["app/page.tsx"],
        hasAnalytics: false,
        excludedPaths: [],
        scannedFileCount: 10,
      },
      persona: "marketing",
    });
    return { thesis, cadence: createOpsCadenceFromThesis(thesis) };
  }

  it("suppresses CMO-owned actions on workspace when command surface active", () => {
    const { cadence } = thesisCadence();
    const plane = {
      binding: { headline: "Distribution", rationale: [], evidence: [] },
      primary_lever: "Outreach",
      today: { what: "Ship", why: "why", done_when: "done", owner: "system" },
    } as unknown as GrowthControlPlane;

    const suppressed = shouldSuppressWorkspaceNextActionBar({
      scope: "workspace",
      growthControlPlane: plane,
      opsCadence: cadence,
      action: {
        id: "ops-system-task.1",
        eyebrow: "IDE ships",
        title: "Task",
        reason: "r",
        tone: "accent",
        primaryLabel: "Start",
        dispatch: { type: "run_ops_system_task", taskId: "task.1" },
      },
    });
    assert.equal(suppressed, true);
  });

  it("does not suppress blocking approval actions", () => {
    const { cadence } = thesisCadence();
    const plane = {
      binding: { headline: "Distribution", rationale: [], evidence: [] },
      primary_lever: "Outreach",
      today: { what: "Ship", why: "why", done_when: "done", owner: "system" },
    } as unknown as GrowthControlPlane;

    const action = {
      id: "run-approval",
      eyebrow: "Needs you",
      title: "Approve",
      reason: "r",
      tone: "warn" as const,
      primaryLabel: "Review",
      dispatch: { type: "focus_run" as const },
    };
    assert.equal(isBlockingNextAction(action), true);
    assert.equal(
      shouldSuppressWorkspaceNextActionBar({
        scope: "workspace",
        growthControlPlane: plane,
        opsCadence: cadence,
        action,
      }),
      false,
    );
  });
});
