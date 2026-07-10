import { getAuthConfig, getValidAccessToken, refresh } from "./auth";

/** Thrown when the backend rejects a request with 401 after a refresh attempt. */
export class AuthError extends Error {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
    this.name = "AuthError";
  }
}

interface AuthedOpts {
  authEnabled: boolean;
  /** Legacy shared token when JWT auth is off (matches server API_TOKEN). */
  apiToken?: string;
}

/**
 * fetch wrapper that attaches a Supabase Bearer token when auth is enabled.
 * On a 401 it performs a single refresh + retry; a persistent 401 throws
 * {@link AuthError}. When `authEnabled` is false (local dev) it behaves like a
 * plain fetch so the backend dev user is used.
 */
export async function authedFetch(
  url: string,
  init: RequestInit = {},
  { authEnabled, apiToken = "" }: AuthedOpts,
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (authEnabled) {
    const token = await getValidAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  } else if (apiToken) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }

  let res = await fetch(url, { ...init, headers });
  if (res.status !== 401 || !authEnabled) return res;

  // One refresh + retry on 401.
  const config = getAuthConfig();
  const blob = await window.api.auth.getTokens();
  if (config && blob && blob.refresh_token) {
    try {
      const next = await refresh(config.supabaseUrl, config.supabaseAnonKey, blob);
      headers.set("Authorization", `Bearer ${next.access_token}`);
      res = await fetch(url, { ...init, headers });
    } catch {
      // fall through to AuthError below
    }
  }

  if (res.status === 401) throw new AuthError();
  return res;
}
