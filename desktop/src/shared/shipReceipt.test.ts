import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildShipReceiptFromApply,
  enrichShipReceiptWithVerify,
  shipReceiptToResultChips,
} from "./shipReceipt";

describe("shipReceipt", () => {
  it("builds receipt from apply payload", () => {
    const receipt = buildShipReceiptFromApply({
      runId: "run-1",
      commitSha: "abc123def456",
      filesApplied: ["src/app/page.tsx", "src/app/layout.tsx"],
      linesAdded: 12,
      linesRemoved: 3,
      previewUrl: "http://localhost:3000",
    });
    assert.equal(receipt.runId, "run-1");
    assert.equal(receipt.filesChanged, 2);
    assert.equal(receipt.verifyStatus, "pending");
    const chips = shipReceiptToResultChips(receipt);
    assert.ok(chips.some((c) => c.id === "receipt-commit"));
    assert.ok(chips.some((c) => c.id === "receipt-files"));
    assert.ok(chips.some((c) => c.id === "receipt-lines"));
  });

  it("enriches with verify pass and live URL", () => {
    const base = buildShipReceiptFromApply({
      runId: "run-1",
      filesApplied: ["page.tsx"],
      previewUrl: "http://localhost:3000",
    });
    const enriched = enrichShipReceiptWithVerify(
      base,
      {
        run_id: "verify-1",
        url: "http://localhost:3000",
        validations: [{ label: "Hero CTA visible", passed: true }],
        verified_at: new Date().toISOString(),
      },
      true,
    );
    assert.equal(enriched.verifyStatus, "passed");
    assert.equal(enriched.liveUrl, "http://localhost:3000");
    const chips = shipReceiptToResultChips(enriched);
    assert.ok(chips.some((c) => c.id === "receipt-live-url"));
  });
});
