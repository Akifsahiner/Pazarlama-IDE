/**
 * ToolRouter — catalog of tools the RunOrchestrator can invoke.
 */
import { buildVerifyGoal } from "../../shared/browserVerify";
import type { CapId } from "../../shared/capability";
import type { PermissionScope } from "../../shared/types";
import type { RunEventBus } from "../runs/eventBus";
import { BrowserToolSession } from "./browserSession";
import { marketingAskTool } from "./marketingAsk";
import { agentCoordinator } from "../agentHost";

export interface ToolContext {
  runId: string;
  cwd: string;
  projectId: string;
  serverUrl: string;
  sessionToken: string;
  bus: RunEventBus;
  autoApproveBrowser?: boolean;
  persona?: "marketing" | "sales";
}

export interface ToolResult {
  ok: boolean;
  summary?: string;
  data?: Record<string, unknown>;
}

export interface ToolDef {
  name: string;
  capNeeds: CapId[];
  scope: PermissionScope;
  execute: (ctx: ToolContext, input: Record<string, unknown>) => Promise<ToolResult>;
}

const browseSessions = new Map<string, BrowserToolSession>();

export function getBrowseSession(runId: string): BrowserToolSession | undefined {
  return browseSessions.get(runId);
}

export function stopBrowseSession(runId: string): void {
  const s = browseSessions.get(runId);
  if (s) {
    s.stop();
    browseSessions.delete(runId);
  }
}

const browserSessionTool: ToolDef = {
  name: "browser.session",
  capNeeds: ["backend", "auth", "anthropic", "computer_use"],
  scope: "read_inspect",
  async execute(ctx, input) {
    const goal = String(input.goal ?? "");
    if (!goal.trim()) return { ok: false, summary: "Missing goal" };
    stopBrowseSession(ctx.runId);
    const session = new BrowserToolSession({
      runId: ctx.runId,
      serverUrl: ctx.serverUrl,
      token: ctx.sessionToken,
      goal,
      autoApprove: ctx.autoApproveBrowser,
      persona: ctx.persona,
      bus: ctx.bus,
    });
    browseSessions.set(ctx.runId, session);
    session.start();
    return { ok: true, summary: "Browser session started" };
  },
};

const browserVerifyTool: ToolDef = {
  name: "browser.verify_checklist",
  capNeeds: ["backend", "auth", "anthropic", "computer_use"],
  scope: "read_inspect",
  async execute(ctx, input) {
    const url = String(input.url ?? "");
    const checklist = Array.isArray(input.checklist)
      ? (input.checklist as string[])
      : [];
    const goal = buildVerifyGoal(url, checklist);
    return browserSessionTool.execute(ctx, { goal });
  },
};

const contextSearchTool: ToolDef = {
  name: "context.search",
  capNeeds: [],
  scope: "read_inspect",
  async execute(ctx, input) {
    const { searchProjectIndex } = await import("../context/projectIndex");
    const q = String(input.query ?? "");
    const hits = await searchProjectIndex(ctx.projectId, ctx.cwd, q, 8);
    ctx.bus.emit({
      runId: ctx.runId,
      type: "tool.completed",
      status: "success",
      title: "context.search",
      summary: `${hits.length} hits`,
      payload: { hits },
    });
    return { ok: true, data: { hits } };
  },
};

export const TOOL_CATALOG: Record<string, ToolDef> = {
  "browser.session": browserSessionTool,
  "browser.verify_checklist": browserVerifyTool,
  "context.search": contextSearchTool,
  "marketing.ask": marketingAskTool,
};

export async function executeTool(
  name: string,
  ctx: ToolContext,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const tool = TOOL_CATALOG[name];
  if (!tool) return { ok: false, summary: `Unknown tool: ${name}` };
  ctx.bus.emit({
    runId: ctx.runId,
    type: "tool.started",
    status: "running",
    title: name,
    summary: JSON.stringify(input).slice(0, 160),
  });
  try {
    const result = await tool.execute(ctx, input);
    if (!result.ok) {
      ctx.bus.emit({
        runId: ctx.runId,
        type: "tool.failed",
        status: "failed",
        title: name,
        summary: result.summary,
      });
    }
    return result;
  } catch (err) {
    const summary = err instanceof Error ? err.message : String(err);
    ctx.bus.emit({
      runId: ctx.runId,
      type: "tool.failed",
      status: "failed",
      title: name,
      summary,
    });
    return { ok: false, summary };
  }
}

/** Edit path still goes through AgentCoordinator (SDK tools). */
export async function startEditViaHost(input: {
  runId?: string;
  cwd: string;
  goal: string;
  serverUrl: string;
  sessionToken: string;
  skills?: string[];
  projectId?: string;
  sessionId?: string;
  planTaskId?: string;
}): Promise<{ runId: string }> {
  return agentCoordinator.start({
    ...input,
    kind: "edit",
  });
}
