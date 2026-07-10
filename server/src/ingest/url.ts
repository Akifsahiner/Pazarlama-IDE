import { createHash } from "node:crypto";

export interface UrlProfile {
  id: string;
  name: string;
  source: { kind: "url"; url: string };
  framework?: string;
  productType?: string;
  readmeSummary?: string;
  routes: string[];
  hasAnalytics: boolean;
  excludedPaths: string[];
  scannedFileCount: number;
}

function hashId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

/** Fetch a live URL and derive a lightweight marketing profile. */
export async function profileFromUrl(url: string): Promise<UrlProfile> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "MarketingIDE/1.0" },
  });
  if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`);
  const html = await res.text();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim();
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const description = descMatch?.[1]?.trim();

  const hasAnalytics = /(gtag|google-analytics|posthog|plausible|mixpanel|segment)/i.test(html);
  const looksNext = /__NEXT_DATA__|_next\/static/i.test(html);
  const looksReact = /react/i.test(html);

  let framework: string | undefined;
  if (looksNext) framework = "Next.js";
  else if (looksReact) framework = "React";

  const host = new URL(url).hostname.replace(/^www\./, "");

  return {
    id: hashId(url),
    name: title ?? host,
    source: { kind: "url", url },
    framework,
    productType: "Web app",
    readmeSummary: description?.slice(0, 600),
    routes: ["/"],
    hasAnalytics,
    excludedPaths: [],
    scannedFileCount: 1,
  };
}
