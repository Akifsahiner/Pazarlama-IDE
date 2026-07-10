import { randomUUID } from "node:crypto";
import type { BrowserWindow } from "electron";
import type { RunEvent, RunEventStatus, RunEventType } from "../../shared/types";
import { IPC } from "../../shared/ipc";

/** Input to {@link RunEventBus.emit} — seq/id/timestamp are assigned by the bus. */
export interface RunEventInput {
  runId: string;
  stepId?: string;
  type: RunEventType;
  status?: RunEventStatus;
  title: string;
  summary?: string;
  payload?: Record<string, unknown>;
}

/**
 * Unifies execution events from every source (Agent SDK host, tool calls,
 * browser sandbox, file watcher) into one ordered stream with a monotonic
 * per-run `seq`. Pushes to the renderer over IPC and keeps a bounded ring
 * buffer so the renderer can replay from `afterSeq` after a reload.
 *
 * Frame payloads (large base64) are kept in the live push but trimmed from the
 * replay buffer to bound memory.
 */
export class RunEventBus {
  private seqByRun = new Map<string, number>();
  private buffers = new Map<string, RunEvent[]>();
  private readonly bufferLimit = 500;
  private listeners = new Set<(event: RunEvent) => void>();

  constructor(private getWindow: () => BrowserWindow | null) {}

  /** Subscribe to every emitted event. Returns an unsubscribe function. */
  subscribe(listener: (event: RunEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(input: RunEventInput): RunEvent {
    const seq = (this.seqByRun.get(input.runId) ?? 0) + 1;
    this.seqByRun.set(input.runId, seq);

    const event: RunEvent = {
      id: randomUUID(),
      runId: input.runId,
      stepId: input.stepId,
      seq,
      timestamp: new Date().toISOString(),
      type: input.type,
      status: input.status,
      title: input.title,
      summary: input.summary,
      payload: input.payload,
    };

    this.appendToBuffer(event);
    this.getWindow()?.webContents.send(IPC.agent.events, event);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        /* a throwing listener must not break emit */
      }
    }
    return event;
  }

  /** Events for a run with seq > afterSeq (for renderer replay after reload). */
  getSince(runId: string, afterSeq: number): RunEvent[] {
    const buf = this.buffers.get(runId) ?? [];
    return buf.filter((e) => e.seq > afterSeq);
  }

  lastSeq(runId: string): number {
    return this.seqByRun.get(runId) ?? 0;
  }

  private appendToBuffer(event: RunEvent): void {
    const buf = this.buffers.get(event.runId) ?? [];
    // Trim heavy frame payloads from the replay buffer (keep them only live).
    const stored: RunEvent =
      event.type === "browser.frame"
        ? { ...event, payload: { ...event.payload, pngBase64: undefined } }
        : event;
    buf.push(stored);
    if (buf.length > this.bufferLimit) buf.splice(0, buf.length - this.bufferLimit);
    this.buffers.set(event.runId, buf);
  }
}
