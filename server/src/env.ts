import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  HOST: z.string().default("127.0.0.1"),
  // Comma-separated allowlist of origins for CORS. Empty = allow none (desktop uses file:// / no-origin).
  CORS_ORIGINS: z.string().default(""),
  // Legacy shared bearer token (dev/self-host). Hosted deployments use JWT instead.
  API_TOKEN: z.string().default(""),
  // When "1", auth is bypassed (local development only — never enable in production).
  DEV_NO_AUTH: z.string().default(""),

  ANTHROPIC_API_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  /** Primary model for marketing decisions + chat. Sonnet is fast and strong for marketing/plan work. */
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  /** Fast model for routing/classification (≤500ms). Empty → use ANTHROPIC_MODEL. */
  ANTHROPIC_MODEL_FAST: z.string().default(""),
  /** Optional "deep" model for high-stakes strategic critique. Empty = disabled (use ANTHROPIC_MODEL). */
  ANTHROPIC_MODEL_DEEP: z.string().default(""),
  /** Computer Use (Playwright browser agent). Sonnet is faster and reliable for tool loops. */
  ANTHROPIC_BROWSER_MODEL: z.string().default("claude-sonnet-4-6"),
  /** Narrow fallback when the primary model is unavailable (model_not_found / 4xx). */
  ANTHROPIC_FALLBACK_MODEL: z.string().default("claude-sonnet-4-6"),
  OPENAI_MODEL: z.string().default("gpt-5.5"),

  /** Output token ceilings — override in .env; kept high so plans/decisions are not truncated. */
  ANTHROPIC_MAX_TOKENS_ROUTER: z.coerce.number().default(512),
  ANTHROPIC_MAX_TOKENS_CHAT: z.coerce.number().default(8192),
  ANTHROPIC_MAX_TOKENS_PLAN: z.coerce.number().default(8192),
  ANTHROPIC_MAX_TOKENS_DECISION: z.coerce.number().default(8192),
  ANTHROPIC_MAX_TOKENS_CRITIQUE: z.coerce.number().default(4096),
  /** Deep tier (e.g. Opus) — generous default for long structured output. */
  ANTHROPIC_MAX_TOKENS_DEEP: z.coerce.number().default(16_384),

  // Reliability / safety caps
  LLM_TIMEOUT_MS: z.coerce.number().default(120_000),
  RATE_LIMIT_MAX: z.coerce.number().default(60), // requests
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  BROWSER_MAX_SESSIONS: z.coerce.number().default(4),
  BROWSER_APPROVAL_TIMEOUT_MS: z.coerce.number().default(120_000),
  BROWSER_MAX_STEPS: z.coerce.number().default(40),
  BROWSER_VIEWPORT_WIDTH: z.coerce.number().default(1280),
  BROWSER_VIEWPORT_HEIGHT: z.coerce.number().default(800),
  /** When "1", only allow navigation to BROWSER_ALLOW_HOSTS (comma-separated suffixes). */
  BROWSER_STRICT_ALLOWLIST: z.string().default(""),
  /** Comma-separated hostname suffixes allowed when strict allowlist is on. */
  BROWSER_ALLOW_HOSTS: z.string().default(
    "google.com,bing.com,duckduckgo.com,reddit.com,producthunt.com,linkedin.com,twitter.com,x.com,youtube.com,github.com,stackoverflow.com",
  ),

  // Supabase (Phase 2). Optional until hosted auth is enabled.
  SUPABASE_URL: z.string().default(""),
  SUPABASE_ANON_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  SUPABASE_JWT_AUD: z.string().default("authenticated"),
  // HS256 secret used to verify Supabase access tokens. Empty = JWT auth disabled.
  SUPABASE_JWT_SECRET: z.string().default(""),

  // Billing provider: "paddle" (production) or "stripe" (legacy). Auto-detects when empty.
  BILLING_PROVIDER: z.enum(["", "paddle", "stripe"]).default(""),
  BILLING_SUCCESS_URL: z.string().default("marketingide://billing/success"),
  BILLING_CANCEL_URL: z.string().default("marketingide://billing/cancel"),

  // Paddle Billing (production default). Empty = checkout returns billing_not_configured.
  PADDLE_API_KEY: z.string().default(""),
  PADDLE_WEBHOOK_SECRET: z.string().default(""),
  PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  PADDLE_PRICE_PRO: z.string().default(""),
  PADDLE_PRICE_TEAM: z.string().default(""),

  // Stripe billing (legacy). Empty = ignored when Paddle is configured.
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_PRICE_PRO: z.string().default(""),
  STRIPE_PRICE_TEAM: z.string().default(""),
  STRIPE_SUCCESS_URL: z.string().default("marketingide://billing/success"),
  STRIPE_CANCEL_URL: z.string().default("marketingide://billing/cancel"),
});

export const env = schema.parse(process.env);

export const hasAnthropic = env.ANTHROPIC_API_KEY.length > 0;
export const hasOpenAI = env.OPENAI_API_KEY.length > 0;
export const hasSupabase = env.SUPABASE_URL.length > 0 && env.SUPABASE_SERVICE_ROLE_KEY.length > 0;
export const hasJwt = env.SUPABASE_JWT_SECRET.length > 0;
export const devNoAuth = env.DEV_NO_AUTH === "1";

/** Fixed user id used in DEV_NO_AUTH mode so local rows have a stable owner. */
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const browserStrictAllowlist = env.BROWSER_STRICT_ALLOWLIST === "1";
export const browserAllowHosts = env.BROWSER_ALLOW_HOSTS.split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
