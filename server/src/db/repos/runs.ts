import { eq, persistenceEnabled, sb } from "../client.js";

export type RunKind = "edit" | "browse" | "ask";

export interface RunSummaryJson {
  filesChanged?: number;
  findingsCount?: number;
  durationMs?: number;
  intentPreview?: string;
  browserSteps?: number;
  planTaskId?: string;
}

export interface RunRow {
  id: string;
  user_id: string;
  project_id: string | null;
  goal: string;
  status: string;
  kind: RunKind;
  last_seq: number;
  session_id: string | null;
  plan_task_id: string | null;
  local_run_id: string | null;
  summary_json: RunSummaryJson;
  created_at: string;
  updated_at: string;
}

export interface RunEventRow {
  id: string;
  run_id: string;
  seq: number;
  step_id: string | null;
  type: string;
  status: string | null;
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CreateRunInput {
  projectId?: string;
  goal: string;
  kind?: RunKind;
  localRunId?: string;
  sessionId?: string;
  planTaskId?: string;
}

export interface UpdateRunPatch {
  status?: string;
  last_seq?: number;
  summary_json?: RunSummaryJson;
}

export interface InsertEventInput {
  seq: number;
  stepId?: string;
  type: string;
  status?: string;
  title: string;
  summary?: string;
  payload?: Record<string, unknown>;
}

export interface ListRunsOptions {
  projectId?: string;
  kind?: RunKind;
  limit?: number;
  before?: string;
}

function stripPayload(payload?: Record<string, unknown>): Record<string, unknown> {
  if (!payload) return {};
  if (payload.pngBase64 === undefined) return payload;
  return { ...payload, pngBase64: undefined };
}

export async function createRun(userId: string, input: CreateRunInput): Promise<RunRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<RunRow[]>("/runs", {
    method: "POST",
    body: JSON.stringify([
      {
        user_id: userId,
        project_id: input.projectId ?? null,
        goal: input.goal,
        kind: input.kind ?? "edit",
        local_run_id: input.localRunId ?? null,
        session_id: input.sessionId ?? null,
        plan_task_id: input.planTaskId ?? null,
      },
    ]),
  });
  return rows?.[0] ?? null;
}

export async function getRun(userId: string, runId: string): Promise<RunRow | null> {
  if (!persistenceEnabled) return null;
  const rows = await sb<RunRow[]>(`/runs?id=${eq(runId)}&user_id=${eq(userId)}&limit=1`);
  return rows?.[0] ?? null;
}

export async function listRuns(userId: string, opts: ListRunsOptions = {}): Promise<RunRow[]> {
  if (!persistenceEnabled) return [];
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  let q = `/runs?user_id=${eq(userId)}&order=created_at.desc&limit=${limit}`;
  if (opts.projectId) q += `&project_id=${eq(opts.projectId)}`;
  if (opts.kind) q += `&kind=${eq(opts.kind)}`;
  if (opts.before) q += `&created_at=lt.${encodeURIComponent(opts.before)}`;
  return (await sb<RunRow[]>(q)) ?? [];
}

export async function updateRun(
  userId: string,
  runId: string,
  patch: UpdateRunPatch,
): Promise<void> {
  if (!persistenceEnabled) return;
  await sb(`/runs?id=${eq(runId)}&user_id=${eq(userId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

export async function insertEvents(
  userId: string,
  runId: string,
  events: InsertEventInput[],
): Promise<void> {
  if (!persistenceEnabled) return;
  if (events.length === 0) return;
  const run = await getRun(userId, runId);
  if (!run) return;

  const body = events.map((e) => ({
    run_id: runId,
    seq: e.seq,
    step_id: e.stepId ?? null,
    type: e.type,
    status: e.status ?? null,
    title: e.title,
    summary: e.summary ?? null,
    payload: stripPayload(e.payload),
  }));

  await sb("/run_events", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify(body),
  });
}

export async function listEvents(
  userId: string,
  runId: string,
  afterSeq: number,
): Promise<RunEventRow[]> {
  if (!persistenceEnabled) return [];
  const run = await getRun(userId, runId);
  if (!run) return [];
  return (
    (await sb<RunEventRow[]>(
      `/run_events?run_id=${eq(runId)}&seq=gt.${afterSeq}&order=seq.asc`,
    )) ?? []
  );
}

/** Fill summary_json from event aggregates when empty. */
export async function aggregateRunSummary(userId: string, runId: string): Promise<RunSummaryJson> {
  if (!persistenceEnabled) return {};
  const events = await listEvents(userId, runId, 0);
  const files = new Set<string>();
  let findings = 0;
  let browserSteps = 0;
  for (const e of events) {
    if (e.type === "file.patch_created" || e.type === "file.patch_updated") {
      const f = (e.payload as { file?: string } | undefined)?.file;
      if (f) files.add(f);
    }
    if (e.type === "issue.detected" || e.type === "evidence.captured") findings++;
    if (e.type.startsWith("browser.")) browserSteps++;
  }
  return {
    filesChanged: files.size,
    findingsCount: findings,
    browserSteps: browserSteps || undefined,
  };
}
