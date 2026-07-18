import { randomUUID } from "node:crypto";
import { query, type Query } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionPolicy, PermissionScope } from "../../shared/types";
import { DEFAULT_PERMISSION_POLICY } from "../../shared/types";
import type { RunEventBus } from "../runs/eventBus";
import { scopeForTool } from "./scopes";

export interface StartRunInput {
  runId: string;
  /** Working directory for the agent (the run's git worktree). */
  cwd: string;
  /** Natural-language goal / first user turn. */
  goal: string;
  /** Cloud Anthropic proxy base URL (ANTHROPIC_BASE_URL). */
  baseUrl: string;
  /** User session token, forwarded by the SDK as ANTHROPIC_API_KEY → x-api-key. */
  sessionToken: string;
  /** Permission matrix; defaults to the product policy. */
  policy?: PermissionPolicy;
  /** Skills to enable (names). Empty/undefined → all discovered. */
  skills?: string[];
  /** Absolute paths to skill plugin directories to load. */
  pluginPaths?: string[];
  /** Auto-retrieved ContextPack text prepended to the prompt. */
  contextPrefix?: string;
  /** Faz 4 — optional mid-run browser verify (orchestrator reuse). */
  browserVerify?: (input: {
    url: string;
    checklist: string[];
  }) => Promise<{ ok: boolean; summary?: string }>;
}

/**
 * Asks the renderer for approval of a gated action. Resolves true (approved) or
 * false (rejected). Implemented by the IPC layer.
 */
export type ApprovalAsker = (req: {
  runId: string;
  approvalId: string;
  scope: PermissionScope;
  intent: string;
}) => Promise<boolean>;

interface ActiveRun {
  query: Query;
  cancelled: boolean;
}

/**
 * Local Agent Host (ADR-1). Runs the Claude Agent SDK in-process (the SDK itself
 * spawns an isolated CLI subprocess), translating SDK messages into the unified
 * RunEvent stream and enforcing the permission matrix via `canUseTool`.
 *
 * The real Anthropic key never lives here: the SDK is pointed at the cloud proxy
 * via ANTHROPIC_BASE_URL and authenticates with the user's session token.
 */
export class AgentHost {
  private runs = new Map<string, ActiveRun>();
  /** Cumulative assistant text — emit deltas when successive messages grow a prefix. */
  private assistantText = new Map<string, string>();

  constructor(
    private bus: RunEventBus,
    private askApproval: ApprovalAsker,
  ) {}

  async startRun(input: StartRunInput): Promise<void> {
    const policy = input.policy ?? DEFAULT_PERMISSION_POLICY;
    const { runId } = input;

    this.bus.emit({
      runId,
      type: "run.created",
      status: "running",
      title: "Run started",
      summary: input.goal,
    });

    const canUseTool = async (
      toolName: string,
      toolInput: Record<string, unknown>,
    ): Promise<
      | { behavior: "allow"; updatedInput: Record<string, unknown> }
      | { behavior: "deny"; message: string }
    > => {
      const scope = scopeForTool(toolName);
      const level = policy[scope];

      if (level === "never") {
        this.bus.emit({
          runId,
          type: "tool.failed",
          status: "failed",
          title: `Blocked: ${toolName}`,
          summary: `Policy forbids ${scope}.`,
          payload: { tool: toolName, scope },
        });
        return { behavior: "deny", message: `Policy forbids ${scope}.` };
      }

      if (toolName.toLowerCase() === "browser_verify" && input.browserVerify) {
        const url = String(toolInput.url ?? "");
        const checklist = Array.isArray(toolInput.checklist)
          ? (toolInput.checklist as string[])
          : [];
        this.bus.emit({
          runId,
          type: "tool.started",
          status: "running",
          title: "browser_verify",
          summary: url || "verify checklist",
          payload: { tool: toolName, scope },
        });
        try {
          const result = await input.browserVerify({ url, checklist });
          this.bus.emit({
            runId,
            type: result.ok ? "tool.completed" : "tool.failed",
            status: result.ok ? "success" : "failed",
            title: "browser_verify",
            summary: result.summary,
          });
          return {
            behavior: "deny",
            message: JSON.stringify(result),
          };
        } catch (err) {
          const summary = err instanceof Error ? err.message : String(err);
          this.bus.emit({
            runId,
            type: "tool.failed",
            status: "failed",
            title: "browser_verify",
            summary,
          });
          return { behavior: "deny", message: summary };
        }
      }

      if (level === "ask" || level === "always_ask") {
        const approvalId = randomUUID();
        this.bus.emit({
          runId,
          type: "approval.required",
          status: "pending",
          title: toolName,
          summary: describeTool(toolName, toolInput),
          payload: { approvalId, scope, intent: describeTool(toolName, toolInput), tool: toolName },
        });
        const ok = await this.askApproval({
          runId,
          approvalId,
          scope,
          intent: describeTool(toolName, toolInput),
        });
        if (!ok) {
          this.bus.emit({
            runId,
            type: "tool.failed",
            status: "failed",
            title: `Rejected: ${toolName}`,
            payload: { tool: toolName, scope },
          });
          return { behavior: "deny", message: "User rejected this action." };
        }
      }

      this.bus.emit({
        runId,
        type: "tool.started",
        status: "running",
        title: describeTool(toolName, toolInput),
        payload: { tool: toolName, scope },
      });
      return { behavior: "allow", updatedInput: toolInput };
    };

    const prompt = input.contextPrefix?.trim()
      ? `${input.contextPrefix.trim()}\n\n---\n\n# User goal\n${input.goal}`
      : input.goal;

    const q = query({
      prompt,
      options: {
        cwd: input.cwd,
        env: {
          ...process.env,
          ANTHROPIC_BASE_URL: input.baseUrl,
          ANTHROPIC_API_KEY: input.sessionToken,
        },
        settingSources: ["project"],
        ...(input.skills ? { skills: input.skills } : {}),
        ...(input.pluginPaths && input.pluginPaths.length
          ? { plugins: input.pluginPaths.map((p) => ({ type: "local" as const, path: p })) }
          : {}),
        canUseTool,
        permissionMode: "default",
      },
    });

    this.runs.set(runId, { query: q, cancelled: false });

    try {
      for await (const message of q) {
        if (this.runs.get(runId)?.cancelled) break;
        this.translate(runId, message);
      }
      if (!this.runs.get(runId)?.cancelled) {
        this.bus.emit({ runId, type: "run.completed", status: "success", title: "Run complete" });
      }
    } catch (err) {
      this.bus.emit({
        runId,
        type: "run.failed",
        status: "failed",
        title: "Run failed",
        summary: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.runs.delete(runId);
      this.assistantText.delete(runId);
    }
  }

  async interrupt(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) return;
    run.cancelled = true;
    try {
      await run.query.interrupt();
    } catch {
      /* already finishing */
    }
    this.bus.emit({ runId, type: "run.paused", status: "pending", title: "Run stopped" });
  }

  /** Map an SDK message to RunEvents. Defensive about evolving message shapes. */
  private translate(runId: string, message: unknown): void {
    const m = message as { type?: string; subtype?: string; message?: unknown };

    if (m.type === "system" && m.subtype === "init") {
      this.bus.emit({ runId, type: "run.planning", status: "running", title: "Planning" });
      return;
    }

    if (m.type === "assistant") {
      const content = extractContent(m.message);
      const joined = content
        .filter((b) => b.type === "text" && b.text?.trim())
        .map((b) => b.text!.trim())
        .join("\n\n");
      if (joined) {
        const prev = this.assistantText.get(runId) ?? "";
        const delta =
          joined.startsWith(prev) && joined.length > prev.length
            ? joined.slice(prev.length)
            : joined === prev
              ? ""
              : joined;
        this.assistantText.set(runId, joined.startsWith(prev) ? joined : prev + joined);
        if (delta) {
          this.bus.emit({
            runId,
            type: "agent.message",
            status: "running",
            title: briefTitle(delta),
            summary: delta,
            payload: { delta, stream: true, cumulative: this.assistantText.get(runId) },
          });
        }
      }
      return;
    }

    if (m.type === "user") {
      // Tool results arrive as user-role messages.
      const content = extractContent(m.message);
      for (const block of content) {
        if (block.type === "tool_result") {
          const failed = block.is_error === true;
          this.bus.emit({
            runId,
            type: failed ? "tool.failed" : "tool.completed",
            status: failed ? "failed" : "success",
            title: failed ? "Tool failed" : "Tool completed",
          });
        }
      }
      return;
    }

    if (m.type === "result") {
      const r = m as {
        subtype?: string;
        is_error?: boolean;
        usage?: { input_tokens?: number; output_tokens?: number };
        total_cost_usd?: number;
      };
      if (r.usage || r.total_cost_usd != null) {
        const tokens_in = r.usage?.input_tokens ?? 0;
        const tokens_out = r.usage?.output_tokens ?? 0;
        const cost_cents =
          r.total_cost_usd != null ? Math.round(r.total_cost_usd * 100) : 0;
        this.bus.emit({
          runId,
          type: "agent.status",
          status: "success",
          title: "Usage",
          summary: `${tokens_in + tokens_out} tokens`,
          payload: { usage: { tokens_in, tokens_out, cost_cents } },
        });
      }
      if (r.is_error) {
        this.bus.emit({ runId, type: "run.failed", status: "failed", title: "Run failed" });
      }
      return;
    }
  }
}

interface ContentBlock {
  type: string;
  text?: string;
  is_error?: boolean;
  name?: string;
  input?: Record<string, unknown>;
}

function extractContent(message: unknown): ContentBlock[] {
  const msg = message as { content?: unknown };
  if (!msg || !Array.isArray(msg.content)) return [];
  return msg.content as ContentBlock[];
}

/** Short label for timeline/intent strip — not used for approval prompts. */
function briefTitle(text: string, max = 120): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/** Full detail for approval prompts — never truncate paths or shell commands. */
function describeTool(name: string, input: Record<string, unknown>): string {
  const file = (input.file_path ?? input.path ?? input.notebook_path) as string | undefined;
  const cmd = input.command as string | undefined;
  if (file) return `${name}: ${file}`;
  if (cmd) return `${name}: ${cmd.trim().replace(/\s+/g, " ")}`;
  return name;
}
