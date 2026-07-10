import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTier,
  tierBlockedMessage,
  tierHasFeature,
  tierUpgradeLabel,
} from "./tierFeatures";

describe("tierFeatures", () => {
  it("free tier has no AI features", () => {
    assert.equal(tierHasFeature([], "ai_plan"), false);
    assert.equal(tierHasFeature(undefined, "ai_agent"), false);
  });

  it("pro features include AI stack", () => {
    const features = ["ai_plan", "ai_agent", "ai_browser", "connector_meta"];
    assert.equal(tierHasFeature(features, "ai_plan"), true);
    assert.equal(tierHasFeature(features, "team_collab"), false);
  });

  it("team features include collaboration", () => {
    const features = ["team_collab", "client_reports"];
    assert.equal(tierHasFeature(features, "team_collab"), true);
    assert.equal(tierHasFeature(features, "client_reports"), true);
  });

  it("normalizes unknown tier to free", () => {
    assert.equal(normalizeTier("bogus"), "free");
    assert.equal(normalizeTier("team"), "team");
  });

  it("upgrade labels chain free → pro → team", () => {
    assert.equal(tierUpgradeLabel("free"), "Pro");
    assert.equal(tierUpgradeLabel("pro"), "Team");
    assert.equal(tierUpgradeLabel("team"), "Enterprise");
  });

  it("blocked message names feature and upgrade", () => {
    const msg = tierBlockedMessage("ai_agent", "free");
    assert.match(msg, /Ask & agent runs/);
    assert.match(msg, /Pro/);
  });
});
