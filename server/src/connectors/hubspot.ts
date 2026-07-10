import type { MarketingProfile } from "../schemas/marketingProfile.js";
import type { ConnectorConnectionStatus } from "./ga4.js";
import { encodeOAuthState, decodeOAuthState } from "./oauthState.js";

export function getHubSpotOAuthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  const clientId = process.env.HUBSPOT_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.HUBSPOT_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.HUBSPOT_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function buildHubSpotAuthUrl(state: string): string | null {
  const cfg = getHubSpotOAuthConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: "crm.objects.contacts.read crm.objects.deals.read",
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeHubSpotCode(code: string): Promise<{ access_token: string; refresh_token?: string } | null> {
  const cfg = getHubSpotOAuthConfig();
  if (!cfg) return null;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    code,
  });
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!json.access_token) return null;
  return { access_token: json.access_token, refresh_token: json.refresh_token };
}

export function hubSpotConnectionStatus(profile: MarketingProfile): ConnectorConnectionStatus {
  return profile.hubspot_oauth?.access_token ? "connected" : "disconnected";
}

export function encodeHubSpotOAuthState(payload: { userId: string; projectId: string }): string {
  return encodeOAuthState(payload);
}

export function decodeHubSpotOAuthState(state: string): { userId: string; projectId: string } | null {
  const decoded = decodeOAuthState<{ userId?: string; projectId?: string }>(state);
  if (!decoded?.userId || !decoded?.projectId) return null;
  return { userId: decoded.userId, projectId: decoded.projectId };
}
