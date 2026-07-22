import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lintHumanOpsTaskDoneWhen, lintHumanPostedProof } from "./humanExecutionContractLint";

describe("humanExecutionContractLint", () => {
  it("blocks generic post on social done_when", () => {
    const findings = lintHumanOpsTaskDoneWhen({
      id: "t1",
      owner: "user",
      what: "Post",
      why: "",
      done_when: "Post on social media",
      status: "pending",
      priority_index: 0,
      day_slot: "now",
    });
    assert.ok(findings.some((f) => f.severity === "block"));
  });

  it("rejects I posted without URL", () => {
    const findings = lintHumanPostedProof({ note: "I posted" });
    assert.ok(findings.some((f) => f.id === "posted-without-url"));
  });
});
