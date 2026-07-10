import type { ServerRun, ServerRunEventRow } from "@shared/runs";
import type {
  PlanTaskProgressRow,
  PlanTaskStatus,
} from "@shared/planProgress";
import type {
  AgentStreamEvent,
  MarketingPlan,
  MeResponse,
  PlanProgressSummary,
  PlanStreamEvent,
  ProjectProfile,
  ServerAsset,
  ServerMessage,
  ServerProject,
  ServerSession,
  Settings,
} from "@shared/types";
import { authedFetch } from "./http";

export interface HealthResult {
  ok: boolean;
  providers: { anthropic: boolean; openai: boolean };
  connectors?: { ga4OAuth: boolean };
}

/** Public, unauthenticated health probe. */
export async function checkHealth(settings: Settings): Promise<HealthResult | null> {
  try {
    const res = await fetch(`${settings.serverUrl}/healthz`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResult;
  } catch {
    return null;
  }
}

interface HttpError {
  message: string;
  /** Stable code so callers can decide to auto-retry (rate-limit) or surface a fixed copy. */
  code?:
    | "rate_limited"
    | "quota_exceeded"
    | "tier_required"
    | "model_error"
    | "timeout"
    | "internal"
    | "http";
  status: number;
  retryAfterSec?: number;
}

async function parseHttpError(res: Response): Promise<HttpError> {
  const body = await res.text().catch(() => "");
  let parsed: { message?: string; error?: string; detail?: string; retryAfterSec?: number } = {};
  if (body) {
    try {
      parsed = JSON.parse(body);
    } catch {
      // Plain text body — keep it short.
      if (body.length < 200) parsed.message = body;
    }
  }
  const serverCode = parsed.error;
  // Distinguish rate-limit (transient) from quota (terminal until next month).
  if (serverCode === "rate_limited") {
    const retryAfterSec = Number(res.headers.get("retry-after")) || parsed.retryAfterSec || 5;
    return {
      message: `Too many requests — retrying in ${retryAfterSec}s…`,
      code: "rate_limited",
      status: res.status,
      retryAfterSec,
    };
  }
  if (serverCode === "quota_exceeded") {
    return { message: "Monthly quota exceeded.", code: "quota_exceeded", status: res.status };
  }
  if (serverCode === "tier_required") {
    const upgrade = (parsed as { upgradeTo?: string }).upgradeTo;
    return {
      message: upgrade
        ? `Upgrade to ${upgrade} to use this feature.`
        : "This feature requires a paid plan.",
      code: "tier_required",
      status: res.status,
    };
  }
  if (res.status === 429) {
    // No body code → treat as rate-limited (the safer default).
    const retryAfterSec = Number(res.headers.get("retry-after")) || 5;
    return {
      message: `Too many requests — retrying in ${retryAfterSec}s…`,
      code: "rate_limited",
      status: res.status,
      retryAfterSec,
    };
  }
  if (res.status >= 500) {
    return {
      message: parsed.message ?? "The server had a hiccup. Try again.",
      code: "model_error",
      status: res.status,
    };
  }
  return {
    message: parsed.message ?? parsed.detail ?? parsed.error ?? `Request failed (${res.status})`,
    code: "http",
    status: res.status,
  };
}

/** Thrown by streamSSE so callers can switch on `code`. */
export class StreamHttpError extends Error {
  readonly code: HttpError["code"];
  readonly status: number;
  readonly retryAfterSec?: number;
  constructor(e: HttpError) {
    super(e.message);
    this.name = "StreamHttpError";
    this.code = e.code;
    this.status = e.status;
    this.retryAfterSec = e.retryAfterSec;
  }
}

async function streamSSE<T>(
  url: string,
  settings: Settings,
  authEnabled: boolean,
  body: unknown,
  onEvent: (e: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await authedFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
    { authEnabled, apiToken: settings.apiToken },
  );
  if (!res.ok || !res.body) {
    throw new StreamHttpError(await parseHttpError(res));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      if (!json) continue;
      try {
        onEvent(JSON.parse(json) as T);
      } catch {
        // Skip a single malformed event rather than killing the whole stream.
        // The server emits heartbeats as comment lines so a bad data: chunk is
        // best treated as transient noise.
      }
    }
  }
}

export function streamPlan(
  settings: Settings,
  body: {
    profile?: ProjectProfile;
    projectId?: string;
    persona?: "marketing" | "sales";
    planHorizon?: 14 | 30;
  },
  authEnabled: boolean,
  onEvent: (e: PlanStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamSSE(
    `${settings.serverUrl}/plan`,
    settings,
    authEnabled,
    { ...body, provider: settings.provider },
    onEvent,
    signal,
  );
}

export function streamAgent(
  settings: Settings,
  body: {
    sessionId?: string;
    profile?: ProjectProfile;
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    persona?: "marketing" | "sales";
    planProgressSummary?: PlanProgressSummary;
    activeSurface?: string;
    context?: import("@shared/types").AgentTurnContext;
    planSnapshot?: MarketingPlan;
  },
  authEnabled: boolean,
  onEvent: (e: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamSSE(
    `${settings.serverUrl}/agent`,
    settings,
    authEnabled,
    { ...body, provider: settings.provider },
    onEvent,
    signal,
  );
}

async function authedJson<T>(
  settings: Settings,
  path: string,
  authEnabled: boolean,
  init?: RequestInit,
): Promise<T> {
  const res = await authedFetch(
    `${settings.serverUrl}${path}`,
    { headers: { "Content-Type": "application/json" }, ...init },
    { authEnabled, apiToken: settings.apiToken },
  );
  if (!res.ok) throw new StreamHttpError(await parseHttpError(res));
  return (await res.json()) as T;
}

export interface ServerProjectInput {
  name: string;
  source: { kind: "folder" | "repo" | "url"; ref: string };
  framework?: string;
  productType?: string;
  profileJson?: unknown;
}

export function apiGetMe(settings: Settings, authEnabled: boolean): Promise<MeResponse> {
  return authedJson<MeResponse>(settings, "/me", authEnabled);
}

export function apiListProjects(
  settings: Settings,
  authEnabled: boolean,
): Promise<{ projects: ServerProject[] }> {
  return authedJson<{ projects: ServerProject[] }>(settings, "/projects", authEnabled);
}

export function apiCreateProject(
  settings: Settings,
  authEnabled: boolean,
  input: ServerProjectInput,
): Promise<{ project: ServerProject }> {
  return authedJson<{ project: ServerProject }>(settings, "/projects", authEnabled, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function apiListSessions(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
): Promise<{ sessions: ServerSession[] }> {
  return authedJson<{ sessions: ServerSession[] }>(
    settings,
    `/sessions?projectId=${encodeURIComponent(projectId)}`,
    authEnabled,
  );
}

export function apiCreateSession(
  settings: Settings,
  authEnabled: boolean,
  input: { projectId: string; title?: string },
): Promise<{ session: ServerSession }> {
  return authedJson<{ session: ServerSession }>(settings, "/sessions", authEnabled, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function apiListMessages(
  settings: Settings,
  authEnabled: boolean,
  sessionId: string,
): Promise<{ messages: ServerMessage[] }> {
  return authedJson<{ messages: ServerMessage[] }>(
    settings,
    `/sessions/${encodeURIComponent(sessionId)}/messages`,
    authEnabled,
  );
}

export function apiListAssets(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
): Promise<{ assets: ServerAsset[] }> {
  return authedJson<{ assets: ServerAsset[] }>(
    settings,
    `/assets?projectId=${encodeURIComponent(projectId)}`,
    authEnabled,
  );
}

export function apiMarkAssetApplied(
  settings: Settings,
  authEnabled: boolean,
  assetId: string,
  appliedCommit: string,
  appliedPath?: string,
): Promise<{ asset: ServerAsset }> {
  return authedJson<{ asset: ServerAsset }>(
    settings,
    `/assets/${encodeURIComponent(assetId)}/apply`,
    authEnabled,
    {
      method: "POST",
      body: JSON.stringify({ appliedCommit, appliedPath }),
    },
  );
}

export function apiScanProject(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
): Promise<{ project: ServerProject }> {
  return authedJson<{ project: ServerProject }>(
    settings,
    `/projects/${encodeURIComponent(projectId)}/scan`,
    authEnabled,
    { method: "POST", body: "{}" },
  );
}

export function apiListPlans(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
): Promise<{
  plans: ServerPlanRow[];
  latest: ServerPlanRow | null;
}> {
  return authedJson(settings, `/plans?projectId=${encodeURIComponent(projectId)}`, authEnabled);
}

export interface ServerPlanRow {
  id: string;
  project_id: string;
  plan_json: MarketingPlan;
  status: string;
  created_at: string;
}

export function apiListRuns(
  settings: Settings,
  authEnabled: boolean,
  opts?: { projectId?: string; kind?: string; limit?: number; before?: string },
): Promise<{ runs: ServerRun[] }> {
  const params = new URLSearchParams();
  if (opts?.projectId) params.set("projectId", opts.projectId);
  if (opts?.kind) params.set("kind", opts.kind);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.before) params.set("before", opts.before);
  const q = params.toString();
  return authedJson(settings, `/runs${q ? `?${q}` : ""}`, authEnabled);
}

export function apiGetRun(
  settings: Settings,
  authEnabled: boolean,
  runId: string,
): Promise<{ run: ServerRun }> {
  return authedJson(settings, `/runs/${encodeURIComponent(runId)}`, authEnabled);
}

export function apiGetRunEvents(
  settings: Settings,
  authEnabled: boolean,
  runId: string,
  afterSeq = 0,
): Promise<{ events: ServerRunEventRow[] }> {
  return authedJson(
    settings,
    `/runs/${encodeURIComponent(runId)}/events?afterSeq=${afterSeq}`,
    authEnabled,
  );
}

export function apiPatchSession(
  settings: Settings,
  authEnabled: boolean,
  sessionId: string,
  title: string,
): Promise<{ session: ServerSession }> {
  return authedJson<{ session: ServerSession }>(
    settings,
    `/sessions/${encodeURIComponent(sessionId)}`,
    authEnabled,
    { method: "PATCH", body: JSON.stringify({ title }) },
  );
}

export async function apiDeleteSession(
  settings: Settings,
  authEnabled: boolean,
  sessionId: string,
): Promise<void> {
  const res = await authedFetch(
    `${settings.serverUrl}/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
    { authEnabled, apiToken: settings.apiToken },
  );
  if (!res.ok && res.status !== 204) throw new StreamHttpError(await parseHttpError(res));
}

export function apiGetPlanProgress(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
  planId: string,
): Promise<{ planId: string; rows: PlanTaskProgressRow[] }> {
  return authedJson(
    settings,
    `/projects/${encodeURIComponent(projectId)}/plan-progress?planId=${encodeURIComponent(planId)}`,
    authEnabled,
  );
}

export function apiPatchPlanProgress(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
  body: {
    planId: string;
    taskId: string;
    status: PlanTaskStatus;
    lastRunId?: string;
    note?: string;
    playbookId?: string;
  },
): Promise<{ ok: boolean }> {
  return authedJson(
    settings,
    `/projects/${encodeURIComponent(projectId)}/plan-progress`,
    authEnabled,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export function apiReconcilePlanProgress(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
  planId: string,
  opts?: { validTaskIds?: string[] },
): Promise<{ updated: number; rows: PlanTaskProgressRow[] }> {
  return authedJson(
    settings,
    `/projects/${encodeURIComponent(projectId)}/plan-progress/reconcile`,
    authEnabled,
    {
      method: "POST",
      body: JSON.stringify({ planId, validTaskIds: opts?.validTaskIds }),
    },
  );
}

export type ConnectorConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export function apiConnectorStatus(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
): Promise<{ ga4: ConnectorConnectionStatus; meta: ConnectorConnectionStatus }> {
  return authedJson(
    settings,
    `/connectors/status?projectId=${encodeURIComponent(projectId)}`,
    authEnabled,
  );
}

export async function apiStartGa4Connect(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
): Promise<{ authUrl: string; state: string }> {
  return authedJson(settings, "/connectors/ga4/connect", authEnabled, {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
}

export function apiSyncGa4Metrics(
  settings: Settings,
  authEnabled: boolean,
  projectId: string,
): Promise<{ profile: import("@shared/types").MarketingProfile }> {
  return authedJson(settings, "/connectors/ga4/sync", authEnabled, {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
}

export interface ConnectorCatalogEntry {
  id: string;
  name: string;
  description: string;
  scope: string;
  agentTool?: string;
  envConfigured: boolean;
  category: string;
  setupHint: string;
}

export function apiConnectorCatalog(
  settings: Settings,
  authEnabled: boolean,
): Promise<{ connectors: ConnectorCatalogEntry[] }> {
  return authedJson(settings, "/connectors/catalog", authEnabled);
}

export function apiStartConnectorConnect(
  settings: Settings,
  authEnabled: boolean,
  provider: string,
  projectId: string,
): Promise<{ authUrl: string; state: string }> {
  return authedJson(settings, `/connectors/${provider}/connect`, authEnabled, {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
}

export function apiSyncConnector(
  settings: Settings,
  authEnabled: boolean,
  provider: string,
  projectId: string,
): Promise<{ profile?: import("@shared/types").MarketingProfile; snapshot?: unknown }> {
  return authedJson(settings, `/connectors/${provider}/sync`, authEnabled, {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
}

export function apiSubmitFeedback(
  settings: Settings,
  authEnabled: boolean,
  body: {
    projectId?: string;
    targetKind: "decision" | "draft" | "run" | "plan_task";
    targetId: string;
    rating: -1 | 1;
    comment?: string;
    skillId?: string;
    discipline?: string;
  },
): Promise<{ ok: boolean }> {
  return authedJson(settings, "/feedback", authEnabled, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiQualitySummary(
  settings: Settings,
  authEnabled: boolean,
  days = 30,
): Promise<{
  windowDays: number;
  totals: { up: number; down: number; total: number; score: number | null };
  bySkill: Array<{
    skill_id: string | null;
    discipline: string | null;
    up: number;
    down: number;
    total: number;
    score: number;
  }>;
}> {
  return authedJson(settings, `/quality/summary?days=${days}`, authEnabled);
}

export function apiShareReport(
  settings: Settings,
  authEnabled: boolean,
  body: { projectId: string; title: string; reportMd: string; ttlDays?: number },
): Promise<{ share: { token: string; expiresAt: string; urlPath: string } }> {
  return authedJson(settings, "/reports/share", authEnabled, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiTeamOrg(
  settings: Settings,
  authEnabled: boolean,
): Promise<{ org: { id: string; name: string; tier: string }; members: Array<{ user_id: string; role: string }> }> {
  return authedJson(settings, "/team/org", authEnabled);
}

export function apiTeamApprovals(
  settings: Settings,
  authEnabled: boolean,
  projectId?: string,
): Promise<{ approvals: Array<{ id: string; goal: string; status: string; created_at: string }> }> {
  const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return authedJson(settings, `/team/approvals${q}`, authEnabled);
}
