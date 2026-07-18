import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest, onRequestHookHandler } from "fastify";
import { DEV_USER_ID, devAuthBypass } from "./devBypass.js";
import { env, hasJwt } from "../env.js";

export interface AuthUser {
  id: string;
  email?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

interface JwtPayload {
  sub?: string;
  email?: string;
  aud?: string | string[];
  exp?: number;
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/**
 * Verify a Supabase access token (HS256). Returns the user identity, or null
 * when the token is malformed, has a bad signature, is expired, or has the
 * wrong audience.
 */
export function verifySupabaseJwt(token: string): AuthUser | null {
  if (!env.SUPABASE_JWT_SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string };
  let payload: JwtPayload;
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString("utf8")) as { alg?: string };
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as JwtPayload;
  } catch {
    return null;
  }
  if (header.alg !== "HS256") return null;

  const expected = createHmac("sha256", env.SUPABASE_JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const actual = base64UrlDecode(signatureB64);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  // exp (seconds since epoch) must be in the future.
  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) return null;

  // aud must match when present (some legacy tokens omit it).
  const aud = payload.aud;
  if (aud !== undefined && aud !== null && aud !== "") {
    const audMatches = Array.isArray(aud)
      ? aud.includes(env.SUPABASE_JWT_AUD)
      : aud === env.SUPABASE_JWT_AUD;
    if (!audMatches) return null;
  }

  if (!payload.sub) return null;
  return { id: payload.sub, email: payload.email };
}

/**
 * Verify a Supabase access token locally (HS256) or via Auth API fallback.
 * The fallback handles ES256 signing keys and JWT secret mismatches.
 */
export async function verifySupabaseAccessToken(token: string): Promise<AuthUser | null> {
  const local = verifySupabaseJwt(token);
  if (local) return local;

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string; email?: string };
    if (!user.id) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

function bearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

/**
 * Fastify onRequest hook enforcing authentication and populating `req.user`.
 *
 * Resolution order:
 *  - `/healthz` is public; `/browser` skips (WS authenticates in-route).
 *  - DEV_NO_AUTH → fixed dev user, no token required.
 *  - hasJwt (SUPABASE_JWT_SECRET set) → require a valid Supabase JWT.
 *  - else API_TOKEN set → legacy shared bearer token (self-host without Supabase).
 *  - else → open (local dev), fixed dev user.
 */
export function requireUser(): onRequestHookHandler {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url === "/healthz") return;
    if (req.url === "/config") return;
    if (req.url.startsWith("/browser")) return;
    if (req.url.startsWith("/connectors/") && req.url.includes("/callback")) return;
    if (req.url.startsWith("/reports/shared/")) return;
    if (req.url.startsWith("/billing/webhook")) return;
    // The Anthropic proxy authenticates in-route via x-api-key (the SDK forwards
    // ANTHROPIC_API_KEY there), so it is not gated by the Authorization header.
    if (req.url.startsWith("/anthropic")) return;

    if (devAuthBypass()) {
      req.user = { id: DEV_USER_ID, email: "dev@local" };
      return;
    }

    if (hasJwt) {
      const token = bearer(req);
      const user = token ? await verifySupabaseAccessToken(token) : null;
      if (!user) {
        reply.code(401).send({ error: "unauthorized" });
        return;
      }
      req.user = user;
      return;
    }

    if (env.API_TOKEN) {
      if (bearer(req) !== env.API_TOKEN) {
        reply.code(401).send({ error: "unauthorized" });
        return;
      }
      req.user = { id: DEV_USER_ID, email: "dev@local" };
      return;
    }

    // Fully open self-host/dev: still provide a stable user for persistence.
    req.user = { id: DEV_USER_ID, email: "dev@local" };
  };
}
