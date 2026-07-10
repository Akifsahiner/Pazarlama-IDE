import type { AgentTurnContext } from "./types";

const STORAGE_PREFIX = "messageOutbox.v1.";

export interface OutboxEntry {
  id: string;
  createdAt: number;
  projectId: string;
  text: string;
  silent?: boolean;
  context?: AgentTurnContext;
}

export function outboxStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function readRaw(key: string): OutboxEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is OutboxEntry =>
        !!e &&
        typeof e === "object" &&
        typeof (e as OutboxEntry).id === "string" &&
        typeof (e as OutboxEntry).text === "string",
    );
  } catch {
    return [];
  }
}

function writeRaw(key: string, entries: OutboxEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (entries.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    /* quota / private mode */
  }
}

export function loadOutbox(projectId: string): OutboxEntry[] {
  if (!projectId) return [];
  return readRaw(outboxStorageKey(projectId)).sort((a, b) => a.createdAt - b.createdAt);
}

export function saveOutbox(projectId: string, entries: OutboxEntry[]): OutboxEntry[] {
  if (!projectId) return [];
  const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  writeRaw(outboxStorageKey(projectId), sorted);
  return sorted;
}

export function enqueueOutbox(
  projectId: string,
  entry: Omit<OutboxEntry, "id" | "createdAt" | "projectId">,
): OutboxEntry {
  const full: OutboxEntry = {
    id: `ob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    projectId,
    ...entry,
  };
  const next = [...loadOutbox(projectId), full];
  saveOutbox(projectId, next);
  return full;
}

export function removeOutboxEntry(projectId: string, entryId: string): OutboxEntry[] {
  const next = loadOutbox(projectId).filter((e) => e.id !== entryId);
  return saveOutbox(projectId, next);
}

export function peekOutbox(projectId: string): OutboxEntry | undefined {
  return loadOutbox(projectId)[0];
}

export function outboxCount(projectId: string): number {
  return loadOutbox(projectId).length;
}
