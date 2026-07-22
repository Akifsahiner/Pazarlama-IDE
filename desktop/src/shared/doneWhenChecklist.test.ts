import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDoneWhenChecklist, countIncompleteRequiredItems } from "./doneWhenChecklist";
import { buildShipReceiptFromApply } from "./shipReceipt";

describe("doneWhenChecklist", () => {
  it("marks diff applied when receipt has commit", () => {
    const receipt = buildShipReceiptFromApply({
      runId: "r1",
      commitSha: "abc",
      filesApplied: ["page.tsx"],
    });
    const items = buildDoneWhenChecklist(
      {
        id: "t1",
        priority_index: 0,
        what: "Ship hero",
        why: "w",
        owner: "system",
        done_when: "Hero CTA visible · Live URL verified",
        status: "in_progress",
        day_slot: "now",
      },
      null,
      { shipReceipt: receipt },
    );
    const applied = items.find((i) => i.id === "diff-applied");
    assert.equal(applied?.status, "done");
    assert.equal(countIncompleteRequiredItems(items) > 0, true);
  });
});
