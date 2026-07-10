import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildIntegrateAssetGoal,
  integrateAssetIntent,
} from "./conversationIntent";

describe("integrate asset intent", () => {
  it("buildIntegrateAssetGoal includes copy and route", () => {
    const goal = buildIntegrateAssetGoal("New hero headline", "app/page.tsx");
    assert.match(goal, /app\/page\.tsx/);
    assert.match(goal, /New hero headline/);
    assert.match(goal, /Preserve existing layout/i);
  });

  it("integrateAssetIntent resolves route from scan", () => {
    const intent = integrateAssetIntent("asset-1", {
      routes: ["marketing/hero.md", "app/page.tsx"],
    });
    assert.deepEqual(intent, {
      kind: "integrate_asset",
      assetId: "asset-1",
      route: "app/page.tsx",
    });
  });

  it("integrateAssetIntent returns null without route", () => {
    assert.equal(integrateAssetIntent("asset-1", { routes: ["README.md"] }), null);
  });
});
