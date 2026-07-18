import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildContextBudget,
  compactPlanSnapshot,
  estimateTokens,
  trimHistoryToBudget,
} from "./contextBudget.js";

describe("contextBudget", () => {
  it("estimates tokens from chars", () => {
    assert.equal(estimateTokens("abcd"), 1);
    assert.equal(estimateTokens("abcdefgh"), 2);
  });

  it("builds budget segments", () => {
    const budget = buildContextBudget({
      message: "hello world",
      history: [{ role: "user", content: "a".repeat(400) }],
      systemEstimate: 1000,
      limit: 10_000,
    });
    assert.ok(budget.used > 1000);
    assert.equal(budget.limit, 10_000);
    assert.ok(budget.segments.some((s) => s.id === "history"));
  });

  it("trims oldest history first", () => {
    const history = [
      { role: "user", content: "x".repeat(400) },
      { role: "assistant", content: "y".repeat(400) },
      { role: "user", content: "z".repeat(40) },
    ];
    const trimmed = trimHistoryToBudget(history, 50);
    assert.equal(trimmed.length, 1);
    assert.equal(trimmed[0]?.content, "z".repeat(40));
  });

  it("compacts plan snapshots", () => {
    const compact = compactPlanSnapshot({
      id: "p1",
      thesis: "t".repeat(800),
      playbooks: [
        {
          id: "a",
          title: "A",
          tasks: Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, title: `T${i}` })),
        },
      ],
    }) as { thesis: string; playbooks: { tasks: unknown[] }[] };
    assert.ok(compact.thesis.length <= 400);
    assert.equal(compact.playbooks[0]?.tasks.length, 5);
  });
});
