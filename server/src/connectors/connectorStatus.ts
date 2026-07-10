import type { MarketingProfile } from "../schemas/marketingProfile.js";
import { ga4ConnectionStatus } from "./ga4.js";
import { metaConnectionStatus } from "./meta.js";
import { linkedInConnectionStatus } from "./linkedin.js";
import { hubSpotConnectionStatus } from "./hubspot.js";
import type { FullConnectorStatus } from "./catalog.js";

export function fullConnectorStatus(profile: MarketingProfile): FullConnectorStatus {
  return {
    ga4: ga4ConnectionStatus(profile),
    meta: metaConnectionStatus(profile),
    linkedin: linkedInConnectionStatus(profile),
    hubspot: hubSpotConnectionStatus(profile),
  };
}

export function legacyConnectorStatus(profile: MarketingProfile): {
  ga4: FullConnectorStatus["ga4"];
  meta: FullConnectorStatus["meta"];
} {
  const full = fullConnectorStatus(profile);
  return { ga4: full.ga4, meta: full.meta };
}
