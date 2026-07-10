import type { ProjectProfile } from "../schemas/index.js";
import {
  computeGaps,
  confidenceFromProfile,
  marketingProfileSchema,
  type MarketingProfile,
} from "../schemas/marketingProfile.js";

/**
 * Lightweight, no-LLM inference: derive what we can from the repo scan
 * (framework / routes / analytics) without needing the user to fill anything
 * out. Anything we can't infer stays empty and shows up in `gaps`.
 */
export function inferFromRepoScan(scan: ProjectProfile): Partial<MarketingProfile> {
  const channels: string[] = [];
  if (scan.hasAnalytics) channels.push("analytics");
  if (scan.routes.some((r) => /(\bblog\b|\/blog)/i.test(r))) channels.push("content");
  if (scan.routes.some((r) => /(landing|home|index)/i.test(r))) channels.push("landing");
  if (scan.routes.some((r) => /(login|signup|signin|register)/i.test(r))) channels.push("product");

  // Crude category guess: from framework + product type hints.
  const fw = (scan.framework ?? "").toLowerCase();
  let category = "";
  if (/next|remix|astro|gatsby|nuxt|sveltekit/.test(fw)) category = "web app";
  else if (/expo|react-native/.test(fw)) category = "mobile app";
  else if (scan.productType) category = scan.productType;

  return {
    product_name: scan.name || "",
    category,
    available_assets: Array.from(
      new Set([
        scan.hasAnalytics ? "analytics" : null,
        ...scan.routes.slice(0, 6).map((r) => `route:${r}`),
      ].filter(Boolean) as string[]),
    ),
    available_channels: channels,
    last_updated: new Date().toISOString(),
  };
}

/** Validate + normalize an incoming patch (used by /profile POST). */
export function normalizePatch(patch: unknown): Partial<MarketingProfile> {
  // Re-use the Zod schema in "partial" mode by parsing each defined key.
  const accepted: Record<string, unknown> = {};
  if (patch && typeof patch === "object") {
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      if (v === undefined) continue;
      accepted[k] = v;
    }
  }
  // marketingProfileSchema is non-strict on extras; use safeParse on the full
  // merged shape later in repo.upsert — here we just whitelist known keys.
  const shape = marketingProfileSchema.shape;
  const known: Partial<MarketingProfile> = {};
  for (const key of Object.keys(shape) as Array<keyof typeof shape>) {
    if (key in accepted) (known as Record<string, unknown>)[key] = accepted[key];
  }
  return known;
}

/** Convenience: ensure meta fields are accurate after any external mutation. */
export function withMeta(profile: MarketingProfile): MarketingProfile {
  return {
    ...profile,
    gaps: computeGaps(profile),
    confidence_score: confidenceFromProfile(profile),
    last_updated: new Date().toISOString(),
  };
}
