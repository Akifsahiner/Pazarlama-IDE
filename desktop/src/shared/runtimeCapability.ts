export type RuntimeCapability = "local" | "connected" | "degraded";

export type ConnectionState = "unknown" | "checking" | "connected" | "error";

export type AuthState = "unknown" | "signed-in" | "signed-out" | "signing-in";

export interface RuntimeCapabilityInput {
  connectionState: ConnectionState;
  providers?: { anthropic?: boolean; openai?: boolean };
  authEnabled: boolean;
  authState: AuthState;
  /** User chose Continue offline / local exploration from splash. */
  localOnly?: boolean;
}

export interface RuntimeCapabilityResult {
  capability: RuntimeCapability;
  blockReason?: string;
  connectAction?: "signin" | "settings" | "wait";
}

export function resolveRuntimeCapability(input: RuntimeCapabilityInput): RuntimeCapabilityResult {
  const { connectionState, providers, authEnabled, authState, localOnly } = input;

  if (connectionState === "checking" || connectionState === "unknown") {
    return { capability: "local", blockReason: "Checking connection…", connectAction: "wait" };
  }

  if (connectionState !== "connected") {
    return {
      capability: "local",
      blockReason: localOnly
        ? "Local mode — connect for AI features."
        : "Can't reach the backend. Sign in or check your connection.",
      connectAction: authEnabled && authState !== "signed-in" ? "signin" : "settings",
    };
  }

  if (!providers?.anthropic) {
    return {
      capability: "degraded",
      blockReason: "AI service isn't ready yet. Try again shortly or check connection settings.",
      connectAction: "settings",
    };
  }

  if (authEnabled && authState !== "signed-in") {
    return {
      capability: "local",
      blockReason: "Sign in to use AI features.",
      connectAction: "signin",
    };
  }

  return { capability: "connected" };
}

export type SetupChecklistStatus = "pending" | "checking" | "ok" | "error" | "unavailable" | "optional";

export interface SetupChecklist {
  server: SetupChecklistStatus;
  anthropic: SetupChecklistStatus;
  ga4: SetupChecklistStatus;
}

export function buildSetupChecklist(input: {
  connectionState: ConnectionState;
  providers?: { anthropic?: boolean };
  connectors?: { ga4OAuth?: boolean };
}): SetupChecklist {
  const { connectionState, providers, connectors } = input;

  let server: SetupChecklistStatus = "pending";
  if (connectionState === "checking") server = "checking";
  else if (connectionState === "connected") server = "ok";
  else if (connectionState === "error") server = "error";

  let anthropic: SetupChecklistStatus = "pending";
  if (connectionState === "connected") {
    anthropic = providers?.anthropic ? "ok" : "unavailable";
  }

  let ga4: SetupChecklistStatus = "optional";
  if (connectionState === "connected") {
    ga4 = connectors?.ga4OAuth ? "ok" : "unavailable";
  }

  return { server, anthropic, ga4 };
}

export function canRunAgent(capability: RuntimeCapability): boolean {
  return capability === "connected";
}

/** Re-export matrix helpers for callers that import from this module. */
export { deriveMatrix, assertCan, fixLabel } from "./capability";
export type { CapabilityMatrix, CapId, Capability } from "./capability";
