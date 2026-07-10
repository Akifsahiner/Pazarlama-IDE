import { createHash } from "node:crypto";

export interface UrlScanResult {
  title: string;
  description?: string;
  routes: string[];
  readmeSummary?: string;
  hasAnalytics: boolean;
}

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML = 512_000;

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, attr: "name" | "property", key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return decodeEntities(m[1]);
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1] ? decodeEntities(m2[1]) : undefined;
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decodeEntities(m[1]) : undefined;
}

function extractInternalPaths(html: string, origin: URL): string[] {
  const paths = new Set<string>(["/"]);
  const hrefRe = /href=["']([^"'#?]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith("javascript:") || raw.startsWith("mailto:")) continue;
    try {
      const resolved = new URL(raw, origin);
      if (resolved.origin !== origin.origin) continue;
      const path = resolved.pathname || "/";
      if (path.length < 80) paths.add(path);
    } catch {
      /* skip malformed */
    }
  }
  return [...paths].slice(0, 24);
}

function detectAnalytics(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("googletagmanager.com") ||
    lower.includes("google-analytics.com") ||
    lower.includes("gtag(") ||
    lower.includes("plausible.io") ||
    lower.includes("segment.com") ||
    lower.includes("posthog")
  );
}

/** Lightweight HTTP fetch + HTML parse for URL-only projects (no repo clone). */
export async function scanLiveUrl(url: string): Promise<UrlScanResult & { id: string }> {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const origin = new URL(normalized);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html = "";
  try {
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MarketingIDE-Scanner/1.0 (+https://marketing-ide.local)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = (await res.text()).slice(0, MAX_HTML);
  } finally {
    clearTimeout(timer);
  }

  const title =
    metaContent(html, "property", "og:title") ??
    extractTitle(html) ??
    origin.hostname;
  const description =
    metaContent(html, "property", "og:description") ??
    metaContent(html, "name", "description");

  return {
    id: hashId(normalized),
    title,
    description,
    routes: extractInternalPaths(html, origin),
    readmeSummary: description ?? `Live site at ${origin.hostname}`,
    hasAnalytics: detectAnalytics(html),
  };
}
