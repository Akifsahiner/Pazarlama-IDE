import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RunEvent } from "./types";

/** Pure usage fold — mirrors main/obs/runTrace.aggregateUsageFromEvents for shared tests. */
function aggregateUsageFromEvents(events: RunEvent[]): {
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
} {
  let tokens_in = 0;
  let tokens_out = 0;
  let cost_cents = 0;
  for (const e of events) {
    const u = e.payload?.usage as
      | { tokens_in?: number; tokens_out?: number; cost_cents?: number }
      | undefined;
    if (!u) continue;
    tokens_in += u.tokens_in ?? 0;
    tokens_out += u.tokens_out ?? 0;
    cost_cents += u.cost_cents ?? 0;
  }
  return { tokens_in, tokens_out, cost_cents };
}

describe("aggregateUsageFromEvents", () => {
  it("sums usage payloads", () => {
    const events = [
      {
        id: "1",
        runId: "r",
        seq: 1,
        timestamp: "",
        type: "agent.status",
        title: "u",
        payload: { usage: { tokens_in: 10, tokens_out: 5, cost_cents: 2 } },
      },
      {
        id: "2",
        runId: "r",
        seq: 2,
        timestamp: "",
        type: "run.completed",
        title: "done",
        payload: { usage: { tokens_in: 3, tokens_out: 1, cost_cents: 1 } },
      },
    ] as RunEvent[];
    assert.deepEqual(aggregateUsageFromEvents(events), {
      tokens_in: 13,
      tokens_out: 6,
      cost_cents: 3,
    });
  });
});
