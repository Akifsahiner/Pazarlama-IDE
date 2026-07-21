import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChannelThesis } from "./cmoIntake";
import { resolveWeek1PreviewTasks, week1OwnerBadge } from "./week1Preview";

function thesis(overrides: Partial<ChannelThesis> = {}): ChannelThesis {
  return {
    id: "landing_conversion",
    title: "Landing conversion",
    headline: "Fix the funnel",
    verdict: "marketable",
    verdict_reason: "ok",
    primary_bottleneck: "conversion",
    rationale: ["a"],
    week1_priorities: [
      { id: "t1", what: "Ship hero", why: "w", done_when: "d", owner: "system" },
      { id: "t2", what: "Post proof", why: "w", done_when: "d", owner: "user" },
    ],
    lane_a: [],
    lane_b: [],
    deprioritize: [],
    primary_playbook_ids: [],
    signals: {},
    draft: true,
    generated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("week1Preview", () => {
  it("marks tasks generic before seal", () => {
    const result = resolveWeek1PreviewTasks(thesis(), false);
    assert.equal(result.generic, true);
    assert.equal(result.tasks.length, 2);
  });

  it("marks tasks personalized after seal", () => {
    const result = resolveWeek1PreviewTasks(
      thesis({ draft: false, week1_priorities: [{ id: "m1", what: "Mechanism task", why: "w", done_when: "d", owner: "system" }] }),
      true,
    );
    assert.equal(result.generic, false);
    assert.equal(result.tasks[0]?.what, "Mechanism task");
  });

  it("caps preview at 5 tasks", () => {
    const priorities = Array.from({ length: 7 }, (_, i) => ({
      id: `t${i}`,
      what: `Task ${i}`,
      why: "w",
      done_when: "d",
      owner: "system" as const,
    }));
    const result = resolveWeek1PreviewTasks(thesis({ week1_priorities: priorities }), true);
    assert.equal(result.tasks.length, 5);
  });

  it("maps owner badges", () => {
    assert.equal(week1OwnerBadge("system"), "IDE");
    assert.equal(week1OwnerBadge("user"), "You");
    assert.equal(week1OwnerBadge("delegate"), "Delegate");
  });
});
