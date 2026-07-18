/**
 * Thin client for the backend browser-agent WebSocket.
 * @deprecated Prefer orchestrator `browser.session` / `BrowserToolSession` — direct `.start()` is legacy.
 * Auth: first message `{ type:'auth', token }` when JWT mode; legacy `?token=` also supported.
 * Server responds `{ type:'ready' }` before accepting `start`.
 */

import type {
  FrameMeta,
  Finding,
  OperatorPhase,
  Persona,
  RunReport,
} from "@shared/types";
import { browserWsUrl } from "@shared/browserWs";

export { browserWsUrl };

/** Server → client operator events. */
export type BrowserClientEvent =
  | ({ type: "frame" } & FrameMeta)
  | { type: "status"; message?: string; phase?: OperatorPhase; step?: number; stepMax?: number }
  | { type: "navigated"; url: string; title: string }
  | { type: "finding"; finding: Finding }
  | { type: "approval_request"; id: string; summary: string }
  | { type: "paused" }
  | { type: "resumed" }
  | { type: "done"; report?: RunReport }
  | { type: "error"; message: string };

type ServerEvent = BrowserClientEvent | { type: "ready" };

function closeHint(code: number, reason: string): string | null {
  if (code === 1000) return null;
  if (code === 4401 || code === 1008 || /auth|unauthorized/i.test(reason)) {
    return "Authentication failed. Check your API token in Settings.";
  }
  if (code === 1006) {
    return "Browser connection lost. Is the server running?";
  }
  return reason.trim() || "Browser connection closed unexpectedly.";
}

interface PendingStart {
  task: string;
  autoApprove: boolean;
  persona?: Persona;
}

export class BrowserSocket {
  private ws: WebSocket | null = null;
  private pendingStart: PendingStart | null = null;
  private started = false;
  private awaitingReady = false;

  constructor(private readonly onEvent: (e: BrowserClientEvent) => void) {}

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private flushStart(ws: WebSocket): void {
    const pending = this.pendingStart;
    if (!pending || this.started) return;
    ws.send(
      JSON.stringify({
        type: "start",
        task: pending.task,
        autoApprove: pending.autoApprove,
        persona: pending.persona,
      }),
    );
    this.pendingStart = null;
    this.started = true;
  }

  start(
    serverUrl: string,
    token: string,
    task: string,
    autoApprove: boolean,
    persona?: Persona,
  ): void {
    this.close();
    let ws: WebSocket;
    try {
      ws = new WebSocket(browserWsUrl(serverUrl));
    } catch (err) {
      this.onEvent({ type: "error", message: err instanceof Error ? err.message : String(err) });
      return;
    }
    this.ws = ws;
    this.started = false;
    this.pendingStart = { task, autoApprove, persona };
    this.awaitingReady = true;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as ServerEvent;
        if (msg.type === "ready") {
          this.awaitingReady = false;
          if (this.ws === ws) this.flushStart(ws);
          return;
        }
        this.onEvent(msg);
      } catch {
        /* ignore */
      }
    };
    ws.onopen = () => {
      if (token) ws.send(JSON.stringify({ type: "auth", token }));
    };
    ws.onerror = () => {
      this.onEvent({ type: "error", message: "Connection to the browser sandbox failed." });
    };
    ws.onclose = (ev) => {
      const hint = closeHint(ev.code, ev.reason);
      const wasPending = !!this.pendingStart || this.awaitingReady;
      if (this.ws === ws) this.ws = null;
      this.pendingStart = null;
      this.awaitingReady = false;
      if (hint && (wasPending || !this.started)) {
        this.onEvent({ type: "error", message: hint });
      }
    };
  }

  private send(payload: Record<string, unknown>): void {
    if (this.isOpen) this.ws?.send(JSON.stringify(payload));
  }

  approve(id: string): void {
    this.send({ type: "approve", id });
  }

  reject(id: string): void {
    this.send({ type: "reject", id });
  }

  setAuto(value: boolean): void {
    this.send({ type: "set_auto", value });
  }

  pause(): void {
    this.send({ type: "pause" });
  }

  resume(): void {
    this.send({ type: "resume" });
  }

  steer(text: string): void {
    this.send({ type: "steer", text });
  }

  stop(): void {
    this.send({ type: "stop" });
    this.close();
  }

  private close(): void {
    this.pendingStart = null;
    this.awaitingReady = false;
    this.started = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* already closing */
      }
      this.ws = null;
    }
  }
}
