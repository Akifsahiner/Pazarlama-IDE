import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildTurnReceipt, formatReceiptLine } from "./turnReceipt.js";

describe("buildTurnReceipt", () => {
  it("formats ask turn with edit action", () => {
    const receipt = buildTurnReceipt({
      turnId: "t1",
      runId: "r1",
      startedAt: Date.now() - 5000,
      answerText: "See apps/console/page.tsx:12 for hero",
      actions: {
        primary: {
          kind: "edit_run",
          goal: "Rewrite hero CTA",
          targetFiles: ["apps/console/page.tsx"],
        },
      },
      costCents: 2,
    });
    assert.ok(receipt.summaryLine.length > 0);
    assert.equal(receipt.primaryAction?.kind, "edit_run");
  });

  it("formats shipped apply receipt", () => {
    const receipt = buildTurnReceipt({
      turnId: "t2",
      runId: "r2",
      applyResult: {
        files: ["apps/console/page.tsx"],
        commitSha: "abc123def456",
        linesAdded: 10,
        linesRemoved: 2,
        branch: "marketing-ide/run-r2",
      },
    });
    receipt.shipped = true;
    const line = formatReceiptLine(receipt);
    assert.match(line, /Shipped 1 file/);
    assert.match(line, /commit abc123d/);
    assert.match(line, /\+10/);
  });
});
