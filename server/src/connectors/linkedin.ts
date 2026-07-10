import type { MarketingProfile } from "../schemas/marketingProfile.js";
import type { ConnectorConnectionStatus } from "./ga4.js";
import { encodeOAuthState, decodeOAuthState } from "./oauthState.js";

export function getLinkedInOAuthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  const clientId = process.env.LINKEDIN_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.LINKEDIN_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.LINKEDIN_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function buildLinkedInAuthUrl(state: string): string | null {
  const cfg = getLinkedInOAuthConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: "r_organization_social r_ads_reporting",
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string): Promise<{ access_token: string } | null> {
  const cfg = getLinkedInOAuthConfig();
  if (!cfg) return null;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ? { access_token: json.access_token } : null;
}

export function linkedInConnectionStatus(profile: MarketingProfile): ConnectorConnectionStatus {
  return profile.linkedin_oauth?.access_token ? "connected" : "disconnected";
}

export function encodeLinkedInOAuthState(payload: { userId: string; projectId: string }): string {
  return encodeOAuthState(payload);
}

export function decodeLinkedInOAuthState(state: string): { userId: string; projectId: string } | null {
  const decoded = decodeOAuthState<{ userId?: string; projectId?: string }>(state);
  if (!decoded?.userId || !decoded?.projectId) return null;
  return { userId: decoded.userId, projectId: decoded.projectId };
}
