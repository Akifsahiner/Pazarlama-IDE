import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWeek1OpsActive,
  resolveFirstRunPrimaryAction,
  shouldBlockPlanStudio,
  shouldShowGtmKnowledgeStrip,
  shouldShowSuggestedMovesGrid,
  workSurfacesForWeek,
} from "./northStarFunnel";

describe("northStarFunnel", () => {
  it("detects active Week 1 ops", () => {
    assert.equal(isWeek1OpsActive(null), false);
    assert.equal(isWeek1OpsActive({ tasks: [] } as never), false);
    assert.equal(isWeek1OpsActive({ tasks: [{ id: "t1" }] } as never), true);
  });

  it("blocks Plan Studio during Week 1", () => {
    assert.equal(shouldBlockPlanStudio({ opsCadence: null }), false);
    assert.equal(
      shouldBlockPlanStudio({ opsCadence: { tasks: [{ id: "a" }] } as never }),
      true,
    );
  });

  it("hides suggested moves pre-ship on quick start", () => {
    assert.equal(
      shouldShowSuggestedMovesGrid({
        onboardingTrack: "quick_start",
        firstShipAt: null,
      }),
      false,
    );
    assert.equal(
      shouldShowSuggestedMovesGrid({
        onboardingTrack: "full_cmo",
        firstShipAt: null,
      }),
      true,
    );
    assert.equal(
      shouldShowSuggestedMovesGrid({
        opsCadence: { tasks: [{ id: "x" }] } as never,
      }),
      false,
    );
  });

  it("hides GTM strip pre-ship on quick start", () => {
    assert.equal(
      shouldShowGtmKnowledgeStrip({ onboardingTrack: "quick_start", firstShipAt: null }),
      false,
    );
  });

  it("resolves ship-first when hero exists and no ship yet", () => {
    const action = resolveFirstRunPrimaryAction({
      heroPath: "src/app/page.tsx",
      firstShipAt: null,
      onboardingTrack: "quick_start",
    });
    assert.equal(action.id, "ship_first_patch");
    assert.match(action.primaryLabel, /Ship first patch/i);
  });

  it("resolves continue workspace when Week 1 active", () => {
    const action = resolveFirstRunPrimaryAction({
      opsCadence: { tasks: [{ id: "day1" }] } as never,
    });
    assert.equal(action.id, "continue_week1_ops");
  });

  it("filters campaign-plan tab during Week 1", () => {
    const all = ["research-map", "campaign-plan", "funnel"];
    assert.deepEqual(
      workSurfacesForWeek({ opsCadence: null, all }),
      all,
    );
    assert.deepEqual(
      workSurfacesForWeek({ opsCadence: { tasks: [{ id: "t" }] } as never, all }),
      ["research-map", "funnel"],
    );
  });
});
