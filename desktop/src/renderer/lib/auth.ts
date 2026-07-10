import type { AuthTokenBlob, ServerConfig } from "@shared/types";

export const AUTH_CALLBACK_URI = "marketingide://auth/callback";

let authConfig: ServerConfig | null = null;
let pendingPkceVerifier: string | null = null;

export function setAuthConfig(config: ServerConfig): void {
  authConfig = config;
}

export function getAuthConfig(): ServerConfig | null {
  return authConfig;
}

export async function fetchConfig(serverUrl: string): Promise<ServerConfig> {
  const res = await fetch(`${serverUrl}/config`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Could not load server config (${res.status})`);
  return (await res.json()) as ServerConfig;
}

async function supabaseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error_description?: string; msg?: string; error?: string };
    return data.error_description ?? data.msg ?? data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

function randomUrlSafe(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[arr[i]! % chars.length];
  return out;
}

async function pkceChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user?: { id: string; email: string };
}

function toBlob(data: TokenResponse, email: string, prev?: AuthTokenBlob | null): AuthTokenBlob {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? prev?.refresh_token ?? "",
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
    email: data.user?.email ?? email,
    userId: data.user?.id ?? prev?.userId ?? "",
  };
}

async function enrichBlobFromUser(
  supabaseUrl: string,
  anon: string,
  blob: AuthTokenBlob,
): Promise<AuthTokenBlob> {
  if (blob.userId && blob.email) {
    await window.api.auth.setTokens(blob);
    return blob;
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${blob.access_token}` },
    });
    if (!res.ok) {
      await window.api.auth.setTokens(blob);
      return blob;
    }
    const user = (await res.json()) as { id?: string; email?: string };
    const enriched = { ...blob, userId: user.id ?? blob.userId, email: user.email ?? blob.email };
    await window.api.auth.setTokens(enriched);
    return enriched;
  } catch {
    await window.api.auth.setTokens(blob);
    return blob;
  }
}

export async function sendCode(supabaseUrl: string, anon: string, email: string): Promise<void> {
  const res = await fetch(`${supabaseUrl}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      create_user: true,
      options: { emailRedirectTo: AUTH_CALLBACK_URI, shouldCreateUser: true },
    }),
  });
  if (!res.ok) throw new Error(await supabaseError(res));
}

export async function verifyCode(
  supabaseUrl: string,
  anon: string,
  email: string,
  code: string,
): Promise<AuthTokenBlob> {
  const res = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, token: code, type: "email" }),
  });
  if (!res.ok) throw new Error(await supabaseError(res));
  return enrichBlobFromUser(supabaseUrl, anon, toBlob((await res.json()) as TokenResponse, email));
}

export async function startGoogleOAuth(supabaseUrl: string, _anon: string): Promise<void> {
  const verifier = randomUrlSafe(64);
  pendingPkceVerifier = verifier;
  const challenge = await pkceChallenge(verifier);
  const redirect = encodeURIComponent(AUTH_CALLBACK_URI);
  await window.api.shell.openExternal(
    `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirect}&code_challenge=${challenge}&code_challenge_method=s256`,
  );
}

async function exchangeAuthCode(
  supabaseUrl: string,
  anon: string,
  code: string,
  verifier: string,
): Promise<AuthTokenBlob> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  });
  if (!res.ok) throw new Error(await supabaseError(res));
  return enrichBlobFromUser(supabaseUrl, anon, toBlob((await res.json()) as TokenResponse, ""));
}

export async function completeAuthFromCallbackUrl(
  url: string,
  supabaseUrl: string,
  anon: string,
): Promise<AuthTokenBlob> {
  const parsed = new URL(url);
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const queryParams = parsed.searchParams;
  const errorDesc = hashParams.get("error_description") ?? queryParams.get("error_description");
  if (errorDesc) throw new Error(decodeURIComponent(errorDesc.replace(/\+/g, " ")));

  const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
  if (accessToken) {
    return enrichBlobFromUser(supabaseUrl, anon, {
      access_token: accessToken,
      refresh_token: hashParams.get("refresh_token") ?? queryParams.get("refresh_token") ?? "",
      expires_at: Date.now() + (Number(hashParams.get("expires_in") ?? queryParams.get("expires_in")) || 3600) * 1000,
      email: "",
      userId: "",
    });
  }

  const code = queryParams.get("code") ?? hashParams.get("code");
  if (!code) throw new Error("Sign-in link did not include credentials.");
  const verifier = pendingPkceVerifier;
  pendingPkceVerifier = null;
  if (!verifier) throw new Error("Sign-in session expired. Click Google again.");
  return exchangeAuthCode(supabaseUrl, anon, code, verifier);
}

export async function refresh(supabaseUrl: string, anon: string, blob: AuthTokenBlob): Promise<AuthTokenBlob> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: blob.refresh_token }),
  });
  if (!res.ok) throw new Error(await supabaseError(res));
  const next = toBlob((await res.json()) as TokenResponse, blob.email, blob);
  await window.api.auth.setTokens(next);
  return next;
}

export async function getValidAccessToken(): Promise<string | null> {
  const blob = await window.api.auth.getTokens();
  if (!blob?.access_token) return null;
  const msLeft = blob.expires_at - Date.now();
  if (msLeft > 60_000) return blob.access_token;
  if (!authConfig || !blob.refresh_token) {
    return msLeft > 0 ? blob.access_token : null;
  }
  try {
    return (await refresh(authConfig.supabaseUrl, authConfig.supabaseAnonKey, blob)).access_token;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  pendingPkceVerifier = null;
  await window.api.auth.clear();
}
