import type { MarketingProfile, Settings } from "./types";

const viteEnv = import.meta.env as { VITE_DEFAULT_SERVER_URL?: string };
const defaultServerUrl = viteEnv.VITE_DEFAULT_SERVER_URL?.trim() || "http://127.0.0.1:8787";

export const DEFAULT_SETTINGS: Settings = {
  serverUrl: defaultServerUrl,
  apiToken: "",
  provider: "anthropic",
  theme: "dark",
  reducedMotion: false,
  telemetry: false,
  persona: "marketing",
  planHorizon: 30,
};

/** Empty marketing profile for local-only KPI / connector UI before cloud sync. */
export function emptyMarketingProfile(): MarketingProfile {
  return {
    product_name: "",
    product_description: "",
    category: "",
    business_model: "",
    target_audience: [],
    primary_problem: "",
    main_value_proposition: "",
    differentiators: [],
    competitors: [],
    company_stage: "",
    main_markets: [],
    available_channels: [],
    marketing_goals: [],
    brand_voice: "",
    existing_proof: [],
    available_assets: [],
    constraints: [],
    previous_experiments: [],
    successful_experiments: [],
    failed_experiments: [],
    manual_kpis: [],
    last_updated: new Date().toISOString(),
    confidence_score: 0,
    gaps: [],
  };
}

export function isSelfHostServerUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return true;
  }
}

/** Fix stale local dev URLs (e.g. old 8799 port) to the current default. */
export function normalizeDevServerUrl(url: string): string {
  const fallback = defaultServerUrl;
  if (!url?.trim()) return fallback;
  try {
    const u = new URL(url.trim());
    const local = u.hostname === "127.0.0.1" || u.hostname === "localhost";
    if (local && (u.port === "8799" || u.port === "")) {
      u.port = new URL(fallback).port || "8787";
      return u.toString().replace(/\/$/, "");
    }
    return url.trim().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}
