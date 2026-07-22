import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildHumanExecutionAsset, resolveHumanExecutionAssetForTask } from "./buildHumanExecutionAsset";
import { buildCmoIntake, cluelyLikeReadme } from "./cmoIntake";
import { createDistributionOperatorFromThesis } from "./cmoDistributionOperator";
import type { ProjectProfile } from "./types";

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
    readmeSummary: cluelyLikeReadme(),
  };
}

describe("buildHumanExecutionAsset", () => {
  it("builds distribution post kit with copy blocks and hook grid count", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const dist = createDistributionOperatorFromThesis(thesis, { week_index: 1 });
    assert.ok(dist);
    const slot = dist.slots.find((s) => s.slot_kind === "post");
    assert.ok(slot);
    const asset = buildHumanExecutionAsset({
      ref: { source: "distribution", item_id: slot!.id, proof_surface: "operator_modal" },
      task: {
        id: "t1",
        owner: "user",
        what: "Post hook A",
        why: "",
        done_when: "Live URL recorded",
        status: "in_progress",
        priority_index: 0,
        day_slot: "now",
      },
      thesis,
      distributionOperator: dist,
      projectName: "Acme",
    });
    assert.ok(asset.copy_blocks.length > 0);
    assert.equal(asset.kind, "distribution_slot");
    assert.ok((asset.hook_grid_count ?? 0) >= 1);
    assert.ok(asset.honesty_note?.includes("never auto-post"));
  });

  it("resolveHumanExecutionAssetForTask preserves frozen asset", () => {
    const thesis = buildCmoIntake({ project: baseProject(), persona: "marketing" });
    const frozen = buildHumanExecutionAsset({
      ref: { source: "lane_b", item_id: "x", proof_surface: "lane_b_modal", label: "Test" },
      task: {
        id: "t1",
        owner: "user",
        what: "Post",
        why: "",
        done_when: "URL",
        status: "in_progress",
        priority_index: 0,
        day_slot: "now",
        human_execution_asset: undefined,
      },
      thesis,
    });
    const task = {
      id: "t1",
      owner: "user" as const,
      what: "Post",
      why: "",
      done_when: "URL",
      status: "in_progress" as const,
      priority_index: 0,
      day_slot: "now" as const,
      human_execution_asset: frozen,
      human_execution_ref: frozen.source_ref,
    };
    const again = resolveHumanExecutionAssetForTask(task, {
      ref: frozen.source_ref,
      thesis,
    });
    assert.equal(again.frozen_at, frozen.frozen_at);
  });
});
