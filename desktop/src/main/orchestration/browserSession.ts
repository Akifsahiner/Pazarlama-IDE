/**
 * Main-process browser CU session — emits RunEvents on the shared bus.
 */
import type { Finding, OperatorPhase, Persona, RunEvent, RunReport } from "../../shared/types";
import { browserWsUrl } from "../../shared/browserWs";
import type { RunEventBus } from "../runs/eventBus";

type ServerMsg =
  | { type: "ready" }
  | { type: "frame"; pngBase64?: string; action?: string; url?: string; [k: string]: unknown }
  | { type: "status"; message?: string; phase?: OperatorPhase; step?: number; stepMax?: number }
  | { type: "navigated"; url: string; title: string }
  | { type: "finding"; finding: Finding }
  | { type: "approval_request"; id: string; summary: string }
  | { type: "paused" | "resumed" }
  | { type: "done"; report?: RunReport }
  | { type: "error"; message: string };

export interface BrowserSessionOpts {
  runId: string;
  serverUrl: string;
  token: string;
  goal: string;
  autoApprove?: boolean;
  persona?: Persona;
  bus: RunEventBus;
  onClientEvent?: (msg: ServerMsg) => void;
}

export class BrowserToolSession {
  private ws: WebSocket | null = null;
  private started = false;
  private awaitingReady = false;
  private pending: { goal: string; autoApprove: boolean; persona?: Persona } | null = null;

  constructor(private readonly opts: BrowserSessionOpts) {}

  get runId(): string {
    return this.opts.runId;
  }

  start(): void {
    this.close();
    const url = browserWsUrl(this.opts.serverUrl);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit({
        type: "tool.failed",
        status: "failed",
        title: "Browser session",
        summary: message,
      });
      this.emit({ type: "run.failed", status: "failed", title: "Browser failed", summary: message });
      return;
    }
    this.ws = ws;
    this.started = false;
    this.awaitingReady = true;
    this.pending = {
      goal: this.opts.goal,
      autoApprove: this.opts.autoApprove ?? false,
      persona: this.opts.persona,
    };

    this.emit({
      type: "run.created",
      status: "running",
      title: "Browser task",
      summary: this.opts.goal.slice(0, 120),
    });
    this.emit({
      type: "tool.started",
      status: "running",
      title: "browser.session",
      summary: this.opts.goal.slice(0, 120),
      payload: { tool: "browser.session" },
    });

    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as ServerMsg;
        if (msg.type === "ready") {
          this.awaitingReady = false;
          this.flushStart();
          return;
        }
        this.handleServer(msg);
        this.opts.onClientEvent?.(msg);
      } catch {
        /* ignore */
      }
    });
    ws.addEventListener("open", () => {
      if (this.opts.token) {
        ws.send(JSON.stringify({ type: "auth", token: this.opts.token }));
      }
    });
    ws.addEventListener("error", () => {
      this.emit({
        type: "tool.failed",
        status: "failed",
        title: "Browser session",
        summary: "Connection to the browser sandbox failed.",
      });
      this.emit({
        type: "run.failed",
        status: "failed",
        title: "Browser failed",
        summary: "Connection to the browser sandbox failed.",
      });
    });
    ws.addEventListener("close", () => {
      if (this.ws === ws) this.ws = null;
      void this.awaitingReady;
    });
  }

  private flushStart(): void {
    if (!this.ws || this.started || !this.pending) return;
    this.ws.send(
      JSON.stringify({
        type: "start",
        task: this.pending.goal,
        autoApprove: this.pending.autoApprove,
        persona: this.pending.persona,
      }),
    );
    this.pending = null;
    this.started = true;
  }

  private handleServer(msg: ServerMsg): void {
    switch (msg.type) {
      case "frame":
        this.emit({
          type: "browser.frame",
          status: "running",
          title: (msg.action as string) || "Frame",
          payload: msg as unknown as Record<string, unknown>,
        });
        break;
      case "navigated":
        this.emit({
          type: "browser.navigated",
          status: "running",
          title: msg.title || msg.url,
          summary: msg.url,
          payload: { url: msg.url, title: msg.title },
        });
        break;
      case "status":
        this.emit({
          type: "agent.status",
          status: "running",
          title: msg.message || "Browsing…",
          payload: { phase: msg.phase, step: msg.step, stepMax: msg.stepMax },
        });
        break;
      case "finding":
        this.emit({
          type: "evidence.captured",
          status: "success",
          title: "Finding",
          summary: msg.finding?.title ?? msg.finding?.evidence,
          payload: { finding: msg.finding },
        });
        break;
      case "approval_request":
        this.emit({
          type: "approval.required",
          status: "pending",
          title: "Approval required",
          summary: msg.summary,
          payload: { approvalId: msg.id },
        });
        break;
      case "done":
        this.emit({
          type: "tool.completed",
          status: "success",
          title: "browser.session",
          payload: { report: msg.report },
        });
        this.emit({
          type: "run.completed",
          status: "success",
          title: "Browser done",
          payload: { report: msg.report },
        });
        break;
      case "error":
        this.emit({
          type: "tool.failed",
          status: "failed",
          title: "Browser error",
          summary: msg.message,
        });
        this.emit({
          type: "run.failed",
          status: "failed",
          title: "Browser failed",
          summary: msg.message,
        });
        break;
      default:
        break;
    }
  }

  private emit(
    partial: Omit<RunEvent, "id" | "runId" | "seq" | "timestamp"> & {
      type: RunEvent["type"];
    },
  ): void {
    this.opts.bus.emit({
      runId: this.opts.runId,
      ...partial,
    });
  }

  approve(id: string): void {
    this.send({ type: "approve", id });
  }

  reject(id: string): void {
    this.send({ type: "reject", id });
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

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  close(): void {
    this.pending = null;
    this.awaitingReady = false;
    this.started = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* */
      }
      this.ws = null;
    }
  }
}
