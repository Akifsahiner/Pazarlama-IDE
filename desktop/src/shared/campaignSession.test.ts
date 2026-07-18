import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyCampaignPhaseEvent,
  appendCampaignAsset,
  appendCampaignRun,
  campaignProgressPercent,
  campaignTimelineStepIndex,
  createCampaignSession,
  hydrateCampaignSessionFromJson,
  allPlanTasksDone,
} from "./campaignSession";
import { emptyProgressSnapshot, computePlanProgress } from "./planProgress";
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
    { id: "t1", day: 1, title: "Hero", dependsOn: [], execution_mode: "repo" },
    { id: "t2", day: 2, title: "Scan", dependsOn: ["t1"], execution_mode: "browser" },
  ],
  contentCalendar: [],
} as unknown as MarketingPlan;

describe("createCampaignSession", () => {
  it("defaults goal from plan horizon", () => {
    const s = createCampaignSession({
      projectId: "proj-1",
      persona: "marketing",
      planHorizon: 30,
    });
    assert.equal(s.goal, "30-day launch");
    assert.equal(s.phase, "intake");
    assert.equal(s.milestones.length, 1);
    assert.equal(s.projectId, "proj-1");
  });
});

describe("applyCampaignPhaseEvent", () => {
  const base = () =>
    createCampaignSession({ projectId: "p1", persona: "marketing", goal: "Q1 outbound" });

  it("plan_generate_start moves intake → planning", () => {
    const next = applyCampaignPhaseEvent(base(), { type: "plan_generate_start" });
    assert.equal(next.phase, "planning");
    assert.ok(next.milestones.some((m) => m.label.includes("Planning")));
  });

  it("plan_generate_success moves to executing with planId", () => {
    const planning = applyCampaignPhaseEvent(base(), { type: "plan_generate_start" });
    const next = applyCampaignPhaseEvent(planning, {
      type: "plan_generate_success",
      planId: "plan-row-1",
    });
    assert.equal(next.phase, "executing");
    assert.equal(next.planId, "plan-row-1");
    assert.ok(next.milestones.some((m) => m.kind === "plan"));
  });

  it("awaiting_apply moves executing → reviewing", () => {
    let s = applyCampaignPhaseEvent(base(), { type: "plan_generate_success", planId: "p1" });
    s = applyCampaignPhaseEvent(s, { type: "awaiting_apply", taskId: "t1" });
    assert.equal(s.phase, "reviewing");
    assert.equal(s.activeTaskId, "t1");
  });

  it("task_done after apply returns to executing", () => {
    let s = applyCampaignPhaseEvent(base(), { type: "plan_generate_success", planId: "p1" });
    s = applyCampaignPhaseEvent(s, { type: "awaiting_apply", taskId: "t1" });
    s = applyCampaignPhaseEvent(s, { type: "task_done", taskId: "t1", allTasksDone: false });
    assert.equal(s.phase, "executing");
    assert.equal(s.activeTaskId, undefined);
  });

  it("task_done when all tasks complete → measuring", () => {
    let s = applyCampaignPhaseEvent(base(), { type: "plan_generate_success", planId: "p1" });
    s = applyCampaignPhaseEvent(s, { type: "task_done", taskId: "t2", allTasksDone: true });
    assert.equal(s.phase, "measuring");
    assert.ok(s.milestones.some((m) => m.kind === "complete"));
  });

  it("log_kpi → measuring", () => {
    let s = applyCampaignPhaseEvent(base(), { type: "plan_generate_success", planId: "p1" });
    s = applyCampaignPhaseEvent(s, { type: "log_kpi" });
    assert.equal(s.phase, "measuring");
    assert.ok(s.milestones.some((m) => m.kind === "kpi"));
  });

  it("cmo_cycle_restart → executing with week milestone", () => {
    let s = applyCampaignPhaseEvent(base(), { type: "log_kpi" });
    assert.equal(s.phase, "measuring");
    s = applyCampaignPhaseEvent(s, {
      type: "cmo_cycle_restart",
      cycleIndex: 2,
      thesisTitle: "Landing conversion",
    });
    assert.equal(s.phase, "executing");
    assert.ok(s.milestones.some((m) => m.label.includes("Week 2")));
  });
});

describe("appendCampaignRun / appendCampaignAsset", () => {
  it("dedupes run and asset ids", () => {
    const s = createCampaignSession({ projectId: "p1", persona: "sales" });
    const r1 = appendCampaignRun(s, "run-a", "t1");
    const r2 = appendCampaignRun(r1, "run-a", "t1");
    assert.equal(r2.runIds.length, 1);
    const a1 = appendCampaignAsset(r2, "asset-1");
    const a2 = appendCampaignAsset(a1, "asset-1");
    assert.equal(a2.assetIds.length, 1);
  });
});

describe("campaignProgressPercent", () => {
  it("uses plan progress when available", () => {
    const s = createCampaignSession({ projectId: "p1", persona: "marketing" });
    const snap = emptyProgressSnapshot(miniPlan);
    snap.byTaskId.t1 = { taskId: "t1", status: "done", updatedAt: new Date().toISOString() };
    snap.computed = computePlanProgress(miniPlan, snap.byTaskId);
    assert.equal(campaignProgressPercent(s, snap), 50);
  });

  it("falls back to phase-based percent", () => {
    const s = createCampaignSession({ projectId: "p1", persona: "marketing" });
    assert.equal(campaignProgressPercent(s, null), 0);
    const planning = applyCampaignPhaseEvent(s, { type: "plan_generate_start" });
    assert.equal(campaignProgressPercent(planning, null), 10);
  });
});

describe("hydrateCampaignSessionFromJson", () => {
  it("round-trips persisted session shape", () => {
    const s = createCampaignSession({ projectId: "p1", persona: "marketing", goal: "Launch" });
    const hydrated = hydrateCampaignSessionFromJson(JSON.parse(JSON.stringify(s)));
    assert.equal(hydrated?.id, s.id);
    assert.equal(hydrated?.goal, "Launch");
    assert.equal(hydrated?.phase, "intake");
  });

  it("rejects invalid payloads", () => {
    assert.equal(hydrateCampaignSessionFromJson(null), null);
    assert.equal(hydrateCampaignSessionFromJson({ id: 1 }), null);
  });
});

describe("allPlanTasksDone", () => {
  it("detects terminal completion", () => {
    const snap = emptyProgressSnapshot(miniPlan);
    assert.equal(allPlanTasksDone(snap), false);
    snap.byTaskId.t1 = { taskId: "t1", status: "done", updatedAt: new Date().toISOString() };
    snap.byTaskId.t2 = { taskId: "t2", status: "done", updatedAt: new Date().toISOString() };
    snap.computed = computePlanProgress(miniPlan, snap.byTaskId);
    assert.equal(allPlanTasksDone(snap), true);
  });
});

describe("campaignTimelineStepIndex", () => {
  it("maps phases to timeline steps", () => {
    assert.equal(campaignTimelineStepIndex("intake"), 0);
    assert.equal(campaignTimelineStepIndex("planning"), 1);
    assert.equal(campaignTimelineStepIndex("executing"), 2);
    assert.equal(campaignTimelineStepIndex("reviewing"), 2);
    assert.equal(campaignTimelineStepIndex("measuring"), 3);
  });
});
