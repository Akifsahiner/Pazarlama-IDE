#!/usr/bin/env node
/**
 * Faz 5 — 8 thesis × human execution asset bind matrix eval.
 */
import assert from "node:assert/strict";
import { buildCmoIntake } from "../../desktop/src/shared/cmoIntake.ts";
import { createOpsCadenceFromThesis } from "../../desktop/src/shared/cmoOpsCadence.ts";
import { createLaneBWorkspaceFromThesis } from "../../desktop/src/shared/cmoLaneB.ts";
import { createDistributionOperatorFromThesis } from "../../desktop/src/shared/cmoDistributionOperator.ts";
import { createInfluencerOperatorFromThesis } from "../../desktop/src/shared/cmoInfluencerOperator.ts";
import { bindHumanExecutionForCadence } from "../../desktop/src/shared/cmoHumanExecutionBind.ts";
import { validatePostedUrl } from "../../desktop/src/shared/humanProofProgress.ts";
import { resolveCurrentRunbookStep } from "../../desktop/src/shared/cmoLaneB.ts";

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
      persona: thesisId === "outbound_sales" ? "sales" : "marketing",
      context: { force_thesis_id: thesisId },
    });
    assert.equal(thesis.id, thesisId);
    const cadence = createOpsCadenceFromThesis(thesis);
    const laneB = createLaneBWorkspaceFromThesis(thesis, { opsCadence: cadence });
    let distributionOperator;
    let influencerOperator;
    if (thesisId === "viral_short_form" || thesisId === "founder_social") {
      distributionOperator = createDistributionOperatorFromThesis(thesis, { week_index: 1 });
    }
    if (thesisId === "influencer_partnerships") {
      influencerOperator = createInfluencerOperatorFromThesis(thesis, { week_index: 1 });
    }

    const result = bindHumanExecutionForCadence({
      cadence,
      thesis,
      laneB,
      distributionOperator,
      influencerOperator,
      projectName: project.name,
    });

    const humanTasks = result.cadence.tasks.filter(
      (t) => t.owner === "user" || t.owner === "delegate",
    );
    assert.ok(humanTasks.length > 0, `${thesisId}: human tasks`);
    for (const task of humanTasks) {
      assert.ok(task.human_execution_ref, `${thesisId}: ref on ${task.id}`);
      assert.ok(task.human_execution_asset, `${thesisId}: asset on ${task.id}`);
      assert.ok(
        task.human_execution_asset.copy_blocks.length > 0,
        `${thesisId}: copy_blocks on ${task.id}`,
      );
    }

    if (thesisId === "viral_short_form" && distributionOperator) {
      const asset = humanTasks[0]?.human_execution_asset;
      assert.ok((asset?.hook_grid_count ?? 0) >= 1, "viral hook grid");
    }

    if (thesisId === "outbound_sales") {
      const asset = humanTasks[0]?.human_execution_asset;
      assert.ok(asset?.honesty_note?.includes("email"), "outbound honesty note");
    }

    if (thesisId === "product_hunt_launch") {
      const step = resolveCurrentRunbookStep(laneB);
      assert.ok(step?.runbook_offset, "PH runbook step");
    }

    const urlGate = validatePostedUrl("https://example.com/post");
    assert.ok(urlGate.ok, "progressive URL gate");

    ok(`${thesisId} human asset bind`);
  } catch (err) {
    fail(`${thesisId} human asset bind`, err);
  }
}

console.log(`\nhuman-lane-matrix\n  ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
