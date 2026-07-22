import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CURSOR_WOW,
  QUICK_REVEAL_BEATS,
  revealBeatDelayMs,
  revealBeatsForTrack,
  isQuickStartWeek1Ready,
} from "./instantWow";

describe("instantWow", () => {
  it("quick start uses faster reveal beats", () => {
    assert.deepEqual(revealBeatsForTrack("quick_start"), QUICK_REVEAL_BEATS);
    assert.ok(revealBeatDelayMs("quick_start") < revealBeatDelayMs("full_cmo"));
  });

  it("quick start week1 ready after first ship without measurement ack", () => {
    assert.equal(
      isQuickStartWeek1Ready({
        onboardingTrack: "quick_start",
        firstShipAt: Date.now(),
        founderFit: { thirty_day_win: "qualified_signups" },
      }),
      true,
    );
    assert.equal(
      isQuickStartWeek1Ready({
        onboardingTrack: "full_cmo",
        firstShipAt: Date.now(),
      }),
      false,
    );
  });

  it("exposes cursor-style copy", () => {
    assert.match(CURSOR_WOW.primaryCta, /Ship first/);
  });
});
