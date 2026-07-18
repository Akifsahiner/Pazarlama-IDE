/**
 * marketing.ask — POST /agent SSE in main, emit RunEvents on the shared bus.
 */
import type { AgentStreamEvent } from "../../shared/types";
import { brainStreamToRunEvent } from "../../shared/brainStreamMap";
import type { CapId } from "../../shared/capability";
import type { PermissionScope } from "../../shared/types";
import type { ToolContext, ToolDef, ToolResult } from "./toolRouter";

/** Active Ask SSE abort controllers — interrupt via abortMarketingAsk(runId). */
const askAborts = new Map<string, AbortController>();

export function abortMarketingAsk(runId: string): void {
  const ac = askAborts.get(runId);
  if (!ac) return;
  ac.abort();
  askAborts.delete(runId);
}

async function readAgentSse(
  serverUrl: string,
  token: string,
  body: Record<string, unknown>,
  onEvent: (e: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${serverUrl.replace(/\/+$/, "")}/agent`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Agent HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => {});
      throw new DOMException("Aborted", "AbortError");
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const idx = buffer.indexOf("\n\n");
      if (idx < 0) break;
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const raw = dataLine.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        onEvent(JSON.parse(raw) as AgentStreamEvent);
      } catch {
        /* ignore bad chunk */
      }
    }
  }
}

export const marketingAskTool: ToolDef = {
  name: "marketing.ask",
  capNeeds: ["backend", "auth", "anthropic"] as CapId[],
  scope: "read_inspect" as PermissionScope,
  async execute(ctx: ToolContext, input: Record<string, unknown>): Promise<ToolResult> {
    const prompt = String(input.prompt ?? "").trim();
    if (!prompt && !input.proactive) {
      return { ok: false, summary: "Missing prompt" };
    }

    let failed = false;
    let lastError = "";
    let seq = 0;
    const ac = new AbortController();
    askAborts.set(ctx.runId, ac);

    try {
      await readAgentSse(
        ctx.serverUrl,
        ctx.sessionToken,
        {
          message: prompt || "(proactive)",
          sessionId: input.sessionId,
          history: input.history ?? [],
          persona: input.persona ?? ctx.persona ?? "marketing",
          profile: input.profile,
          planSnapshot: input.planSnapshot,
          planProgressSummary: input.planProgressSummary,
          context: {
            ...(typeof input.context === "object" && input.context
              ? (input.context as object)
              : {}),
            ...(input.contextPrefix
              ? { local_context_pack: String(input.contextPrefix).slice(0, 12_000) }
              : {}),
          },
          activeSurface: input.activeSurface,
          provider: input.provider ?? "anthropic",
        },
        (event) => {
          seq += 1;
          const runEvent = brainStreamToRunEvent(ctx.runId, event, seq);
          ctx.bus.emit({
            runId: ctx.runId,
            type: runEvent.type,
            status: runEvent.status,
            title: runEvent.title,
            summary: runEvent.summary,
            payload: runEvent.payload,
          });
          if (event.type === "error") {
            failed = true;
            lastError = event.message;
          }
        },
        ac.signal,
      );
    } catch (err) {
      const aborted =
        (err instanceof Error && err.name === "AbortError") ||
        (typeof DOMException !== "undefined" &&
          err instanceof DOMException &&
          err.name === "AbortError");
      if (aborted) {
        ctx.bus.emit({
          runId: ctx.runId,
          type: "run.paused",
          status: "pending",
          title: "Ask stopped",
          summary: "Stopped.",
        });
        return { ok: false, summary: "Stopped" };
      }
      failed = true;
      lastError = err instanceof Error ? err.message : String(err);
      ctx.bus.emit({
        runId: ctx.runId,
        type: "run.failed",
        status: "failed",
        title: "Ask failed",
        summary: lastError,
      });
      return { ok: false, summary: lastError };
    } finally {
      askAborts.delete(ctx.runId);
    }

    // "done" from SSE already mapped to run.completed — avoid double emit
    if (failed) {
      return { ok: false, summary: lastError };
    }
    return { ok: true, summary: "Ask complete" };
  },
};
