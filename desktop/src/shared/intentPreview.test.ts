import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeResolvedIntent } from "./intentPreview";

describe("describeResolvedIntent", () => {
  it("edit run — Turkish chip", () => {
    const copy = describeResolvedIntent(
      {
        intent: { kind: "start_edit_run", goal: "hero düzelt" },
        source: "heuristic",
        confidence: "medium",
        label: "Run in project",
      },
      "hero düzelt",
    );
    assert.match(copy.chipLabel, /Edit modunda/i);
    assert.equal(copy.sendsAsChat, false);
    assert.equal(copy.needsConfirm, true);
  });

  it("ask_only sends as chat", () => {
    const copy = describeResolvedIntent(
      {
        intent: { kind: "ask_only", message: "What positioning?" },
        source: "heuristic",
        confidence: "low",
      },
      "What positioning?",
    );
    assert.equal(copy.sendsAsChat, true);
    assert.equal(copy.icon, "ask");
  });
});
