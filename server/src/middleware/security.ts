import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { corsOrigins, env } from "../env.js";

/**
 * Dependency-free CORS + in-memory rate limiting.
 * (Avoids extra packages; sufficient for a single-instance hosted node. For
 * multi-instance scale, swap the limiter for a shared store later.)
 */

function applyCors(req: FastifyRequest, reply: FastifyReply): boolean {
  const origin = req.headers.origin;
  // No Origin header (Electron file://, same-origin, curl) → allow.
  if (!origin) return true;
  if (corsOrigins.length === 0) {
    // Default-permissive for desktop clients that send an origin in dev.
    reply.header("Access-Control-Allow-Origin", origin);
  } else if (corsOrigins.includes(origin)) {
    reply.header("Access-Control-Allow-Origin", origin);
  } else {
    reply.code(403).send({ error: "cors_forbidden" });
    return false;
  }
  reply.header("Vary", "Origin");
  reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  reply.header("Access-Control-Allow-Headers", "authorization,content-type");
  reply.header("Access-Control-Max-Age", "86400");
  return true;
}

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

function rateKey(req: FastifyRequest): string {
  const auth = req.headers.authorization;
  if (auth) return `t:${auth.slice(-24)}`;
  return `ip:${req.ip}`;
}

function checkRate(req: FastifyRequest, reply: FastifyReply): boolean {
  // Only limit the expensive work endpoints; health/me are cheap. The Anthropic
  // proxy carries agent loops that exceed a per-minute cap by design — Anthropic
  // enforces its own upstream limits, so we don't double-limit here.
  if (req.url === "/healthz") return true;
  if (req.url.startsWith("/anthropic")) return true;
  const key = rateKey(req);
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + env.RATE_LIMIT_WINDOW_MS });
    return true;
  }
  b.count += 1;
  if (b.count > env.RATE_LIMIT_MAX) {
    const retry = Math.ceil((b.resetAt - now) / 1000);
    reply.header("Retry-After", String(retry));
    reply.code(429).send({ error: "rate_limited", retryAfterSec: retry });
    return false;
  }
  return true;
}

// Periodic cleanup of stale buckets.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
}, 60_000).unref();

export function registerSecurity(app: FastifyInstance): void {
  app.addHook("onRequest", async (req, reply) => {
    if (!applyCors(req, reply)) return;
    if (req.method === "OPTIONS") {
      reply.code(204).send();
      return;
    }
    if (!checkRate(req, reply)) return;
  });
}
