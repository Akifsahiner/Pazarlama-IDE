#!/usr/bin/env node
/**
 * Faz 4 — 8 thesis × apply → receipt matrix eval.
 */
import assert from "node:assert/strict";
import { buildCmoIntake } from "../../desktop/src/shared/cmoIntake.ts";
import { createOpsCadenceFromThesis } from "../../desktop/src/shared/cmoOpsCadence.ts";
import { buildShipReceiptFromApply, shipReceiptToResultChips } from "../../desktop/src/shared/shipReceipt.ts";
import { runShipQualityLint, hasBlockingQualityFinding } from "../../desktop/src/shared/shipQualityLint.ts";
import { shouldBlockTaskComplete } from "../../desktop/src/shared/executionKernelBridge.ts";

const THESIS_IDS = [
  "viral_short_form",
  "founder_social",
  "product_hunt_launch",
  "landing_conversion",
  "seo_content",
  "outbound_sales",
  "community_launch",
  "influencer_partnerships",
];

const project = {
  id: "eval-p1",
  source: { kind: "folder", path: "/p" },
  name: "EvalCo",
  framework: "Next",
  routes: ["app/page.tsx"],
  hasAnalytics: false,
  excludedPaths: [],
  scannedFileCount: 10,
};

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`  ok ${name}`);
}

function fail(name, err) {
  failed += 1;
  console.error(`  FAIL ${name}`, err);
}

for (const thesisId of THESIS_IDS) {
  try {
    const thesis = buildCmoIntake({
      project,
      persona: "marketing",
      context: { force_thesis_id: thesisId },
    });
    assert.equal(thesis.id, thesisId);
    const cadence = createOpsCadenceFromThesis(thesis);
    const systemTask = cadence.tasks.find((t) => t.owner === "system");
    assert.ok(systemTask);

    const receipt = buildShipReceiptFromApply({
      runId: `run-${thesisId}`,
      commitSha: "abc1234567890",
      filesApplied: ["src/app/page.tsx"],
      linesAdded: 8,
      linesRemoved: 2,
      previewUrl: "http://localhost:3000",
    });
    const chips = shipReceiptToResultChips(receipt);
    assert.ok(chips.length >= 3, `${thesisId}: min 3 chips`);

    if (thesisId === "landing_conversion") {
      const lint = runShipQualityLint({ thesisId, after: { metaTitle: "Acme" } });
      assert.ok(hasBlockingQualityFinding(lint));
      const block = shouldBlockTaskComplete({
        task: { ...systemTask, expected_proof_kind: "browser_evidence" },
      });
      assert.ok(block.blocked);
    }

    ok(`${thesisId} apply → receipt`);
  } catch (err) {
    fail(`${thesisId} apply → receipt`, err);
  }
}

console.log(`\nship-receipt-matrix\n  ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
