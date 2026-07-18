import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { agentEventToRunEvent, resetAgentEventSeq } from "./agentEventMap";

describe("agentEventToRunEvent", () => {
  it("maps token to agent.message", () => {
    resetAgentEventSeq();
    const e = agentEventToRunEvent("r1", { type: "token", text: "hi" });
    assert.ok(e);
    assert.equal(e!.type, "agent.message");
    assert.equal(e!.payload?.delta, "hi");
  });

  it("maps tool start/done", () => {
    const start = agentEventToRunEvent("r1", {
      type: "tool",
      name: "Read",
      status: "start",
    });
    assert.equal(start!.type, "tool.started");
    const done = agentEventToRunEvent("r1", {
      type: "tool",
      name: "Read",
      status: "done",
      detail: "ok",
    });
    assert.equal(done!.type, "tool.completed");
  });

  it("maps error to run.failed", () => {
    const e = agentEventToRunEvent("r1", { type: "error", message: "boom" });
    assert.equal(e!.type, "run.failed");
    assert.equal(e!.summary, "boom");
  });
});
