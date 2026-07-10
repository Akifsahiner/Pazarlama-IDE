import { promises as fs } from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { RunEvent } from "../../shared/types";
import type { LocalArchivedRun, RunKind, RunSummaryJson } from "../../shared/runs";
import { computeRunSummary } from "../../shared/runs";

const MAX_RUNS = 50;

function archivePath(): string {
  return path.join(app.getPath("userData"), "activity", "runs.json");
}

interface ArchiveFile {
  runs: LocalArchivedRun[];
}

async function readArchive(): Promise<ArchiveFile> {
  try {
    const raw = await fs.readFile(archivePath(), "utf8");
    return JSON.parse(raw) as ArchiveFile;
  } catch {
    return { runs: [] };
  }
}

async function writeArchive(data: ArchiveFile): Promise<void> {
  const dir = path.dirname(archivePath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(archivePath(), JSON.stringify(data, null, 0), "utf8");
}

function stripEvents(events: RunEvent[]): RunEvent[] {
  return events.map((e) => {
    if (e.payload?.pngBase64) {
      return { ...e, payload: { ...e.payload, pngBase64: undefined } };
    }
    return e;
  });
}

export async function appendLocalRun(input: {
  localRunId: string;
  serverRunId?: string;
  projectId?: string;
  goal: string;
  status: string;
  kind: RunKind;
  events: RunEvent[];
  startedAt: number;
  planTaskId?: string;
}): Promise<LocalArchivedRun> {
  const summary = computeRunSummary(input.events);
  if (input.planTaskId) summary.planTaskId = input.planTaskId;
  summary.durationMs = Math.max(0, Date.now() - input.startedAt);
  summary.intentPreview = input.goal.slice(0, 120);

  const entry: LocalArchivedRun = {
    id: input.serverRunId ?? input.localRunId,
    localRunId: input.localRunId,
    serverRunId: input.serverRunId,
    projectId: input.projectId,
    goal: input.goal,
    status: input.status,
    kind: input.kind,
    summary_json: summary,
    created_at: new Date().toISOString(),
    events: stripEvents(input.events).slice(-400),
  };

  const file = await readArchive();
  file.runs = [entry, ...file.runs.filter((r) => r.localRunId !== input.localRunId)].slice(
    0,
    MAX_RUNS,
  );
  await writeArchive(file);
  return entry;
}

export async function appendBrowseRun(input: {
  goal: string;
  status: "completed" | "failed";
  projectId?: string;
  steps?: number;
  url?: string;
  localRunId?: string;
  events?: RunEvent[];
  startedAt?: number;
  planTaskId?: string;
}): Promise<LocalArchivedRun> {
  if (input.events && input.events.length > 0) {
    const localRunId = input.localRunId ?? `browse-${Date.now()}`;
    return appendLocalRun({
      localRunId,
      projectId: input.projectId,
      goal: input.goal,
      status: input.status,
      kind: "browse",
      events: input.events,
      startedAt: input.startedAt ?? Date.now(),
      planTaskId: input.planTaskId,
    });
  }

  const id = input.localRunId ?? `browse-${Date.now()}`;
  const summary: RunSummaryJson = {
    browserSteps: input.steps ?? 0,
    intentPreview: input.goal.slice(0, 120),
    ...(input.planTaskId ? { planTaskId: input.planTaskId } : {}),
  };
  const entry: LocalArchivedRun = {
    id,
    localRunId: id,
    projectId: input.projectId,
    goal: input.goal,
    status: input.status,
    kind: "browse",
    summary_json: summary,
    created_at: new Date().toISOString(),
    events: input.url
      ? [
          {
            id: entryId(),
            runId: id,
            seq: 1,
            timestamp: new Date().toISOString(),
            type: "browser.navigated",
            title: "Browser task",
            summary: input.url,
          },
        ]
      : [],
  };
  const file = await readArchive();
  file.runs = [entry, ...file.runs.filter((r) => r.localRunId !== id)].slice(0, MAX_RUNS);
  await writeArchive(file);
  return entry;
}

function entryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function listLocalRuns(projectId?: string): Promise<LocalArchivedRun[]> {
  const file = await readArchive();
  if (!projectId) return file.runs;
  return file.runs.filter((r) => !r.projectId || r.projectId === projectId);
}

export async function getLocalRunEvents(runId: string): Promise<RunEvent[] | null> {
  const file = await readArchive();
  const run = file.runs.find((r) => r.id === runId || r.localRunId === runId);
  return run?.events ?? null;
}

export async function getLocalRun(runId: string): Promise<LocalArchivedRun | null> {
  const file = await readArchive();
  return file.runs.find((r) => r.id === runId || r.localRunId === runId) ?? null;
}
