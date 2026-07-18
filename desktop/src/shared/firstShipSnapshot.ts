/**
 * Parse marketing-relevant fields from hero/layout source for before/after cards.
 */
export interface FirstShipSnapshot {
  heroPath?: string;
  metaTitle?: string;
  metaDesc?: string;
  heroHeadline?: string;
  capturedAt: number;
}

const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i;
const META_DESC_RE = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i;
const OG_TITLE_RE = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i;
const H1_RE = /<h1[^>]*>([\s\S]*?)<\/h1>/i;

export function parseShipSnapshotFromSource(
  source: string,
  heroPath?: string,
): Omit<FirstShipSnapshot, "capturedAt"> {
  const metaTitle =
    source.match(TITLE_RE)?.[1]?.trim() ||
    source.match(OG_TITLE_RE)?.[1]?.trim() ||
    undefined;
  const metaDesc = source.match(META_DESC_RE)?.[1]?.trim();
  const h1Raw = source.match(H1_RE)?.[1];
  const heroHeadline = h1Raw?.replace(/<[^>]+>/g, "").trim() || undefined;
  return { heroPath, metaTitle, metaDesc, heroHeadline };
}

export function buildShipSummary(before?: FirstShipSnapshot, after?: Partial<FirstShipSnapshot>): string {
  const parts: string[] = [];
  if (before?.metaTitle && after?.metaTitle && before.metaTitle !== after.metaTitle) {
    parts.push("meta title updated");
  }
  if (before?.heroHeadline && after?.heroHeadline && before.heroHeadline !== after.heroHeadline) {
    parts.push("hero headline updated");
  }
  if (parts.length === 0) parts.push("marketing patch applied");
  return parts.join(" · ");
}
