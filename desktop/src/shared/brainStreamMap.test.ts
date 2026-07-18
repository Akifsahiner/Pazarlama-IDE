import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { brainStreamToRunEvent } from "./brainStreamMap";

describe("brainStreamToRunEvent", () => {
  it("maps token with delta", () => {
    const e = brainStreamToRunEvent("r1", { type: "token", text: "hi" }, 1);
    assert.equal(e.type, "agent.message");
    assert.equal(e.payload?.delta, "hi");
    assert.equal((e.payload?.streamEvent as { type: string }).type, "token");
  });

  it("maps decision preserving streamEvent", () => {
    const e = brainStreamToRunEvent(
      "r1",
      {
        type: "decision",
        summary: "Do X",
        decision: {
          diagnosis: "d",
          bottleneck: "b",
          options_compared: [],
          decision: "Do X",
          rationale: "r",
          ready_to_use_assets: [],
          next_steps: [],
          success_metric: { name: "m", target: "t" },
          when_to_reconsider: "w",
          missing_info: [],
        },
      },
      2,
    );
    assert.equal(e.type, "evidence.captured");
    assert.ok(e.payload?.streamEvent);
  });

  it("maps usage", () => {
    const e = brainStreamToRunEvent(
      "r1",
      { type: "usage", tokens_in: 1, tokens_out: 2, cost_cents: 3 },
      3,
    );
    assert.deepEqual(e.payload?.usage, {
      tokens_in: 1,
      tokens_out: 2,
      cost_cents: 3,
    });
  });
});
