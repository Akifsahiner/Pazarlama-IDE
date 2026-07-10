import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  intentRequiresConfirm,
  quickActionToIntent,
  resolveIntent,
  surfaceActionToIntent,
} from "./conversationIntent";
import { handoffFromResolved } from "./workspaceHandoff";
import { emptyProgressSnapshot } from "./planProgress";
import type { MarketingPlan } from "./types";

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
      title: "Fix hero CTA",
      dependsOn: [],
      execution_mode: "repo",
    },
    {
      id: "t2",
      day: 2,
      title: "Scan competitors",
      dependsOn: ["t1"],
      execution_mode: "browser",
    },
    {
      id: "t3",
      day: 3,
      title: "Ship newsletter",
      dependsOn: ["t2"],
      execution_mode: "repo",
    },
  ],
  contentCalendar: [],
} as unknown as MarketingPlan;

describe("resolveIntent — ui priority", () => {
  it("uiIntent wins over heuristics", () => {
    const r = resolveIntent({
      uiIntent: { kind: "generate_plan" },
      message: "hero copy düzelt",
    });
    assert.equal(r?.intent.kind, "generate_plan");
    assert.equal(r?.source, "ui");
  });
});

describe("resolveIntent — quick actions", () => {
  it("launch → start_edit_run", () => {
    const r = resolveIntent({ quickActionId: "launch" });
    assert.equal(r?.intent.kind, "start_edit_run");
    assert.equal(r?.source, "quick_action");
  });

  it("competitors → start_browser_task", () => {
    const r = resolveIntent({ quickActionId: "competitors" });
    assert.equal(r?.intent.kind, "start_browser_task");
  });

  it("plan → generate_plan", () => {
    const r = resolveIntent({ quickActionId: "plan" });
    assert.equal(r?.intent.kind, "generate_plan");
  });
});

describe("resolveIntent — suggested_mode", () => {
  it("suggested_mode edit → start_edit_run", () => {
    const r = resolveIntent({
      suggestedMode: "edit",
      message: "Update the hero headline",
      suggestedModeReason: "Needs file edits.",
    });
    assert.equal(r?.intent.kind, "start_edit_run");
    assert.equal(r?.source, "suggested_mode");
    if (r?.intent.kind === "start_edit_run") {
      assert.match(r.intent.goal, /hero headline/i);
    }
  });

  it("suggested_mode browse → start_browser_task", () => {
    const r = resolveIntent({
      suggestedMode: "browse",
      message: "Check competitor pricing pages",
    });
    assert.equal(r?.intent.kind, "start_browser_task");
    assert.equal(r?.source, "suggested_mode");
  });
});

describe("resolveIntent — decision card", () => {
  it("next_steps project owner → start_edit_run", () => {
    const r = resolveIntent({
      decision: {
        diagnosis: "Hero weak",
        bottleneck: "conversion",
        options_compared: [],
        decision: "Rewrite hero",
        rationale: "CTA unclear",
        ready_to_use_assets: [],
        next_steps: [{ step: "Update hero copy in app/page.tsx", owner: "project" }],
        success_metric: { name: "ctr", target: "5%" },
        when_to_reconsider: "2w",
        missing_info: [],
      },
      planTaskId: "t1",
    });
    assert.equal(r?.intent.kind, "start_edit_run");
    assert.equal(r?.source, "decision");
  });

  it("ready_to_use_assets with target file → integrate edit run", () => {
    const r = resolveIntent({
      decision: {
        diagnosis: "d",
        bottleneck: "b",
        options_compared: [],
        decision: "Ship copy",
        rationale: "r",
        ready_to_use_assets: [
          {
            kind: "copy",
            title: "Hero v2",
            content: "New headline here",
            suggested_target_file: "app/page.tsx",
          },
        ],
        next_steps: [],
        success_metric: { name: "x", target: "y" },
        when_to_reconsider: "z",
        missing_info: [],
      },
    });
    assert.equal(r?.intent.kind, "start_edit_run");
    if (r?.intent.kind === "start_edit_run") {
      assert.match(r.intent.goal, /app\/page\.tsx/);
    }
  });
});

describe("resolveIntent — heuristics", () => {
  it("hero copy düzelt → start_edit_run", () => {
    const r = resolveIntent({ message: "hero copy düzelt lütfen" });
    assert.equal(r?.intent.kind, "start_edit_run");
    assert.equal(r?.source, "heuristic");
  });

  it("sıradaki görev → run_next_plan_task", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    snap.byTaskId.t1 = { taskId: "t1", status: "done" };
    const r = resolveIntent({
      message: "sıradaki görevi çalıştır",
      plan: miniPlan,
      planProgress: snap,
    });
    assert.equal(r?.intent.kind, "run_next_plan_task");
  });

  it("next task with plan resolves run_next_plan_task when pending t1", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    const r = resolveIntent({
      message: "run next task",
      plan: miniPlan,
      planProgress: snap,
    });
    assert.equal(r?.intent.kind, "run_next_plan_task");
  });

  it("generate plan keyword", () => {
    const r = resolveIntent({ message: "generate plan for this product" });
    assert.equal(r?.intent.kind, "generate_plan");
  });

  it("preview plan keyword", () => {
    const r = resolveIntent({ message: "preview plan outline" });
    assert.equal(r?.intent.kind, "preview_plan");
  });

  it("research competitors → browser", () => {
    const r = resolveIntent({ message: "research competitors in browser" });
    assert.equal(r?.intent.kind, "start_browser_task");
  });

  it("apply pending with run id", () => {
    const r = resolveIntent({
      message: "apply changes now",
      activeRunId: "run-1",
      planTaskId: "t1",
    });
    assert.equal(r?.intent.kind, "apply_pending");
    if (r?.intent.kind === "apply_pending") assert.equal(r.intent.runId, "run-1");
  });

  it("log kpi keyword", () => {
    const r = resolveIntent({ message: "log kpi for waitlist" });
    assert.equal(r?.intent.kind, "log_kpi");
  });

  it("generic question → ask_only", () => {
    const r = resolveIntent({ message: "What positioning should we use?" });
    assert.equal(r?.intent.kind, "ask_only");
    assert.equal(r?.confidence, "low");
  });
});

describe("resolveIntent — awaiting_apply", () => {
  it("apply keyword + awaiting task uses apply_pending", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    snap.byTaskId.t1 = {
      taskId: "t1",
      status: "awaiting_apply",
      lastRunId: "run-abc",
    };
    const r = resolveIntent({
      message: "apply changes to complete",
      plan: miniPlan,
      planProgress: snap,
      activeRunId: "run-live",
    });
    assert.equal(r?.intent.kind, "apply_pending");
    assert.equal(r?.source, "awaiting_apply");
  });
});

describe("resolveIntent — NL plan commands", () => {
  it("day 3 → run_plan_task for first actionable on day 3", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    snap.byTaskId.t1 = { taskId: "t1", status: "done" };
    snap.byTaskId.t2 = { taskId: "t2", status: "done" };
    const r = resolveIntent({
      message: "run day 3",
      plan: miniPlan,
      planProgress: snap,
    });
    assert.equal(r?.intent.kind, "run_plan_task");
    if (r?.intent.kind === "run_plan_task") assert.equal(r.intent.taskId, "t3");
  });

  it("gün 3 → run_plan_task", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    snap.byTaskId.t1 = { taskId: "t1", status: "done" };
    snap.byTaskId.t2 = { taskId: "t2", status: "done" };
    const r = resolveIntent({
      message: "gün 3 yap",
      plan: miniPlan,
      planProgress: snap,
    });
    assert.equal(r?.intent.kind, "run_plan_task");
    if (r?.intent.kind === "run_plan_task") assert.equal(r.intent.taskId, "t3");
  });

  it("gün 1'i çalıştır → run_plan_task t1", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    const r = resolveIntent({
      message: "gün 1'i çalıştır",
      plan: miniPlan,
      planProgress: snap,
    });
    assert.equal(r?.intent.kind, "run_plan_task");
    if (r?.intent.kind === "run_plan_task") assert.equal(r.intent.taskId, "t1");
  });

  it("planı üret → generate_plan", () => {
    const r = resolveIntent({ message: "planı üret lütfen" });
    assert.equal(r?.intent.kind, "generate_plan");
  });

  it("outline göster → preview_plan", () => {
    const r = resolveIntent({ message: "outline göster" });
    assert.equal(r?.intent.kind, "preview_plan");
  });

  it("TikTok ekle → revise_plan when plan exists", () => {
    const r = resolveIntent({
      message: "TikTok ekle plana",
      plan: {
        id: "p1",
        positioning: "x",
        icp: "y",
        readiness: [],
        taskGraph: [],
        contentCalendar: [],
        strategyNote: "z",
      },
    });
    assert.equal(r?.intent.kind, "revise_plan");
    if (r?.intent.kind === "revise_plan") assert.match(r.intent.instruction, /TikTok/i);
  });
});

describe("resolveIntent — record_experiment", () => {
  it("bu testi kaydet → record_experiment", () => {
    const r = resolveIntent({ message: "bu testi kaydet" });
    assert.equal(r?.intent.kind, "record_experiment");
    assert.equal(r?.source, "heuristic");
    assert.equal(r?.confidence, "high");
  });
});

describe("helpers", () => {
  it("quickActionToIntent returns intent", () => {
    assert.equal(quickActionToIntent("icp")?.kind, "start_edit_run");
  });

  it("surfaceActionToIntent maps browser_research", () => {
    assert.equal(surfaceActionToIntent("browser_research")?.kind, "start_browser_task");
  });

  it("intentRequiresConfirm for edit and integrate", () => {
    assert.equal(intentRequiresConfirm({ kind: "start_edit_run", goal: "x" }), true);
    assert.equal(intentRequiresConfirm({ kind: "integrate_asset", assetId: "a1" }), true);
    assert.equal(intentRequiresConfirm({ kind: "start_browser_task", goal: "x" }), false);
  });

  it("handoffFromResolved builds execute_intent banner", () => {
    const h = handoffFromResolved({
      intent: { kind: "start_edit_run", goal: "Fix hero" },
      source: "suggested_mode",
      confidence: "high",
      label: "Run in project",
    });
    assert.equal(h?.primaryAction, "execute_intent");
    assert.equal(h?.requireAcknowledge, true);
  });
});
