import type { FastifyInstance } from "fastify";
import { persistenceEnabled } from "../db/client.js";
import * as profiles from "../db/repos/profiles.js";
import * as usage from "../db/repos/usage.js";
import { normalizeTier, tierDefinition } from "../tier/tiers.js";
import { billingConfigured, billingProvider } from "../billing/provider.js";

function utcNextMonthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }

    if (!persistenceEnabled) {
      const tier = "pro" as const;
      const def = tierDefinition(tier);
      return {
        user: { id: user.id, email: user.email ?? "dev@local", tier },
        features: [...def.features],
        tierLabel: def.label,
        billingConfigured: billingConfigured(),
        billingProvider: billingProvider(),
        usage: {
          plan: 0,
          agent: 0,
          browser_min: 0,
          tokens_in: 0,
          tokens_out: 0,
          cost_cents: 0,
        },
        quota: {
          plan_limit: 9999,
          agent_limit: 9999,
          browser_min_limit: 9999,
          cost_budget_cents: 999_999,
          period_start: new Date().toISOString().slice(0, 10),
          resets_at: utcNextMonthStartISO(),
        },
      };
    }

    const { profile, quota } = await profiles.getOrCreate(user.id, user.email);
    const used = await usage.summary(user.id);
    const tier = normalizeTier(profile.tier);
    const def = tierDefinition(tier);

    return {
      user: { id: profile.id, email: user.email, tier },
      features: [...def.features],
      tierLabel: def.label,
      billingConfigured: billingConfigured(),
      billingProvider: billingProvider(),
      usage: {
        plan: used.plan,
        agent: used.agent,
        browser_min: used.browser_min,
        tokens_in: used.tokens_in,
        tokens_out: used.tokens_out,
        cost_cents: used.cost_cents,
      },
      quota: {
        plan_limit: quota.plan_limit,
        agent_limit: quota.agent_limit,
        browser_min_limit: quota.browser_min_limit,
        cost_budget_cents: Number(quota.cost_budget_cents ?? 0),
        period_start: quota.period_start?.slice(0, 10),
        resets_at: utcNextMonthStartISO(),
      },
    };
  });

  app.get("/me/usage-history", async (req, reply) => {
    const user = req.user;
    if (!user) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const q = req.query as { limit?: string };
    const limit = q.limit ? Number(q.limit) : 30;
    const events = await usage.listRecent(user.id, Number.isFinite(limit) ? limit : 30);
    return { events };
  });
}
