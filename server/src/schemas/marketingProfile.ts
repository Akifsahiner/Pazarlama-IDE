import { z } from "zod";

/**
 * Marketing Brain's structured project memory. The agent reads this on every
 * turn so it never has to ask the user the same thing twice. Fields are mostly
 * optional so a fresh project can persist a partial profile and grow it over
 * time via `profileBuilder` (auto-inference) + inline questions.
 */

export const experimentRunSchema = z.object({
  id: z.string(),
  date: z.string(),
  hypothesis: z.string(),
  discipline: z.string(),
  outcome: z.enum(["pending", "success", "failure", "inconclusive"]),
  metric: z.object({ name: z.string(), value: z.number() }).optional(),
  learning: z.string().optional(),
  evidence_urls: z.array(z.string()).optional(),
});
export type ExperimentRun = z.infer<typeof experimentRunSchema>;

export const manualKpiSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  target: z.number().optional(),
  unit: z.string().optional(),
  channel: z.string().optional(),
  updated_at: z.string(),
  source: z.literal("manual"),
});
export type ManualKpi = z.infer<typeof manualKpiSchema>;

export const ga4ConnectorSnapshotSchema = z.object({
  fetched_at: z.string(),
  metrics: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      unit: z.string().optional(),
    }),
  ),
});
export type Ga4ConnectorSnapshot = z.infer<typeof ga4ConnectorSnapshotSchema>;

export const outreachIntegrationsSchema = z.object({
  webhook_url: z.string().optional(),
  webhook_provider: z.enum(["lemlist", "instantly", "generic"]).optional(),
});
export type OutreachIntegrations = z.infer<typeof outreachIntegrationsSchema>;

export const campaignMilestoneSchema = z.object({
  label: z.string(),
  at: z.string(),
  kind: z.enum(["phase", "plan", "run", "apply", "asset", "kpi", "complete"]),
});
export type CampaignMilestone = z.infer<typeof campaignMilestoneSchema>;

export const campaignSessionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  goal: z.string(),
  persona: z.enum(["marketing", "sales"]),
  startedAt: z.string(),
  planId: z.string().optional(),
  activeTaskId: z.string().optional(),
  phase: z.enum(["intake", "planning", "executing", "reviewing", "measuring"]),
  milestones: z.array(campaignMilestoneSchema).default([]),
  runIds: z.array(z.string()).default([]),
  assetIds: z.array(z.string()).default([]),
});
export type CampaignSession = z.infer<typeof campaignSessionSchema>;

export const marketingProfileSchema = z.object({
  // Identity
  product_name: z.string().default(""),
  product_description: z.string().default(""),
  category: z.string().default(""),
  business_model: z
    .enum(["saas", "freemium", "marketplace", "agency", "tool", "consumer", ""])
    .default(""),
  price_range: z
    .object({ low: z.number(), high: z.number(), currency: z.string() })
    .optional(),

  // Audience
  target_audience: z
    .array(
      z.object({
        persona: z.string(),
        pains: z.array(z.string()).default([]),
        jobs: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  primary_problem: z.string().default(""),
  main_value_proposition: z.string().default(""),
  differentiators: z.array(z.string()).default([]),

  // Market
  competitors: z
    .array(z.object({ name: z.string(), url: z.string().optional(), note: z.string().optional() }))
    .default([]),
  company_stage: z
    .enum(["idea", "prelaunch", "launched", "growing", "scaling", ""])
    .default(""),
  current_users: z.number().optional(),
  main_markets: z.array(z.string()).default([]),

  // GTM
  available_channels: z.array(z.string()).default([]),
  marketing_goals: z.array(z.string()).default([]),
  brand_voice: z.string().default(""),
  existing_proof: z.array(z.string()).default([]),
  available_assets: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),

  // Memory
  previous_experiments: z.array(experimentRunSchema).default([]),
  successful_experiments: z.array(z.string()).default([]),
  failed_experiments: z.array(z.string()).default([]),
  manual_kpis: z.array(manualKpiSchema).default([]),
  connector_snapshots: z
    .object({
      ga4: ga4ConnectorSnapshotSchema.optional(),
      meta: ga4ConnectorSnapshotSchema.optional(),
    })
    .default({}),
  ga4_oauth: z
    .object({
      refresh_token: z.string(),
      property_id: z.string().optional(),
      connected_at: z.string(),
    })
    .optional(),
  meta_oauth: z
    .object({
      access_token: z.string(),
      ad_account_id: z.string().optional(),
      connected_at: z.string(),
      expires_at: z.string().optional(),
    })
    .optional(),
  linkedin_oauth: z
    .object({
      access_token: z.string(),
      connected_at: z.string(),
    })
    .optional(),
  hubspot_oauth: z
    .object({
      access_token: z.string(),
      refresh_token: z.string().optional(),
      connected_at: z.string(),
    })
    .optional(),
  outreach_integrations: outreachIntegrationsSchema.default({}),

  /** Active marketing campaign thread — plan, runs, assets in one loop (Faz 6). */
  campaign_session: campaignSessionSchema.optional(),

  // Meta
  last_updated: z.string().default(() => new Date().toISOString()),
  confidence_score: z.number().min(0).max(1).default(0),
  gaps: z.array(z.string()).default([]),
});

export type MarketingProfile = z.infer<typeof marketingProfileSchema>;

/** Critical fields the Brain checks before answering a strategic question. */
export const STRATEGIC_FIELDS: Array<keyof MarketingProfile> = [
  "product_name",
  "main_value_proposition",
  "target_audience",
  "company_stage",
  "differentiators",
];

/** Recompute which strategic fields are still empty. */
export function computeGaps(profile: MarketingProfile): string[] {
  const out: string[] = [];
  for (const key of STRATEGIC_FIELDS) {
    const v = profile[key] as unknown;
    if (typeof v === "string" && v.trim().length === 0) out.push(String(key));
    else if (Array.isArray(v) && v.length === 0) out.push(String(key));
  }
  return out;
}

/** Coarse score: fraction of strategic fields filled. */
export function confidenceFromProfile(profile: MarketingProfile): number {
  const total = STRATEGIC_FIELDS.length;
  const filled = total - computeGaps(profile).length;
  return Math.round((filled / total) * 100) / 100;
}
