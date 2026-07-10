import type { Settings } from "@shared/types";
import { getValidAccessToken } from "./auth";

/** Resolves the Bearer token for backend HTTP/WS (JWT, legacy API_TOKEN, or empty in open dev). */
export async function resolveBackendToken(
  settings: Settings,
  authEnabled: boolean,
): Promise<string> {
  if (authEnabled) {
    return (await getValidAccessToken()) ?? "";
  }
  return settings.apiToken.trim();
}
