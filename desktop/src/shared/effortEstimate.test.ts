import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  estimateDecisionEffort,
  estimatePlanEffort,
  estimateProfileEffortHint,
  formatEffortMinutes,
  parseTacticPhaseDay,
  peakLaunchDayFromTasks,
  taskEffortMinutes,
} from "./effortEstimate.js";
import type { MarketingDecision, MarketingPlan } from "./types.js";

const plan: MarketingPlan = {
  id: "p1",
  positioning: "",
  icp: "",
  readiness: [],
  taskGraph: [
    {
      id: "t1",
      title: "Map communities",
      dependsOn: [],
      day: 1,
      execution_mode: "browser",
      playbookId: "community-launch",
    },
    {
      id: "t2",
      title: "Ship comparison page",
      dependsOn: ["t1"],
      day: 7,
      execution_mode: "repo",
      phaseLabel: "T-7",
      playbookId: "seo-foundation",
    },
    {
      id: "t3",
      title: "Show HN submit",
      dependsOn: ["t2"],
      day: 14,
      execution_mode: "browser",
      phaseLabel: "H0",
      playbookId: "community-launch",
    },
    {
      id: "t4",
      title: "Launch email wave 1",
      dependsOn: ["t3"],
      day: 14,
      execution_mode: "asset",
      phaseLabel: "H0",
      playbookId: "email-nurture",
    },
  ],
  contentCalendar: [],
  strategyNote: "",
  playbooks: [],
};

const decision: MarketingDecision = {
  diagnosis: "No distribution yet",
  bottleneck: "Cold start",
  honest_ceiling: "Top 5 PH day, not #1",
  tactic_stack: [
    { id: "community-map", phase: "T-7", action: "Map 5 communities", metric: "list size" },
    { id: "show-hn", phase: "H0", action: "Submit Show HN", metric: "comments" },
    { id: "launch-email", phase: "H0", action: "Send launch email", metric: "CTR" },
  ],
  options_compared: [],
  decision: "Community-first launch",
  rationale: "ICP lives on HN",
  ready_to_use_assets: [],
  next_steps: [{ step: "Draft Show HN title", owner: "founder", eta: "today" }],
  success_metric: { name: "signups", target: "50" },
  when_to_reconsider: "If <10 signups D+3",
  missing_info: [],
  recommended_aggression: "aggressive",
};

describe("taskEffortMinutes", () => {
  it("boosts launch-hour tasks", () => {
    const h0 = taskEffortMinutes(plan.taskGraph[2]!);
    const normal = taskEffortMinutes(plan.taskGraph[0]!);
    assert.ok(h0 > normal);
  });
});

describe("estimatePlanEffort", () => {
  it("returns label with horizon and remaining time", () => {
    const est = estimatePlanEffort(plan, {
      byTaskId: { t1: { status: "done" } },
      nextTaskId: "t2",
    });
    assert.equal(est.horizonDays, 14);
    assert.ok(est.remainingMinutes > 0);
    assert.ok(est.label.includes("14d"));
    assert.ok(est.nextTaskMinutes === taskEffortMinutes(plan.taskGraph[1]!));
  });

  it("flags peak launch day when multiple H0 tasks stack", () => {
    const est = estimatePlanEffort(plan);
    assert.ok(est.peakDay);
    assert.equal(est.peakDay!.day, 14);
    assert.ok(est.peakDay!.minutes >= 90);
    assert.ok(est.peakDay!.warning?.includes("Day 14"));
    assert.ok(est.label.includes("peak D14"));
  });
});

describe("peakLaunchDayFromTasks", () => {
  it("returns busiest day with warning above threshold", () => {
    const peak = peakLaunchDayFromTasks(plan.taskGraph);
    assert.equal(peak?.day, 14);
    assert.ok(peak!.taskCount >= 2);
    assert.ok(peak!.warning);
  });
});

describe("parseTacticPhaseDay", () => {
  it("maps phase labels relative to launch day", () => {
    assert.equal(parseTacticPhaseDay("T-7", 14), 7);
    assert.equal(parseTacticPhaseDay("H0", 14), 14);
    assert.equal(parseTacticPhaseDay("D+1", 14), 15);
  });
});

describe("estimateDecisionEffort", () => {
  it("infers peak day from tactic stack when no plan", () => {
    const est = estimateDecisionEffort(decision, { daysUntilLaunch: 14 });
    assert.ok(est.peakDay);
    assert.equal(est.peakDay!.day, 14);
    assert.ok(est.label.includes("execute stack"));
    assert.equal(est.intensity, "standard");
  });

  it("delegates to plan effort when plan exists", () => {
    const est = estimateDecisionEffort(decision, { plan });
    assert.equal(est.horizonDays, 14);
    assert.equal(est.peakDay?.day, 14);
  });
});

describe("estimateProfileEffortHint", () => {
  it("uses launch runway when provided", () => {
    assert.match(estimateProfileEffortHint(14), /14d/);
  });
});

describe("formatEffortMinutes", () => {
  it("formats hours and minutes", () => {
    assert.equal(formatEffortMinutes(45), "45m");
    assert.equal(formatEffortMinutes(90), "1h 30m");
  });
});
