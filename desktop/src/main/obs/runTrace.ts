import { promises as fs } from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { RunEvent } from "../../shared/types";

function tracesDir(): string {
  return path.join(app.getPath("userData"), "traces");
}

export async function appendRunTrace(runId: string, event: RunEvent): Promise<void> {
  try {
    await fs.mkdir(tracesDir(), { recursive: true });
    const file = path.join(tracesDir(), `${runId}.jsonl`);
    const line = JSON.stringify(event) + "\n";
    await fs.appendFile(file, line, "utf8");
  } catch {
    /* tracing must never break runs */
  }
}

export async function listRunTraces(): Promise<
  Array<{ runId: string; bytes: number; mtime: number }>
> {
  try {
    const dir = tracesDir();
    const names = await fs.readdir(dir);
    const out: Array<{ runId: string; bytes: number; mtime: number }> = [];
    for (const name of names) {
      if (!name.endsWith(".jsonl")) continue;
      const st = await fs.stat(path.join(dir, name));
      out.push({
        runId: name.replace(/\.jsonl$/, ""),
        bytes: st.size,
        mtime: st.mtimeMs,
      });
    }
    return out.sort((a, b) => b.mtime - a.mtime).slice(0, 40);
  } catch {
    return [];
  }
}

export async function readRunTrace(runId: string): Promise<RunEvent[]> {
  try {
    const safe = runId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safe) return [];
    const raw = await fs.readFile(path.join(tracesDir(), `${safe}.jsonl`), "utf8");
    const events: RunEvent[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line) as RunEvent);
      } catch {
        /* skip */
      }
    }
    return events;
  } catch {
    return [];
  }
}

export function aggregateUsageFromEvents(events: RunEvent[]): {
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
} {
  let tokens_in = 0;
  let tokens_out = 0;
  let cost_cents = 0;
  for (const e of events) {
    const u = e.payload?.usage as
      | { tokens_in?: number; tokens_out?: number; cost_cents?: number }
      | undefined;
    if (!u) continue;
    tokens_in += u.tokens_in ?? 0;
    tokens_out += u.tokens_out ?? 0;
    cost_cents += u.cost_cents ?? 0;
  }
  return { tokens_in, tokens_out, cost_cents };
}
