import type { PermissionScope } from "../runs/types.js";

/**
 * Tool connector scaffold (Faz 7 — post-MVP).
 *
 * Connectors (HubSpot, Canva, Google Analytics, …) are exposed to the agent as
 * named tools. CRITICAL credential-isolation rule: the agent never sees API
 * tokens. It calls a tool by name with structured args; THIS proxy layer — on
 * the server, outside the agent boundary — injects the real credential and
 * performs the request, then returns a sanitized result.
 *
 * This matches Anthropic's secure Agent SDK guidance: authorized requests are
 * performed by a proxy/tool layer outside the agent, not by the model.
 */

export interface ConnectorToolContext {
  /** Resolved end-user id (for per-user credential lookup + metering). */
  userId: string;
  /** Active project — required for profile-scoped connectors (GA4). */
  projectId?: string;
}

export interface ConnectorTool<Args = Record<string, unknown>, Result = unknown> {
  /** Tool name exposed to the agent (e.g. "hubspot.create_campaign_draft"). */
  name: string;
  /** Permission scope gating this tool in the matrix. */
  scope: PermissionScope;
  /** Human description for approval prompts. */
  description: string;
  /**
   * Execute the tool. Implementations look up the user's credential from a
   * secure store (NOT from args/agent context), call the upstream API, and
   * return a result with any secrets stripped.
   */
  execute(args: Args, ctx: ConnectorToolContext): Promise<Result>;
}

/** In-memory registry of available connector tools. Empty until connectors land. */
export class ConnectorRegistry {
  private tools = new Map<string, ConnectorTool>();

  register(tool: ConnectorTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ConnectorTool | undefined {
    return this.tools.get(name);
  }

  list(): ConnectorTool[] {
    return [...this.tools.values()];
  }
}

export const connectorRegistry = new ConnectorRegistry();
