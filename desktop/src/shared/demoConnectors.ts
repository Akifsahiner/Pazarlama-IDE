/** localStorage key — demo connector feed (dev builds only). */
export const DEMO_CONNECTOR_ENABLED_KEY = "demo.connector.enabled";

export const DEMO_CONNECTOR_FEED_PREFIX = "demo.connector.feed";

/** True when mock connector feed may be seeded (never in production builds). */
export function isDemoConnectorsAllowed(isProd = import.meta.env.PROD): boolean {
  if (isProd) return false;
  try {
    return localStorage.getItem(DEMO_CONNECTOR_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoConnectorsEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEMO_CONNECTOR_ENABLED_KEY, "1");
    else localStorage.removeItem(DEMO_CONNECTOR_ENABLED_KEY);
  } catch {
    // ignore
  }
}

export function readDemoConnectorsEnabled(): boolean {
  try {
    return localStorage.getItem(DEMO_CONNECTOR_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}
