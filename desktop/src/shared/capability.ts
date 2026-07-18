/**
 * CapabilityMatrix — single source of truth for what the IDE can do right now.
 * UI must gate on matrix.can* / assertCan, never raw connection.state alone.
 */
import type { ConnectionState, AuthState } from "./runtimeCapability";

export type CapId =
  | "backend"
  | "auth"
  | "anthropic"
  | "local_agent"
  | "computer_use"
  | "ga4"
  | "preview";

export type CapState = "ready" | "checking" | "blocked" | "unavailable";

export type CapFixAction = "signin" | "open_settings" | "retry_health" | "wait" | "none";

export interface CapFix {
  action: CapFixAction;
  /** Exact button copy — never generic "Connect". */
  label: string;
}

export interface Capability {
  id: CapId;
  state: CapState;
  reason?: string;
  fix?: CapFix;
}

export interface CapabilityMatrix {
  updatedAt: number;
  caps: Record<CapId, Capability>;
  canAsk: boolean;
  canEdit: boolean;
  canBrowse: boolean;
  canPlanOffline: boolean;
}

export interface HealthSnapshot {
  connectionState: ConnectionState;
  providers?: { anthropic?: boolean; openai?: boolean };
  connectors?: { ga4OAuth?: boolean };
  authEnabled: boolean;
  authState: AuthState;
  localOnly?: boolean;
  /** Local Agent Host process is spawnable (always true in packaged app). */
  localAgentAvailable?: boolean;
  /** Server advertises browser/CU (default true when backend+anthropic ready). */
  computerUseAvailable?: boolean;
}

function cap(
  id: CapId,
  state: CapState,
  reason?: string,
  fix?: CapFix,
): Capability {
  return { id, state, reason, fix };
}

export function deriveMatrix(input: HealthSnapshot): CapabilityMatrix {
  const {
    connectionState,
    providers,
    connectors,
    authEnabled,
    authState,
    localOnly,
    localAgentAvailable = true,
    computerUseAvailable = true,
  } = input;

  const checking = connectionState === "checking" || connectionState === "unknown";
  const backendUp = connectionState === "connected";
  const anthropicOk = Boolean(providers?.anthropic);
  const signedIn = !authEnabled || authState === "signed-in";
  const authChecking = authEnabled && (authState === "unknown" || authState === "signing-in");

  let backend: Capability;
  if (checking) {
    backend = cap("backend", "checking", "Checking connection…", {
      action: "wait",
      label: "Wait",
    });
  } else if (backendUp) {
    backend = cap("backend", "ready");
  } else {
    backend = cap(
      "backend",
      "blocked",
      localOnly
        ? "Local mode — backend unreachable."
        : "Can't reach the backend.",
      { action: "retry_health", label: "Retry connection" },
    );
  }

  let auth: Capability;
  if (!authEnabled) {
    auth = cap("auth", "ready");
  } else if (authChecking) {
    auth = cap("auth", "checking", "Checking sign-in…", { action: "wait", label: "Wait" });
  } else if (signedIn) {
    auth = cap("auth", "ready");
  } else {
    auth = cap("auth", "blocked", "Sign in to use AI features.", {
      action: "signin",
      label: "Sign in",
    });
  }

  let anthropic: Capability;
  if (!backendUp) {
    anthropic = cap(
      "anthropic",
      checking ? "checking" : "blocked",
      checking ? "Waiting for backend…" : "Backend required for AI.",
      checking
        ? { action: "wait", label: "Wait" }
        : { action: "retry_health", label: "Retry connection" },
    );
  } else if (anthropicOk) {
    anthropic = cap("anthropic", "ready");
  } else {
    anthropic = cap("anthropic", "unavailable", "AI service isn't ready yet.", {
      action: "open_settings",
      label: "Open connection settings",
    });
  }

  const aiReady =
    backend.state === "ready" && auth.state === "ready" && anthropic.state === "ready";

  let local_agent: Capability;
  if (!localAgentAvailable) {
    local_agent = cap("local_agent", "unavailable", "Local agent host unavailable.", {
      action: "none",
      label: "Unavailable",
    });
  } else if (!aiReady) {
    local_agent = cap(
      "local_agent",
      "blocked",
      "AI connection required to run the local agent.",
      primaryFix([backend, auth, anthropic]),
    );
  } else {
    local_agent = cap("local_agent", "ready");
  }

  let computer_use: Capability;
  if (!computerUseAvailable) {
    computer_use = cap("computer_use", "unavailable", "Computer Use is unavailable on this server.", {
      action: "none",
      label: "Unavailable",
    });
  } else if (!aiReady) {
    computer_use = cap(
      "computer_use",
      "blocked",
      "AI connection required for live browser tasks.",
      primaryFix([backend, auth, anthropic]),
    );
  } else {
    computer_use = cap("computer_use", "ready");
  }

  let ga4: Capability;
  if (!backendUp) {
    ga4 = cap("ga4", "unavailable", "Connect backend to sync GA4.", {
      action: "retry_health",
      label: "Retry connection",
    });
  } else if (connectors?.ga4OAuth) {
    ga4 = cap("ga4", "ready");
  } else {
    ga4 = cap("ga4", "unavailable", "GA4 not connected (optional).", {
      action: "open_settings",
      label: "Open connectors",
    });
  }

  const preview = cap("preview", "ready");

  const caps: Record<CapId, Capability> = {
    backend,
    auth,
    anthropic,
    local_agent,
    computer_use,
    ga4,
    preview,
  };

  const canAsk = aiReady;
  const canEdit = canAsk && local_agent.state === "ready";
  const canBrowse = canAsk && computer_use.state === "ready";

  return {
    updatedAt: Date.now(),
    caps,
    canAsk,
    canEdit,
    canBrowse,
    canPlanOffline: true,
  };
}

function primaryFix(caps: Capability[]): CapFix {
  for (const c of caps) {
    if (c.state !== "ready" && c.fix) return c.fix;
  }
  return { action: "open_settings", label: "Open connection settings" };
}

export function assertCan(
  matrix: CapabilityMatrix,
  need: CapId[],
): { ok: true } | { ok: false; missing: Capability[] } {
  const missing = need.filter((id) => matrix.caps[id].state !== "ready").map((id) => matrix.caps[id]);
  if (missing.length === 0) return { ok: true };
  return { ok: false, missing };
}

/** First actionable fix across missing caps — for CTA labels. */
export function firstFix(matrix: CapabilityMatrix, need: CapId[]): CapFix | undefined {
  const result = assertCan(matrix, need);
  if (result.ok) return undefined;
  return primaryFix(result.missing);
}

export function fixLabel(matrix: CapabilityMatrix, need: CapId[]): string {
  return firstFix(matrix, need)?.label ?? "Open connection settings";
}

/** Map legacy RuntimeCapability for gradual migration. */
export function matrixToRuntime(
  matrix: CapabilityMatrix,
): "local" | "connected" | "degraded" {
  if (matrix.canAsk) return "connected";
  if (matrix.caps.backend.state === "ready" && matrix.caps.anthropic.state === "unavailable") {
    return "degraded";
  }
  return "local";
}
