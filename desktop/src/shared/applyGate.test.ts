import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RunEvent } from "./types";
import { evaluateApplyGate, latestValidationFromEvents } from "./applyGate";

function validationCompleted(
  checks: { label: string; status: "success" | "failed" }[],
  status: "success" | "failed" = "success",
): RunEvent {
  return {
    id: "ev-val",
    runId: "r1",
    seq: 1,
    timestamp: new Date().toISOString(),
    type: "file.validation_completed",
    status,
    title: "Validation",
    payload: { checks },
  };
}

describe("applyGate", () => {
  it("blocks apply when validation never ran", () => {
    const gate = evaluateApplyGate({ events: [] });
    assert.equal(gate.blocked, true);
    assert.match(gate.reason ?? "", /Run validation/i);
  });

  it("blocks apply when validation failed", () => {
    const gate = evaluateApplyGate({
      events: [validationCompleted([{ label: "TypeScript", status: "failed" }], "failed")],
    });
    assert.equal(gate.blocked, true);
    assert.equal(gate.validationFailed, true);
  });

  it("allows apply when validation passed", () => {
    const gate = evaluateApplyGate({
      events: [
        validationCompleted([
          { label: "TypeScript", status: "success" },
          { label: "Lint", status: "success" },
        ]),
      ],
    });
    assert.equal(gate.blocked, false);
    assert.equal(gate.validationPassed, true);
  });

  it("allows explicit override after failed validation", () => {
    const gate = evaluateApplyGate({
      events: [validationCompleted([{ label: "Lint", status: "failed" }], "failed")],
      validationOverride: true,
    });
    assert.equal(gate.blocked, false);
  });

  it("latestValidationFromEvents reads most recent completion", () => {
    const events: RunEvent[] = [
      validationCompleted([{ label: "TypeScript", status: "failed" }], "failed"),
      validationCompleted([{ label: "TypeScript", status: "success" }]),
    ];
    const latest = latestValidationFromEvents(events);
    assert.equal(latest?.passed, true);
  });
});
