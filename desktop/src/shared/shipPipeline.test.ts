import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  initialShipPipelineState,
  nextShipPipelineStage,
  patchCountFromEvents,
} from "./shipPipeline";
import type { RunEvent } from "./types";

function patchEvent(file: string): RunEvent {
  return {
    id: "e1",
    runId: "r1",
    seq: 1,
    timestamp: new Date().toISOString(),
    type: "file.patch_created",
    status: "success",
    title: `Changed ${file}`,
    payload: { file },
  };
}

describe("shipPipeline", () => {
  it("transitions run → approval on completed with patches", () => {
    const events = [patchEvent("src/app/page.tsx")];
    let state = initialShipPipelineState();
    state = nextShipPipelineStage(state, { type: "run.started", runId: "r1" });
    state = nextShipPipelineStage(state, { type: "run.completed", events });
    assert.equal(state.stage, "approval");
    assert.equal(patchCountFromEvents(events), 1);
  });

  it("approval.granted moves to apply", () => {
    const state = nextShipPipelineStage(
      { stage: "approval", patchCount: 1, updatedAt: Date.now() },
      { type: "approval.granted" },
    );
    assert.equal(state.stage, "apply");
  });

  it("transitions to failed NO_PATCHES when completed with zero patches", () => {
    let state = initialShipPipelineState();
    state = nextShipPipelineStage(state, { type: "run.started", runId: "r1" });
    state = nextShipPipelineStage(state, { type: "run.completed", events: [] });
    assert.equal(state.stage, "failed");
    assert.equal(state.error, "NO_PATCHES");
  });

  it("apply.completed opens preview stage", () => {
    const state = nextShipPipelineStage(
      { stage: "apply", patchCount: 1, updatedAt: Date.now() },
      { type: "apply.completed" },
    );
    assert.equal(state.stage, "preview");
  });
});
