import type { FastifyInstance } from "fastify";
import { DEV_USER_ID, devAuthBypass } from "../auth/devBypass.js";
import * as profileRepo from "../db/repos/marketingProfile.js";
import {
  buildGa4AuthUrl,
  decodeOAuthState,
  encodeOAuthState,
  exchangeGa4Code,
  fetchReadOnlyGa4Metrics,
  getGa4OAuthConfig,
} from "../connectors/ga4.js";
import { listConnectorCatalog } from "../connectors/catalog.js";
import {
  buildMetaAuthUrl,
  decodeMetaOAuthState,
  encodeMetaOAuthState,
  exchangeMetaCode,
  fetchMetaAdsMetrics,
  getMetaOAuthConfig,
} from "../connectors/meta.js";
import {
  buildLinkedInAuthUrl,
  decodeLinkedInOAuthState,
  encodeLinkedInOAuthState,
  exchangeLinkedInCode,
  getLinkedInOAuthConfig,
} from "../connectors/linkedin.js";
import {
  buildHubSpotAuthUrl,
  decodeHubSpotOAuthState,
  encodeHubSpotOAuthState,
  exchangeHubSpotCode,
  getHubSpotOAuthConfig,
} from "../connectors/hubspot.js";
import { fullConnectorStatus } from "../connectors/connectorStatus.js";

export async function connectorRoutes(app: FastifyInstance): Promise<void> {
  function resolveUserId(req: { user?: { id: string } }): string | null {
    if (devAuthBypass()) return DEV_USER_ID;
    return req.user?.id ?? null;
  }

  app.get("/connectors/status", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const projectId = (req.query as { projectId?: string }).projectId;
    if (!projectId) {
      reply.code(400).send({ error: "projectId_required" });
      return;
    }
    const profile = await profileRepo.get(userId, projectId);
    return fullConnectorStatus(profile);
  });

  app.get("/connectors/catalog", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    return {
      connectors: listConnectorCatalog({
        ga4: !!getGa4OAuthConfig(),
        meta: !!getMetaOAuthConfig(),
        linkedin: !!getLinkedInOAuthConfig(),
        hubspot: !!getHubSpotOAuthConfig(),
      }),
    };
  });

  app.post("/connectors/ga4/connect", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const cfg = getGa4OAuthConfig();
    if (!cfg) {
      reply.code(501).send({
        error: "not_configured",
        message:
          "GA4 OAuth is not configured on this server. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI. Log KPIs manually until then.",
      });
      return;
    }
    const projectId = (req.body as { projectId?: string }).projectId;
    if (!projectId) {
      reply.code(400).send({ error: "projectId_required" });
      return;
    }
    const state = encodeOAuthState({ userId, projectId });
    const authUrl = buildGa4AuthUrl(state);
    if (!authUrl) {
      reply.code(501).send({ error: "not_configured", message: "Could not build GA4 OAuth URL." });
      return;
    }
    return { authUrl, state };
  });

  app.get("/connectors/ga4/callback", async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string };
    if (q.error) {
      reply.type("text/html").send(`<html><body><p>GA4 connect failed: ${q.error}</p></body></html>`);
      return;
    }
    if (!q.code || !q.state) {
      reply.code(400).send({ error: "invalid_callback" });
      return;
    }
    const decoded = decodeOAuthState(q.state);
    if (!decoded) {
      reply.code(400).send({ error: "invalid_state" });
      return;
    }
    const tokens = await exchangeGa4Code(q.code);
    if (!tokens) {
      reply.type("text/html").send("<html><body><p>GA4 token exchange failed.</p></body></html>");
      return;
    }
    const cfg = getGa4OAuthConfig();
    const profile = await profileRepo.upsert(decoded.userId, decoded.projectId, {
      ga4_oauth: {
        refresh_token: tokens.refresh_token,
        property_id: cfg?.propertyId,
        connected_at: new Date().toISOString(),
      },
    });
    const snapshot = await fetchReadOnlyGa4Metrics(profile);
    if (snapshot) {
      await profileRepo.upsert(decoded.userId, decoded.projectId, {
        connector_snapshots: { ...profile.connector_snapshots, ga4: snapshot },
      });
    }
    reply
      .type("text/html")
      .send(
        "<html><body><p>GA4 connected. You can close this tab and return to Marketing IDE.</p></body></html>",
      );
  });

  app.post("/connectors/ga4/sync", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const projectId = (req.body as { projectId?: string }).projectId;
    if (!projectId) {
      reply.code(400).send({ error: "projectId_required" });
      return;
    }
    const profile = await profileRepo.get(userId, projectId);
    if (!profile.ga4_oauth?.refresh_token) {
      reply.code(400).send({ error: "not_connected", message: "Connect GA4 first." });
      return;
    }
    const snapshot = await fetchReadOnlyGa4Metrics(profile);
    if (!snapshot) {
      reply.code(502).send({
        error: "fetch_failed",
        message: "Could not fetch GA4 metrics. Check property ID and OAuth scopes.",
      });
      return;
    }
    const updated = await profileRepo.upsert(userId, projectId, {
      connector_snapshots: { ...profile.connector_snapshots, ga4: snapshot },
    });
    return { profile: updated, snapshot };
  });

  app.post("/connectors/meta/connect", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) return reply.code(401).send({ error: "unauthorized" });
    if (!getMetaOAuthConfig()) {
      return reply.code(501).send({
        error: "not_configured",
        message: "Set META_OAUTH_APP_ID, META_OAUTH_APP_SECRET, META_OAUTH_REDIRECT_URI.",
      });
    }
    const projectId = (req.body as { projectId?: string }).projectId;
    if (!projectId) return reply.code(400).send({ error: "projectId_required" });
    const state = encodeMetaOAuthState({ userId, projectId });
    const authUrl = buildMetaAuthUrl(state);
    if (!authUrl) return reply.code(501).send({ error: "not_configured" });
    return { authUrl, state };
  });

  app.get("/connectors/meta/callback", async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string };
    if (q.error) {
      reply.type("text/html").send(`<html><body><p>Meta connect failed: ${q.error}</p></body></html>`);
      return;
    }
    if (!q.code || !q.state) return reply.code(400).send({ error: "invalid_callback" });
    const decoded = decodeMetaOAuthState(q.state);
    if (!decoded) return reply.code(400).send({ error: "invalid_state" });
    const tokens = await exchangeMetaCode(q.code);
    if (!tokens) {
      reply.type("text/html").send("<html><body><p>Meta token exchange failed.</p></body></html>");
      return;
    }
    const cfg = getMetaOAuthConfig();
    const profile = await profileRepo.upsert(decoded.userId, decoded.projectId, {
      meta_oauth: {
        access_token: tokens.access_token,
        ad_account_id: cfg?.adAccountId,
        connected_at: new Date().toISOString(),
        expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : undefined,
      },
    });
    const snapshot = await fetchMetaAdsMetrics(profile);
    if (snapshot) {
      await profileRepo.upsert(decoded.userId, decoded.projectId, {
        connector_snapshots: { ...profile.connector_snapshots, meta: snapshot },
      });
    }
    reply
      .type("text/html")
      .send("<html><body><p>Meta Ads connected. Return to Marketing IDE.</p></body></html>");
  });

  app.post("/connectors/meta/sync", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) return reply.code(401).send({ error: "unauthorized" });
    const projectId = (req.body as { projectId?: string }).projectId;
    if (!projectId) return reply.code(400).send({ error: "projectId_required" });
    const profile = await profileRepo.get(userId, projectId);
    if (!profile.meta_oauth?.access_token) {
      return reply.code(400).send({ error: "not_connected", message: "Connect Meta Ads first." });
    }
    const snapshot = await fetchMetaAdsMetrics(profile);
    if (!snapshot) {
      return reply.code(502).send({ error: "fetch_failed", message: "Meta Ads insights fetch failed." });
    }
    const updated = await profileRepo.upsert(userId, projectId, {
      connector_snapshots: { ...profile.connector_snapshots, meta: snapshot },
    });
    return { profile: updated, snapshot };
  });

  app.post("/connectors/linkedin/connect", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) return reply.code(401).send({ error: "unauthorized" });
    if (!getLinkedInOAuthConfig()) {
      return reply.code(501).send({ error: "not_configured", message: "Set LINKEDIN_OAUTH_* env vars." });
    }
    const projectId = (req.body as { projectId?: string }).projectId;
    if (!projectId) return reply.code(400).send({ error: "projectId_required" });
    const state = encodeLinkedInOAuthState({ userId, projectId });
    const authUrl = buildLinkedInAuthUrl(state);
    if (!authUrl) return reply.code(501).send({ error: "not_configured" });
    return { authUrl, state };
  });

  app.get("/connectors/linkedin/callback", async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string };
    if (!q.code || !q.state) return reply.code(400).send({ error: "invalid_callback" });
    const decoded = decodeLinkedInOAuthState(q.state);
    if (!decoded) return reply.code(400).send({ error: "invalid_state" });
    const tokens = await exchangeLinkedInCode(q.code);
    if (!tokens) {
      reply.type("text/html").send("<html><body><p>LinkedIn token exchange failed.</p></body></html>");
      return;
    }
    await profileRepo.upsert(decoded.userId, decoded.projectId, {
      linkedin_oauth: { access_token: tokens.access_token, connected_at: new Date().toISOString() },
    });
    reply.type("text/html").send("<html><body><p>LinkedIn connected.</p></body></html>");
  });

  app.post("/connectors/hubspot/connect", async (req, reply) => {
    const userId = resolveUserId(req);
    if (!userId) return reply.code(401).send({ error: "unauthorized" });
    if (!getHubSpotOAuthConfig()) {
      return reply.code(501).send({ error: "not_configured", message: "Set HUBSPOT_OAUTH_* env vars." });
    }
    const projectId = (req.body as { projectId?: string }).projectId;
    if (!projectId) return reply.code(400).send({ error: "projectId_required" });
    const state = encodeHubSpotOAuthState({ userId, projectId });
    const authUrl = buildHubSpotAuthUrl(state);
    if (!authUrl) return reply.code(501).send({ error: "not_configured" });
    return { authUrl, state };
  });

  app.get("/connectors/hubspot/callback", async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string };
    if (!q.code || !q.state) return reply.code(400).send({ error: "invalid_callback" });
    const decoded = decodeHubSpotOAuthState(q.state);
    if (!decoded) return reply.code(400).send({ error: "invalid_state" });
    const tokens = await exchangeHubSpotCode(q.code);
    if (!tokens) {
      reply.type("text/html").send("<html><body><p>HubSpot token exchange failed.</p></body></html>");
      return;
    }
    await profileRepo.upsert(decoded.userId, decoded.projectId, {
      hubspot_oauth: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        connected_at: new Date().toISOString(),
      },
    });
    reply.type("text/html").send("<html><body><p>HubSpot connected.</p></body></html>");
  });
}
