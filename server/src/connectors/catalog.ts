import type { ConnectorConnectionStatus } from "./ga4.js";

export type ConnectorProviderId = "ga4" | "meta" | "linkedin" | "hubspot";

export interface ConnectorCatalogEntry {
  id: ConnectorProviderId;
  name: string;
  description: string;
  scope: "read" | "read_write";
  agentTool?: string;
  envConfigured: boolean;
  category: "analytics" | "ads" | "crm" | "social";
  setupHint: string;
}

export function listConnectorCatalog(env: {
  ga4: boolean;
  meta: boolean;
  linkedin: boolean;
  hubspot: boolean;
}): ConnectorCatalogEntry[] {
  return [
    {
      id: "ga4",
      name: "Google Analytics 4",
      description: "Read-only traffic, users, and conversion metrics for launch measurement.",
      scope: "read",
      agentTool: "ga4_query",
      envConfigured: env.ga4,
      category: "analytics",
      setupHint: "GOOGLE_OAUTH_CLIENT_ID + GA4 property ID",
    },
    {
      id: "meta",
      name: "Meta Ads",
      description: "Read-only ad account spend and performance — no in-app publish (Faz 12C).",
      scope: "read",
      agentTool: "meta_ads_read",
      envConfigured: env.meta,
      category: "ads",
      setupHint: "META_OAUTH_APP_ID + ad account ID",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      description: "Company page and campaign read metrics (B2B outreach context).",
      scope: "read",
      envConfigured: env.linkedin,
      category: "social",
      setupHint: "LINKEDIN_OAUTH_CLIENT_ID",
    },
    {
      id: "hubspot",
      name: "HubSpot",
      description: "Read-only CRM contacts and deal pipeline for outbound alignment.",
      scope: "read",
      envConfigured: env.hubspot,
      category: "crm",
      setupHint: "HUBSPOT_OAUTH_CLIENT_ID",
    },
  ];
}

export interface FullConnectorStatus {
  ga4: ConnectorConnectionStatus;
  meta: ConnectorConnectionStatus;
  linkedin: ConnectorConnectionStatus;
  hubspot: ConnectorConnectionStatus;
}
