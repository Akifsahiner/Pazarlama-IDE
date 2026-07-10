import type { MarketingProfile } from "../schemas/marketingProfile.js";
import type { ConnectorConnectionStatus } from "./ga4.js";
import { encodeOAuthState, decodeOAuthState } from "./oauthState.js";

const META_SCOPE = "ads_read";

export interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  adAccountId?: string;
}

export interface MetaAdsSnapshot {
  fetched_at: string;
  metrics: Array<{ name: string; value: number; unit?: string }>;
}

export function getMetaOAuthConfig(): MetaOAuthConfig | null {
  const appId = process.env.META_OAUTH_APP_ID?.trim();
  const appSecret = process.env.META_OAUTH_APP_SECRET?.trim();
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI?.trim();
  if (!appId || !appSecret || !redirectUri) return null;
  return {
    appId,
    appSecret,
    redirectUri,
    adAccountId: process.env.META_AD_ACCOUNT_ID?.trim() || undefined,
  };
}

export function buildMetaAuthUrl(state: string): string | null {
  const cfg = getMetaOAuthConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    scope: META_SCOPE,
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeMetaCode(
  code: string,
): Promise<{ access_token: string; expires_in?: number } | null> {
  const cfg = getMetaOAuthConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    redirect_uri: cfg.redirectUri,
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  return { access_token: json.access_token, expires_in: json.expires_in };
}

export async function fetchMetaAdsMetrics(profile: MarketingProfile): Promise<MetaAdsSnapshot | null> {
  const oauth = profile.meta_oauth;
  const cfg = getMetaOAuthConfig();
  const adAccountId = oauth?.ad_account_id ?? cfg?.adAccountId;
  if (!oauth?.access_token || !adAccountId) return null;

  const account = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const params = new URLSearchParams({
    fields: "spend,impressions,clicks,ctr,cpc",
    date_preset: "last_28d",
    access_token: oauth.access_token,
  });
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${account}/insights?${params.toString()}`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: Array<Record<string, string>>;
  };
  const row = json.data?.[0];
  if (!row) return null;

  const metrics: MetaAdsSnapshot["metrics"] = [];
  for (const [name, raw] of Object.entries(row)) {
    const num = Number(raw);
    if (!Number.isFinite(num)) continue;
    metrics.push({
      name,
      value: num,
      unit: name === "ctr" ? "%" : name === "spend" || name === "cpc" ? "USD" : undefined,
    });
  }
  if (metrics.length === 0) return null;
  return { fetched_at: new Date().toISOString(), metrics };
}

export function metaConnectionStatus(profile: MarketingProfile): ConnectorConnectionStatus {
  if (profile.meta_oauth?.access_token || profile.connector_snapshots?.meta?.metrics?.length) {
    return "connected";
  }
  return "disconnected";
}

export function encodeMetaOAuthState(payload: { userId: string; projectId: string }): string {
  return encodeOAuthState(payload);
}

export function decodeMetaOAuthState(state: string): { userId: string; projectId: string } | null {
  const decoded = decodeOAuthState<{ userId?: string; projectId?: string }>(state);
  if (!decoded?.userId || !decoded?.projectId) return null;
  return { userId: decoded.userId, projectId: decoded.projectId };
}
