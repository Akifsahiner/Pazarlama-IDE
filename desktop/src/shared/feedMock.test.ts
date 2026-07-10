import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countPendingApprovals } from "./feed";
import { mockConnectorFeedItems } from "./feedMock";

describe("mockConnectorFeedItems", () => {
  it("marks every item as demo", () => {
    const items = mockConnectorFeedItems();
    assert.ok(items.length > 0);
    assert.ok(items.every((i) => i.isDemo === true));
  });

  it("never deep-links to performance canvas", () => {
    const items = mockConnectorFeedItems();
    assert.ok(
      items.every((i) => i.canvasTarget?.mode !== "performance"),
      "demo feed must not fake performance deep-links",
    );
  });
});

describe("countPendingApprovals", () => {
  it("excludes demo gate items from pending count", () => {
    const items = mockConnectorFeedItems();
    const pending = countPendingApprovals(items);
    assert.equal(pending, 0);
  });
});
