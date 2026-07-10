import type { FastifyInstance, FastifyRequest } from "fastify";
import { env, hasAnthropic } from "../env.js";
import { resolveUserFromToken } from "../auth/token.js";
import { assertTierAndQuota } from "../middleware/tierGate.js";
import { sendMeteringError } from "../middleware/meteringErrors.js";
import * as usage from "../db/repos/usage.js";

const ANTHROPIC_API = "https://api.anthropic.com";

/**
 * Cloud Anthropic proxy (ADR-2). The Local Agent Host points the Claude Agent
 * SDK at `${serverUrl}/anthropic` via ANTHROPIC_BASE_URL, and passes the user's
 * session token as ANTHROPIC_API_KEY. The CLI forwards that token as `x-api-key`.
 */
export async function anthropicProxyRoutes(app: FastifyInstance): Promise<void> {
  app.all("/anthropic/*", async (req, reply) => {
    if (!hasAnthropic) {
      reply.code(503).send({ error: "anthropic_not_configured" });
      return;
    }

    const sessionToken =
      (req.headers["x-api-key"] as string | undefined) ??
      (req.headers.authorization?.replace(/^Bearer\s+/i, ""));
    const user = await resolveUserFromToken(sessionToken?.trim() || undefined);
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const userId = user.id;

    try {
      await assertTierAndQuota(userId, "agent");
    } catch (err) {
      if (sendMeteringError(reply, err)) return;
      throw err;
    }

    const upstreamPath = req.url.replace(/^\/anthropic/, "");
    const upstreamUrl = `${ANTHROPIC_API}${upstreamPath}`;

    const headers = buildUpstreamHeaders(req);
    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body ?? {});

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, { method: req.method, headers, body });
    } catch (err) {
      reply.code(502).send({ error: "upstream_unreachable", detail: String(err) });
      return;
    }

    reply.code(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) reply.header("content-type", contentType);
    const requestId = upstream.headers.get("request-id");
    if (requestId) reply.header("request-id", requestId);

    const isSse =
      contentType?.includes("text/event-stream") ||
      req.headers.accept?.includes("text/event-stream");

    if (!upstream.body) {
      const text = await upstream.text();
      void recordAgentUsage(userId, parseJsonUsage(text)).catch(() => {});
      reply.send(text);
      return;
    }

    if (!isSse) {
      const text = await upstream.text();
      void recordAgentUsage(userId, parseJsonUsage(text)).catch(() => {});
      reply.send(text);
      return;
    }

    reply.hijack();
    const res = reply.raw;
    res.writeHead(upstream.status, {
      "content-type": contentType ?? "text/event-stream",
      ...(requestId ? { "request-id": requestId } : {}),
    });

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        res.write(Buffer.from(value));
        sseBuffer += decoder.decode(value, { stream: true });
      }
      sseBuffer += decoder.decode();
    } catch {
      /* client/upstream dropped */
    } finally {
      res.end();
      void recordAgentUsage(userId, parseSseUsage(sseBuffer)).catch(() => {});
    }
  });
}

function buildUpstreamHeaders(req: FastifyRequest): Record<string, string> {
  const out: Record<string, string> = {
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": (req.headers["anthropic-version"] as string) ?? "2023-06-01",
    "content-type": "application/json",
  };
  const beta = req.headers["anthropic-beta"];
  if (typeof beta === "string") out["anthropic-beta"] = beta;
  const accept = req.headers.accept;
  if (typeof accept === "string") out.accept = accept;
  return out;
}

interface TokenPair {
  tokensIn: number;
  tokensOut: number;
}

function parseJsonUsage(text: string): TokenPair {
  try {
    const json = JSON.parse(text) as {
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      tokensIn: json.usage?.input_tokens ?? 0,
      tokensOut: json.usage?.output_tokens ?? 0,
    };
  } catch {
    return { tokensIn: 0, tokensOut: 0 };
  }
}

/** Parse Anthropic SSE for final message_delta / message_stop usage blocks. */
function parseSseUsage(buffer: string): TokenPair {
  let tokensIn = 0;
  let tokensOut = 0;
  for (const block of buffer.split("\n\n")) {
    const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) continue;
    const payload = dataLine.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const evt = JSON.parse(payload) as {
        type?: string;
        usage?: { input_tokens?: number; output_tokens?: number };
        message?: { usage?: { input_tokens?: number; output_tokens?: number } };
      };
      const u = evt.usage ?? evt.message?.usage;
      if (!u) continue;
      if (typeof u.input_tokens === "number") tokensIn = Math.max(tokensIn, u.input_tokens);
      if (typeof u.output_tokens === "number") tokensOut = Math.max(tokensOut, u.output_tokens);
    } catch {
      /* skip malformed SSE JSON */
    }
  }
  return { tokensIn, tokensOut };
}

async function recordAgentUsage(userId: string, tokens: TokenPair): Promise<void> {
  await usage.insert(userId, {
    kind: "agent",
    tokens_in: tokens.tokensIn,
    tokens_out: tokens.tokensOut,
  });
}
