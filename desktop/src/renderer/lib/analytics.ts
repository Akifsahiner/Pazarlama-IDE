/**
 * Opt-in, privacy-first analytics sink.
 * Props are redacted before any network flush. When telemetry is off, nothing is recorded.
 */
import { redactTelemetryProps } from "@shared/telemetryRedact";

let enabled = false;
let serverUrl: string | null = null;
let clientVersion = "0.0.0";

interface QueuedEvent {
  event: string;
  props?: Record<string, unknown>;
  ts: string;
}

const queue: QueuedEvent[] = [];
const MAX_QUEUE = 100;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function setAnalyticsEnabled(value: boolean): void {
  enabled = value;
  if (!value) {
    queue.length = 0;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
}

export function configureAnalytics(opts: {
  serverUrl?: string;
  clientVersion?: string;
}): void {
  if (opts.serverUrl !== undefined) {
    serverUrl = opts.serverUrl.replace(/\/$/, "") || null;
  }
  if (opts.clientVersion) clientVersion = opts.clientVersion;
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!enabled) return;
  const redacted = redactTelemetryProps(props);
  const payload: QueuedEvent = {
    event,
    props: redacted,
    ts: new Date().toISOString(),
  };
  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${event}`, redacted ?? {});
  }
  queue.push(payload);
  if (queue.length > MAX_QUEUE) queue.shift();
  scheduleFlush();
}

function scheduleFlush(): void {
  if (!serverUrl || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushTelemetry();
  }, 5000);
}

async function flushTelemetry(): Promise<void> {
  if (!enabled || !serverUrl || queue.length === 0) return;
  const batch = queue.splice(0, 50);
  try {
    await fetch(`${serverUrl}/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: batch.map((e) => ({
          event: e.event,
          props: e.props,
          ts: e.ts,
          clientVersion,
        })),
      }),
    });
  } catch {
    queue.unshift(...batch);
    if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;
  }
}

/** Test hook — force immediate flush. */
export function flushAnalyticsForTest(): Promise<void> {
  return flushTelemetry();
}

export function getAnalyticsQueueLengthForTest(): number {
  return queue.length;
}
