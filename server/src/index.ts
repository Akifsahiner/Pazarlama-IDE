import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { devNoAuth, env, hasAnthropic, hasOpenAI, hasSupabase } from "./env.js";
import { registerSecurity } from "./middleware/security.js";
import { requireUser } from "./auth/jwt.js";
import { planRoutes } from "./routes/plan.js";
import { agentRoutes } from "./routes/agent.js";
import { anthropicProxyRoutes } from "./routes/anthropicProxy.js";
import { browserRoutes } from "./routes/browser.js";
import { meRoutes } from "./routes/me.js";
import { projectRoutes } from "./routes/projects.js";
import { runRoutes } from "./routes/runs.js";
import { sessionRoutes } from "./routes/sessions.js";
import { marketingProfileRoutes } from "./routes/marketingProfile.js";
import { connectorRoutes } from "./routes/connectors.js";
import { outreachRoutes } from "./routes/outreach.js";
import { planListRoutes } from "./routes/plans.js";
import { planProgressRoutes } from "./routes/planProgress.js";
import { assetRoutes } from "./routes/assets.js";
import { closeAllBrowserSessions } from "./browser/registry.js";
import { persistenceEnabled } from "./db/client.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { qualityRoutes } from "./routes/quality.js";
import { teamRoutes } from "./routes/team.js";
import { reportRoutes } from "./routes/reports.js";
import { getGa4OAuthConfig } from "./connectors/ga4.js";
import { getMetaOAuthConfig } from "./connectors/meta.js";
import { getLinkedInOAuthConfig } from "./connectors/linkedin.js";
import { getHubSpotOAuthConfig } from "./connectors/hubspot.js";
import "./connectors/ga4Query.js";
import "./connectors/metaAdsQuery.js";

let playwrightOk: boolean | null = null;
let playwrightCheckedAt = 0;

async function checkPlaywright(): Promise<boolean> {
  const now = Date.now();
  if (playwrightOk !== null && now - playwrightCheckedAt < 60_000) return playwrightOk;
  playwrightCheckedAt = now;
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    playwrightOk = true;
  } catch {
    playwrightOk = false;
  }
  return playwrightOk;
}

const app = Fastify({
  logger: true,
  bodyLimit: 5 * 1024 * 1024,
  genReqId: () => crypto.randomUUID(),
});

await app.register(fastifyWebsocket);

// CORS + rate limiting (dependency-free).
registerSecurity(app);

/**
 * Auth gate (Phase 2). Verifies a Supabase JWT when SUPABASE_JWT_SECRET is set;
 * otherwise falls back to the legacy shared API_TOKEN, then to fully-open dev.
 * DEV_NO_AUTH always bypasses. `/healthz` is public and `/browser` authenticates
 * inside the WS handler. Runs AFTER registerSecurity (CORS + rate limit).
 */
app.addHook("onRequest", requireUser());

app.get("/healthz", async (req) => ({
  ok: true,
  requestId: req.id,
  providers: { anthropic: hasAnthropic, openai: hasOpenAI },
  connectors: {
    ga4OAuth: !!getGa4OAuthConfig(),
    metaOAuth: !!getMetaOAuthConfig(),
    linkedinOAuth: !!getLinkedInOAuthConfig(),
    hubspotOAuth: !!getHubSpotOAuthConfig(),
  },
  supabase: hasSupabase,
  db: persistenceEnabled,
  playwright: await checkPlaywright(),
}));

// Public config so the desktop client can run Supabase Auth directly.
// The anon key is a publishable key (safe to expose); the service role key is NOT here.
app.get("/config", async () => ({
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  // DEV_NO_AUTH bypasses JWT on the server — do not prompt desktop sign-in in that mode.
  authEnabled:
    hasSupabase && env.SUPABASE_JWT_SECRET.length > 0 && !(devNoAuth && !persistenceEnabled),
}));

await app.register(meRoutes);
await app.register(projectRoutes);
await app.register(marketingProfileRoutes);
await app.register(connectorRoutes);
await app.register(feedbackRoutes);
await app.register(qualityRoutes);
await app.register(teamRoutes);
await app.register(reportRoutes);
await app.register(outreachRoutes);
await app.register(runRoutes);
await app.register(sessionRoutes);
await app.register(planListRoutes);
await app.register(planProgressRoutes);
await app.register(assetRoutes);
await app.register(planRoutes);
await app.register(agentRoutes);
await app.register(anthropicProxyRoutes);
await app.register(browserRoutes);

await app.listen({ port: env.PORT, host: env.HOST });
if (!hasAnthropic && !hasOpenAI) {
  app.log.warn("No LLM API keys configured — set ANTHROPIC_API_KEY in server/.env");
}
if (devNoAuth && persistenceEnabled) {
  app.log.warn(
    "DEV_NO_AUTH=1 is ignored while Supabase persistence is on — JWT sign-in is required.",
  );
}

// Graceful shutdown: close browser sessions and drain before exit.
async function shutdown(signal: string): Promise<void> {
  app.log.info(`${signal} received — shutting down`);
  try {
    await closeAllBrowserSessions();
    await app.close();
  } finally {
    process.exit(0);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
