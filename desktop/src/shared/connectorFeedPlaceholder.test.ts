import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  connectorFeedPlaceholderItem,
  hasConnectorFeedPlaceholder,
  isConnectorFeedPlaceholder,
} from "./connectorFeedPlaceholder";

describe("connectorFeedPlaceholder", () => {
  it("creates honest GA4 CTA without demo flag", () => {
    const item = connectorFeedPlaceholderItem();
    assert.ok(!item.isDemo);
    assert.match(item.title, /GA4/i);
    assert.equal(item.canvasTarget?.mode, "performance");
  });

  it("detects placeholder in feed list", () => {
    const item = connectorFeedPlaceholderItem();
    assert.ok(isConnectorFeedPlaceholder(item));
    assert.ok(hasConnectorFeedPlaceholder([item]));
  });
});
