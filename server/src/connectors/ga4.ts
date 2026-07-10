import type { MarketingProfile } from "../schemas/marketingProfile.js";

export type ConnectorConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface Ga4ConnectorSnapshot {
  fetched_at: string;
  metrics: Array<{ name: string; value: number; unit?: string }>;
}

const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export interface Ga4OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  propertyId?: string;
}

export function getGa4OAuthConfig(): Ga4OAuthConfig | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return {
    clientId,
    clientSecret,
    redirectUri,
    propertyId: process.env.GOOGLE_GA4_PROPERTY_ID?.trim() || undefined,
  };
}

export function buildGa4AuthUrl(state: string): string | null {
  const cfg = getGa4OAuthConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: GA4_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGa4Code(
  code: string,
): Promise<{ refresh_token: string; access_token: string } | null> {
  const cfg = getGa4OAuthConfig();
  if (!cfg) return null;
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { refresh_token?: string; access_token?: string };
  if (!json.refresh_token || !json.access_token) return null;
  return { refresh_token: json.refresh_token, access_token: json.access_token };
}

async function refreshGa4AccessToken(refreshToken: string): Promise<string | null> {
  const cfg = getGa4OAuthConfig();
  if (!cfg) return null;
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export type Ga4DateRange = "7d" | "28d" | "90d";

function ga4DateRangeToApi(range: Ga4DateRange): { startDate: string; endDate: string } {
  switch (range) {
    case "7d":
      return { startDate: "7daysAgo", endDate: "today" };
    case "90d":
      return { startDate: "90daysAgo", endDate: "today" };
    default:
      return { startDate: "28daysAgo", endDate: "today" };
  }
}

/** Read-only GA4 metrics for a date range — never fabricates values. */
export async function queryMetrics(
  profile: MarketingProfile,
  range: Ga4DateRange = "28d",
): Promise<Ga4ConnectorSnapshot | null> {
  const oauth = profile.ga4_oauth;
  const cfg = getGa4OAuthConfig();
  const propertyId = oauth?.property_id ?? cfg?.propertyId;
  if (!oauth?.refresh_token || !propertyId) return null;

  const accessToken = await refreshGa4AccessToken(oauth.refresh_token);
  if (!accessToken) return null;

  const { startDate, endDate } = ga4DateRangeToApi(range);
  const numericProperty = propertyId.replace(/^properties\//, "");
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${numericProperty}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "conversions" },
        ],
      }),
    },
  );
  if (!res.ok) return null;

  const json = (await res.json()) as {
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
    metricHeaders?: Array<{ name?: string }>;
  };
  const headers = json.metricHeaders ?? [];
  const values = json.rows?.[0]?.metricValues ?? [];
  const metrics: Ga4ConnectorSnapshot["metrics"] = [];
  for (let i = 0; i < headers.length; i++) {
    const name = headers[i]?.name ?? `metric_${i}`;
    const raw = values[i]?.value;
    const value = raw != null ? Number(raw) : NaN;
    if (Number.isNaN(value)) continue;
    metrics.push({ name, value });
  }
  if (metrics.length === 0) return null;
  return { fetched_at: new Date().toISOString(), metrics };
}

/** Read-only GA4 metrics from the Data API — never fabricates values. */
export async function fetchReadOnlyGa4Metrics(
  profile: MarketingProfile,
): Promise<Ga4ConnectorSnapshot | null> {
  return queryMetrics(profile, "28d");
}

export function ga4ConnectionStatus(profile: MarketingProfile): ConnectorConnectionStatus {
  if (
    profile.ga4_oauth?.refresh_token ||
    profile.connector_snapshots?.ga4?.metrics?.length
  ) {
    return "connected";
  }
  return "disconnected";
}

/** @deprecated Use fullConnectorStatus from connectorStatus.js */
export function connectorStatus(profile: MarketingProfile): {
  ga4: ConnectorConnectionStatus;
  meta: ConnectorConnectionStatus;
} {
  const ga4 = ga4ConnectionStatus(profile);
  return { ga4, meta: "disconnected" };
}

export function encodeOAuthState(payload: { userId: string; projectId: string }): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeOAuthState(state: string): { userId: string; projectId: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      userId?: string;
      projectId?: string;
    };
    if (!parsed.userId || !parsed.projectId) return null;
    return { userId: parsed.userId, projectId: parsed.projectId };
  } catch {
    return null;
  }
}
