import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  heroPathFromProject,
  isQuickStartTrack,
  resolveRevealPrimaryCta,
  shouldDeferFullCmoIntake,
} from "./quickStartWedge";
import type { ChannelThesis } from "./cmoIntake";

const thesis: ChannelThesis = {
  id: "landing_conversion",
  title: "Landing conversion",
  headline: "Fix the funnel before scaling traffic",
  verdict: "marketable",
  verdict_reason: "ok",
  primary_bottleneck: "conversion",
  rationale: ["a"],
  week1_priorities: [],
  lane_a: [],
  lane_b: [],
  deprioritize: [],
  primary_playbook_ids: [],
  signals: {},
  draft: true,
  generated_at: new Date().toISOString(),
};

describe("quickStartWedge", () => {
  it("resolveRevealPrimaryCta prefers ship before firstShipAt", () => {
    assert.equal(
      resolveRevealPrimaryCta({
        heroPath: "src/app/page.tsx",
        channelThesis: thesis,
      }),
      "ship_first_win",
    );
  });

  it("resolveRevealPrimaryCta opens CMO strategy after ship", () => {
    assert.equal(
      resolveRevealPrimaryCta({
        firstShipAt: Date.now(),
        heroPath: "src/app/page.tsx",
        channelThesis: thesis,
        marketingProfile: { strategic_decision: undefined } as import("./types").MarketingProfile,
      }),
      "complete_cmo_strategy",
    );
  });

  it("shouldDeferFullCmoIntake until ship on quick_start track", () => {
    assert.equal(shouldDeferFullCmoIntake({ onboardingTrack: "quick_start" }), true);
    assert.equal(
      shouldDeferFullCmoIntake({ onboardingTrack: "quick_start", firstShipAt: 1 }),
      false,
    );
    assert.equal(shouldDeferFullCmoIntake({ onboardingTrack: "full_cmo" }), false);
  });

  it("isQuickStartTrack defaults true except full_cmo", () => {
    assert.equal(isQuickStartTrack(undefined), true);
    assert.equal(isQuickStartTrack("quick_start"), true);
    assert.equal(isQuickStartTrack("full_cmo"), false);
  });

  it("heroPathFromProject picks integrate route", () => {
    const hp = heroPathFromProject(["src/app/page.tsx", "src/app/about/page.tsx"]);
    assert.ok(hp?.includes("page"));
  });
});
