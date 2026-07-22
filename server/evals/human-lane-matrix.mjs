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
import {
  canAdvanceToMetrics,
  validatePostedUrl,
} from "../../desktop/src/shared/humanProofProgress.ts";
import { resolveCurrentRunbookStep } from "../../desktop/src/shared/cmoLaneB.ts";
import { RUNBOOK_COPY_BLOCKS } from "../../desktop/src/shared/humanExecutionRunbookCopy.ts";

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
      const postSlots = distributionOperator.slots.filter((s) => s.slot_kind === "post");
      assert.ok(postSlots.length >= 20, "viral post slot count");
      const asset = humanTasks.find((t) => t.human_execution_asset?.kind === "distribution_slot")
        ?.human_execution_asset ?? humanTasks[0]?.human_execution_asset;
      assert.ok((asset?.hook_grid_count ?? 0) >= 20, "viral hook grid count");
      assert.ok((asset?.hook_grid_rows?.length ?? 0) >= 20, "viral hook grid rows on asset");
    }

    if (thesisId === "outbound_sales") {
      const asset = humanTasks[0]?.human_execution_asset;
      assert.ok(asset?.honesty_note?.includes("email"), "outbound honesty note");
      assert.ok(asset?.copy_blocks.length >= 3, "outbound 3-email sequence");
      assert.ok((asset?.outreach_targets?.length ?? 0) >= 1, "outbound targets");
    }

    if (thesisId === "product_hunt_launch") {
      const step = resolveCurrentRunbookStep(laneB);
      assert.ok(step?.runbook_offset, "PH runbook step");
      const runbookAsset = humanTasks.find((t) => t.human_execution_asset?.kind === "launch_runbook")
        ?.human_execution_asset;
      if (runbookAsset) {
        assert.ok((runbookAsset.runbook_steps?.length ?? 0) >= 4, "runbook timeline steps");
        const t7Blocks = RUNBOOK_COPY_BLOCKS["T-7d"];
        assert.ok(t7Blocks?.length > 0, "T-7d copy blocks exist");
      }
    }

    if (thesisId === "influencer_partnerships") {
      const asset = humanTasks.find((t) => t.human_execution_asset?.influencer_stage)?.human_execution_asset;
      assert.ok(asset?.copy_blocks.length >= 3, "influencer pitch A/B/C blocks");
    }

    assert.equal(validatePostedUrl("short").ok, false, "URL gate rejects short");
    assert.equal(canAdvanceToMetrics(null), false, "metrics blocked without draft");
    assert.equal(canAdvanceToMetrics({ posted_url: "https://example.com/p" }), true);

    ok(`${thesisId} human asset bind`);
  } catch (err) {
    fail(`${thesisId} human asset bind`, err);
  }
}

console.log(`\nhuman-lane-matrix\n  ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
