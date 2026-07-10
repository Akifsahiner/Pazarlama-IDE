import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAgentTurnContext } from "./agentTurnContext";
import { draftQualityTone } from "./decisionQuality";

describe("buildAgentTurnContext", () => {
  it("returns undefined when no enrichment data", () => {
    assert.equal(buildAgentTurnContext({}), undefined);
  });

  it("includes campaign phase and plan progress", () => {
    const ctx = buildAgentTurnContext({
      campaignSession: {
        id: "c1",
        projectId: "p1",
        goal: "30-day launch",
        persona: "marketing",
        startedAt: new Date().toISOString(),
        phase: "executing",
        milestones: [],
        runIds: [],
        assetIds: [],
      },
      planProgress: {
        planId: "plan-1",
        byTaskId: {},
        computed: {
          done: 2,
          total: 10,
          terminal: 2,
          failed: 0,
          skipped: 0,
          running: 0,
          awaiting: 0,
          weekDone: {},
          weekTotal: {},
          playbookDone: {},
          byPlaybookId: {},
        },
      },
      proactive_trigger: "apply_complete",
    });
    assert.equal(ctx?.campaign_phase, "executing");
    assert.equal(ctx?.plan_progress?.done, 2);
    assert.equal(ctx?.proactive_trigger, "apply_complete");
  });
});

describe("draftQualityTone", () => {
  it("maps draft scores to tones", () => {
    assert.equal(draftQualityTone(30, true), "ok");
    assert.equal(draftQualityTone(24, false), "accent");
    assert.equal(draftQualityTone(18, false), "warn");
  });
});
