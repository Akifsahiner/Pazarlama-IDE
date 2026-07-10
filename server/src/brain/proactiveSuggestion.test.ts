import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildProactiveSuggestion } from "./proactiveSuggestion.js";

describe("buildProactiveSuggestion", () => {
  it("apply_complete suggests next plan task", () => {
    const s = buildProactiveSuggestion(
      {
        proactive_trigger: "apply_complete",
        last_run_summary: "Applied 2 files.",
        plan_progress: { done: 1, total: 10, next_task_title: "Day 2 · Hero CTA" },
      },
      {
        done: 1,
        total: 10,
        nextTaskTitle: "Day 2 · Hero CTA",
        nextTaskId: "t2",
        nextPlaybookId: "landing",
      },
    );
    assert.equal(s.source, "apply_complete");
    assert.match(s.title, /Day 2/i);
    assert.equal(s.action?.kind, "continue_plan");
    assert.equal(s.action?.taskId, "t2");
  });

  it("measuring_phase suggests KPI log", () => {
    const s = buildProactiveSuggestion({
      proactive_trigger: "measuring_phase",
      campaign_phase: "measuring",
    });
    assert.equal(s.source, "measuring_phase");
    assert.match(s.title, /KPI/i);
    assert.equal(s.action?.kind, "log_kpi");
  });

  it("plan_task_done with all tasks complete", () => {
    const s = buildProactiveSuggestion(
      { proactive_trigger: "plan_task_done", plan_progress: { done: 10, total: 10 } },
      { done: 10, total: 10 },
    );
    assert.match(s.title, /complete/i);
    assert.equal(s.action?.kind, "log_kpi");
  });
});
