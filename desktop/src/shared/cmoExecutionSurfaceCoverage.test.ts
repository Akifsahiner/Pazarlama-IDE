import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCmoIntake } from "./cmoIntake";
import type { ChannelThesisId } from "./cmoIntake";
import { bindExecutionPlansForCadence, validateSystemTaskCoverage } from "./cmoExecutionBind";
import { createLaneAWorkspaceFromThesis } from "./cmoLaneA";
import { createLaneBWorkspaceFromThesis } from "./cmoLaneB";
import { createDistributionOperatorFromThesis } from "./cmoDistributionOperator";
import { createInfluencerOperatorFromThesis } from "./cmoInfluencerOperator";
import { createOpsCadenceFromThesis, getFocusTasks, getNowTask } from "./cmoOpsCadence";
import {
  bindHumanExecutionForCadence,
  humanTasksFromCadence,
  primaryUserOpsTaskId,
  validateHumanTaskCoverage,
} from "./cmoHumanExecutionBind";
import { assertCadenceContractComplete } from "./marketingTaskContract";
import type { ProjectProfile } from "./types";

const THESIS_IDS: ChannelThesisId[] = [
  "viral_short_form",
  "founder_social",
  "product_hunt_launch",
  "landing_conversion",
  "seo_content",
  "outbound_sales",
  "community_launch",
  "influencer_partnerships",
];

function baseProject(): ProjectProfile {
  return {
    id: "p1",
    source: { kind: "folder", path: "/proj" },
    name: "Acme",
    framework: "Next.js",
    routes: ["apps/web/app/page.tsx"],
    hasAnalytics: false,
    excludedPaths: [],
    scannedFileCount: 80,
    readmeSummary: "B2B SaaS SaaS product.",
  };
}

function fullBindPipeline(thesisId: ChannelThesisId) {
  const thesis = buildCmoIntake({
    project: baseProject(),
    persona: "marketing",
    profile: { company_stage: "prelaunch" } as never,
    context: { force_thesis_id: thesisId },
  });
  let cadence = createOpsCadenceFromThesis(thesis);
  const laneA = createLaneAWorkspaceFromThesis(thesis, { opsCadence: cadence });
  const bound = bindExecutionPlansForCadence({
    cadence,
    thesis,
    project: baseProject(),
    laneAWorkspace: laneA,
  });
  cadence = bound.cadence;

  let laneB = createLaneBWorkspaceFromThesis(thesis, { opsCadence: cadence });
  let distributionOperator =
    thesisId === "viral_short_form" || thesisId === "founder_social"
      ? createDistributionOperatorFromThesis(thesis, { opsCadence: cadence })
      : undefined;
  let influencerOperator =
    thesisId === "influencer_partnerships"
      ? createInfluencerOperatorFromThesis(thesis, { opsCadence: cadence })
      : undefined;

  const humanResult = bindHumanExecutionForCadence({
    cadence,
    thesis,
    laneB,
    distributionOperator,
    influencerOperator,
  });
  cadence = humanResult.cadence;
  laneB = humanResult.laneB ?? laneB;
  return { thesis, cadence, laneB, distributionOperator, influencerOperator };
}

describe("cmoExecutionSurfaceCoverage", () => {
  for (const thesisId of THESIS_IDS) {
    it(`${thesisId} — 100% system bind + human ref + contract complete`, () => {
      const { cadence } = fullBindPipeline(thesisId);
      assert.equal(validateSystemTaskCoverage(cadence).ok, true);
      assert.equal(validateHumanTaskCoverage(cadence).ok, true);
      assert.equal(assertCadenceContractComplete(cadence).length, 0);

      const primaryId = primaryUserOpsTaskId(cadence);
      if (primaryId) {
        const primary = cadence.tasks.find((t) => t.id === primaryId)!;
        assert.notEqual(primary.human_execution_ref?.proof_surface, "ops_modal");
        assert.ok((primary.human_execution_asset?.copy_blocks.length ?? 0) >= 1);
      }

      for (const task of humanTasksFromCadence(cadence)) {
        assert.ok((task.human_execution_asset?.copy_blocks.length ?? 0) >= 1, task.id);
      }
    });
  }

  it("focus view max 3 with single now task", () => {
    const { cadence } = fullBindPipeline("viral_short_form");
    const focus = getFocusTasks(cadence, 3);
    assert.ok(focus.length <= 3);
    const nowTasks = cadence.tasks.filter((t) => t.day_slot === "now" && t.status !== "done");
    assert.ok(nowTasks.length <= 1);
    assert.equal(getNowTask(cadence)?.id, focus[0]?.id);
  });
});
