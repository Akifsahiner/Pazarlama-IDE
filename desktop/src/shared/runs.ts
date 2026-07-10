import type { RunEvent, RunEventStatus, RunEventType } from "@shared/types";

export type RunKind = "edit" | "browse" | "ask";

export interface RunSummaryJson {
  filesChanged?: number;
  findingsCount?: number;
  durationMs?: number;
  intentPreview?: string;
  browserSteps?: number;
  planTaskId?: string;
}

export interface ArchiveRunItem {
  id: string;
  goal: string;
  status: string;
  kind: RunKind;
  created_at: string;
  summary_json: RunSummaryJson;
  plan_task_id?: string | null;
  source: "cloud" | "local";
}

export interface ServerRun {
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

export interface ServerRunEventRow {
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

/** Local fallback archive entry when cloud persistence is off. */
export interface LocalArchivedRun {
  id: string;
  localRunId: string;
  serverRunId?: string;
  projectId?: string;
  goal: string;
  status: string;
  kind: RunKind;
  summary_json: RunSummaryJson;
  created_at: string;
  events: RunEvent[];
}

export function serverEventToRunEvent(row: ServerRunEventRow, runId: string): RunEvent {
  return {
    id: row.id,
    runId,
    seq: row.seq,
    stepId: row.step_id ?? undefined,
    timestamp: row.created_at,
    type: row.type as RunEventType,
    status: (row.status ?? undefined) as RunEventStatus | undefined,
    title: row.title,
    summary: row.summary ?? undefined,
    payload: row.payload,
  };
}

/** Changed files in a run, excluding selectively discarded patches. */
export function runChangedFiles(events: RunEvent[]): string[] {
  const discarded = new Set<string>();
  const files = new Set<string>();
  for (const e of events) {
    const f = (e.payload as { file?: string } | undefined)?.file;
    if (!f) continue;
    if (e.type === "file.patch_discarded") discarded.add(f);
    if (e.type === "file.patch_created" || e.type === "file.patch_updated") files.add(f);
  }
  for (const f of discarded) files.delete(f);
  return [...files];
}

export function computeRunSummary(events: RunEvent[]): RunSummaryJson {
  const files = new Set(runChangedFiles(events));
  let findings = 0;
  let browserSteps = 0;
  for (const e of events) {
    if (e.type === "file.patch_created" || e.type === "file.patch_updated") {
      /* counted via runChangedFiles */
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
