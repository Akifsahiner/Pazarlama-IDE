import { z } from "zod";
import * as profileRepo from "../db/repos/marketingProfile.js";
import type { ConnectorTool } from "./types.js";
import { connectorRegistry } from "./types.js";
import { queryMetrics, type Ga4DateRange } from "./ga4.js";

const ga4QueryArgsSchema = z.object({
  range: z.enum(["7d", "28d", "90d"]).default("28d"),
});

export type Ga4QueryArgs = z.infer<typeof ga4QueryArgsSchema>;

export type Ga4QueryResult =
  | { ok: true; range: Ga4DateRange; fetched_at: string; metrics: Array<{ name: string; value: number; unit?: string }> }
  | { ok: false; error: string };

/** Anthropic tool schema — agent calls this when GA4 OAuth is connected. */
export const GA4_QUERY_TOOL = {
  name: "ga4_query",
  description:
    "Fetch read-only Google Analytics 4 metrics (sessions, activeUsers, conversions) for the connected property. Use when the user asks about traffic, conversions, or launch performance.",
  input_schema: {
    type: "object",
    properties: {
      range: {
        type: "string",
        enum: ["7d", "28d", "90d"],
        description: "Reporting window (default 28d).",
      },
    },
  },
} as const;

export const ga4QueryTool: ConnectorTool<Ga4QueryArgs, Ga4QueryResult> = {
  name: "ga4_query",
  scope: "read_inspect",
  description: GA4_QUERY_TOOL.description,
  async execute(rawArgs, ctx) {
    const args = ga4QueryArgsSchema.parse(rawArgs ?? {});
    if (!ctx.projectId) {
      return { ok: false, error: "No project context — cannot load GA4 credentials." };
    }
    const profile = await profileRepo.get(ctx.userId, ctx.projectId);
    if (!profile.ga4_oauth?.refresh_token) {
      return { ok: false, error: "GA4 is not connected for this project. Suggest manual KPI logging." };
    }
    const snapshot = await queryMetrics(profile, args.range);
    if (!snapshot) {
      return { ok: false, error: "GA4 query failed — check property ID and OAuth scopes." };
    }
    return {
      ok: true,
      range: args.range,
      fetched_at: snapshot.fetched_at,
      metrics: snapshot.metrics,
    };
  },
};

connectorRegistry.register(ga4QueryTool);

export async function executeGa4Query(
  args: Ga4QueryArgs,
  ctx: { userId: string; projectId?: string },
): Promise<Ga4QueryResult> {
  return ga4QueryTool.execute(args, ctx);
}
