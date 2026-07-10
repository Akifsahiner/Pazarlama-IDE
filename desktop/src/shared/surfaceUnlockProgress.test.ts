import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { surfaceUnlockProgress } from "./surfaceUnlockProgress";

describe("surfaceUnlockProgress", () => {
  it("campaign-plan shows 0/3 before plan", () => {
    const p = surfaceUnlockProgress("campaign-plan", {
      plan: null,
      planLoading: false,
      planPreviewMode: false,
      planProgress: null,
      marketingProfile: null,
      browserFindingsCount: 0,
      threadAssetsCount: 0,
      serverAssetsCount: 0,
      adLikeAssetsCount: 0,
    });
    assert.equal(p.completed, 0);
    assert.equal(p.total, 3);
  });

  it("counts preview mode as step 1 done", () => {
    const p = surfaceUnlockProgress("campaign-plan", {
      plan: null,
      planLoading: false,
      planPreviewMode: true,
      planProgress: null,
      marketingProfile: null,
      browserFindingsCount: 0,
      threadAssetsCount: 0,
      serverAssetsCount: 0,
      adLikeAssetsCount: 0,
    });
    assert.equal(p.completed, 1);
    assert.equal(p.stepDone[0], true);
  });
});
