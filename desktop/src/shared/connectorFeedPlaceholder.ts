import type { FeedItem } from "./feed";

const PLACEHOLDER_ID = "connector-feed-ga4-cta";

/** Honest connector feed row when no analytics connected — not demo data. */
export function connectorFeedPlaceholderItem(): FeedItem {
  return {
    id: PLACEHOLDER_ID,
    ts: Date.now(),
    source: "system",
    category: "external",
    title: "Connect GA4 to see spend and conversions",
    summary: "Read-only analytics — log KPIs manually until connected.",
    status: "waiting",
    canvasTarget: { mode: "performance" },
  };
}

export function isConnectorFeedPlaceholder(item: FeedItem): boolean {
  return item.id === PLACEHOLDER_ID;
}

export function hasConnectorFeedPlaceholder(items: FeedItem[]): boolean {
  return items.some(isConnectorFeedPlaceholder);
}
