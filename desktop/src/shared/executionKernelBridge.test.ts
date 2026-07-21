import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finalizeVerifyRun, planVerifyAfterApply, shouldBlockTaskComplete } from "./executionKernelBridge";
import { buildShipReceiptFromApply } from "./shipReceipt";

describe("executionKernelBridge", () => {
  it("plans verify when browse available", () => {
    const plan = planVerifyAfterApply({
      previewUrl: "http://localhost:3000",
      canBrowse: true,
      task: {
        id: "t1",
        priority_index: 0,
        what: "Ship hero",
        why: "w",
        owner: "system",
        done_when: "Live URL verified",
        status: "in_progress",
        day_slot: "now",
      },
    });
    assert.ok(plan?.shouldSchedule);
  });

  it("finalize verify marks receipt passed", () => {
    const receipt = buildShipReceiptFromApply({
      runId: "r1",
      filesApplied: ["page.tsx"],
      previewUrl: "http://localhost:3000",
    });
    const result = finalizeVerifyRun({
      receipt,
      runId: "verify-1",
      url: "http://localhost:3000",
      report: { validations: [{ label: "Hero CTA visible", passed: true }] },
    });
    assert.equal(result.passed, true);
    assert.equal(result.pipelineEvent, "verify.completed");
  });

  it("blocks complete without browser evidence", () => {
    const block = shouldBlockTaskComplete({
      task: {
        id: "t1",
        priority_index: 0,
        what: "Ship",
        why: "w",
        owner: "system",
        done_when: "Live URL in repo",
        status: "in_progress",
        day_slot: "now",
        expected_proof_kind: "browser_evidence",
      },
    });
    assert.equal(block.blocked, true);
  });
});
