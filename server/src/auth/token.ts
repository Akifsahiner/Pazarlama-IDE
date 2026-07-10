import { DEV_USER_ID, devAuthBypass } from "./devBypass.js";
import { env, hasJwt } from "../env.js";
import { verifySupabaseAccessToken, verifySupabaseJwt, type AuthUser } from "./jwt.js";

/**
 * Resolve a user id from a raw token (no "Bearer " prefix). Shared by surfaces
 * that authenticate outside the standard Authorization header — the browser WS
 * and the Anthropic proxy (which receives the session token as `x-api-key`,
 * because the Agent SDK CLI forwards ANTHROPIC_API_KEY there).
 */
export async function resolveUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (devAuthBypass()) return { id: DEV_USER_ID, email: "dev@local" };
  if (hasJwt && token) return (await verifySupabaseAccessToken(token)) ?? null;
  if (env.API_TOKEN && token === env.API_TOKEN) return { id: DEV_USER_ID, email: "dev@local" };
  if (!hasJwt && !env.API_TOKEN) return { id: DEV_USER_ID, email: "dev@local" };
  return null;
}

/** Sync fast path — local HS256 only (dev bypass + legacy open modes). */
export function resolveUserIdFromToken(token: string | undefined): string | null {
  if (devAuthBypass()) return DEV_USER_ID;
  if (hasJwt && token) return verifySupabaseJwt(token)?.id ?? null;
  if (env.API_TOKEN && token === env.API_TOKEN) return DEV_USER_ID;
  if (!hasJwt && !env.API_TOKEN) return DEV_USER_ID;
  return null;
}
