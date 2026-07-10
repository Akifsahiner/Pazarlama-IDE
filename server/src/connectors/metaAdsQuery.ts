import { z } from "zod";
import type { ConnectorTool } from "./types.js";
import { connectorRegistry } from "./types.js";
import * as profileRepo from "../db/repos/marketingProfile.js";
import { fetchMetaAdsMetrics } from "./meta.js";

const metaAdsArgsSchema = z.object({
  range: z.enum(["7d", "28d", "90d"]).default("28d"),
});

export type MetaAdsQueryArgs = z.infer<typeof metaAdsArgsSchema>;

export type MetaAdsQueryResult =
  | { ok: true; fetched_at: string; metrics: Array<{ name: string; value: number; unit?: string }> }
  | { ok: false; error: string };

export const META_ADS_QUERY_TOOL = {
  name: "meta_ads_read",
  description:
    "Fetch read-only Meta Ads account insights (spend, impressions, clicks) when connected. Use for paid channel performance questions.",
  input_schema: {
    type: "object",
    properties: {
      range: {
        type: "string",
        enum: ["7d", "28d", "90d"],
        description: "Reporting window (Meta API uses last_28d for now).",
      },
    },
  },
} as const;

export const metaAdsQueryTool: ConnectorTool<MetaAdsQueryArgs, MetaAdsQueryResult> = {
  name: "meta_ads_read",
  scope: "read_inspect",
  description: META_ADS_QUERY_TOOL.description,
  async execute(rawArgs, ctx) {
    const args = metaAdsArgsSchema.parse(rawArgs ?? {});
    void args.range;
    if (!ctx.projectId) {
      return { ok: false, error: "No project context — cannot load Meta credentials." };
    }
    const profile = await profileRepo.get(ctx.userId, ctx.projectId);
    if (!profile.meta_oauth?.access_token) {
      return { ok: false, error: "Meta Ads is not connected. Connect in Settings → Connectors." };
    }
    const snapshot = await fetchMetaAdsMetrics(profile);
    if (!snapshot) {
      return { ok: false, error: "Meta Ads query failed — check ad account ID and OAuth scopes." };
    }
    return { ok: true, fetched_at: snapshot.fetched_at, metrics: snapshot.metrics };
  },
};

connectorRegistry.register(metaAdsQueryTool);

export async function executeMetaAdsQuery(
  args: MetaAdsQueryArgs,
  ctx: { userId: string; projectId?: string },
): Promise<MetaAdsQueryResult> {
  return metaAdsQueryTool.execute(args, ctx);
}
