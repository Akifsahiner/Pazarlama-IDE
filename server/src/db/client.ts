import { env, hasSupabase } from "../env.js";

/** True when a Supabase project + service role key are configured. */
export const persistenceEnabled = hasSupabase;

export interface SbInit extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /** PostgREST Prefer header (e.g. "return=representation"). */
  prefer?: string;
}

/**
 * Low-level PostgREST fetch helper. Uses the service role key, so callers MUST
 * scope every request by user_id explicitly (RLS is bypassed by this key).
 *
 * Throws on non-2xx with the response body for easier debugging. Returns parsed
 * JSON, or null for 204/empty responses.
 */
export async function sb<T = unknown>(path: string, init: SbInit = {}): Promise<T> {
  if (!hasSupabase) {
    throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)");
  }
  const { headers, prefer, ...rest } = init;
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
    ...rest,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer ?? "return=representation",
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase REST ${res.status} ${res.statusText} on ${path}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Encode a value for a PostgREST filter (e.g. `?id=eq.<value>`). */
export function eq(value: string): string {
  return `eq.${encodeURIComponent(value)}`;
}
