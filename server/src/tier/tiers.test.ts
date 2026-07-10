import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTier,
  tierDefinition,
  tierHasFeature,
  tierQuotaFor,
} from "./tiers.js";

describe("tiers", () => {
  it("free tier blocks AI features", () => {
    const t = tierDefinition("free");
    assert.equal(tierHasFeature("free", "ai_plan"), false);
    assert.equal(tierHasFeature("free", "ai_agent"), false);
    assert.equal(tierQuotaFor("free").agent_limit, 0);
    assert.equal(t.features.size, 0);
  });

  it("pro tier includes AI stack", () => {
    assert.equal(tierHasFeature("pro", "ai_plan"), true);
    assert.equal(tierHasFeature("pro", "ai_agent"), true);
    assert.equal(tierHasFeature("pro", "team_collab"), false);
  });

  it("team tier includes collaboration", () => {
    assert.equal(tierHasFeature("team", "team_collab"), true);
    assert.equal(tierHasFeature("team", "client_reports"), true);
  });

  it("normalizes unknown tier to free", () => {
    assert.equal(normalizeTier("bogus"), "free");
    assert.equal(normalizeTier("pro"), "pro");
  });
});
