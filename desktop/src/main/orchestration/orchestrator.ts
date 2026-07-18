/**
 * RunOrchestrator — single entry for ask/edit/browse/plan/verify intents.
 * Strangler: edit → AgentCoordinator; browse/verify → browser tools; ask/plan → delegate flag for renderer.
 */
import { randomUUID } from "node:crypto";
import type { BrowserWindow } from "electron";
import type { StartOrchestratedRun } from "../../shared/orchestration";
import { agentCoordinator } from "../agentHost";
import { appendRunTrace } from "../obs/runTrace";
import { buildContextPack } from "../context/contextPack";
import { formatContextPack } from "../context/formatContextPack";
import { formatSkillPackForAgent, skillIdFromHint } from "../skills/formatSkillPackForAgent";
import { executeTool, getBrowseSession, stopBrowseSession, type ToolContext } from "./toolRouter";
import { abortMarketingAsk } from "./marketingAsk";
import { enrichEditGoal, mentionsFromEditContext } from "../../shared/editGoalEnrich";

let traceHookInstalled = false;

function ensureTraceHook(): void {
  if (traceHookInstalled) return;
  traceHookInstalled = true;
  agentCoordinator.getEventBus().subscribe((event) => {
    void appendRunTrace(event.runId, event);
  });
}

export class RunOrchestrator {
  private window: BrowserWindow | null = null;

  attachWindow(win: BrowserWindow): void {
    this.window = win;
    agentCoordinator.attachWindow(win);
    ensureTraceHook();
  }

  async start(req: StartOrchestratedRun): Promise<{ runId: string; delegated?: "ask" | "plan" }> {
    ensureTraceHook();
    const runId = randomUUID();
    const bus = agentCoordinator.getEventBus();
    void this.window;
    bus.emit({
      runId,
      type: "run.created",
      status: "running",
      title: `Start ${req.intent.kind}`,
      summary: intentSummary(req),
      payload: { intent: req.intent, projectId: req.projectId },
    });

    let contextPrefix: string | undefined;
    // Context pack for edit/ask/browse
    if (req.intent.kind === "edit" || req.intent.kind === "ask" || req.intent.kind === "browse") {
      try {
        const pack = await buildContextPack({
          projectId: req.projectId,
          cwd: req.cwd,
          goal:
            req.intent.kind === "ask"
              ? req.intent.prompt
              : req.intent.kind === "edit"
                ? req.intent.goal
                : req.intent.goal,
          mentions: "mentions" in req.intent ? req.intent.mentions : undefined,
          profile: req.marketingProfile,
        });
        contextPrefix = formatContextPack(pack);
        bus.emit({
          runId,
          type: "agent.status",
          status: "running",
          title: "Context pack",
          summary: `${pack.retrieved.length} retrieved · ${pack.facts.length} facts`,
          payload: { contextPack: pack, event: "context.pack" },
        });
      } catch {
        /* index optional */
      }
    }

    const toolCtx: ToolContext = {
      runId,
      cwd: req.cwd,
      projectId: req.projectId,
      serverUrl: req.serverUrl,
      sessionToken: req.sessionToken,
      bus,
      autoApproveBrowser: req.autoApproveBrowser,
      persona: req.persona,
    };

    switch (req.intent.kind) {
      case "edit": {
        const enrichedGoal = enrichEditGoal({
          userGoal: req.intent.goal,
          turnReceipt: req.ask?.turnReceipt,
          lastAnswerText: req.ask?.lastAnswerText,
          lastAssets: req.ask?.lastAssets,
          mentions: req.intent.mentions,
        });
        const mergedMentions = [
          ...(req.intent.mentions ?? []),
          ...mentionsFromEditContext({
            userGoal: req.intent.goal,
            turnReceipt: req.ask?.turnReceipt,
            lastAnswerText: req.ask?.lastAnswerText,
            lastAssets: req.ask?.lastAssets,
            mentions: req.intent.mentions,
          }),
        ];
        const goal = enrichGoalWithMentions(enrichedGoal, mergedMentions);
        const skillHint =
          req.intent.skills?.[0] ?? skillIdFromHint(req.intent.goal) ?? undefined;
        try {
          const skillCtx = await formatSkillPackForAgent({
            skillId: skillHint,
            tactic: req.intent.goal,
          });
          if (skillCtx) {
            contextPrefix = [contextPrefix, skillCtx].filter(Boolean).join("\n\n---\n\n");
          }
        } catch {
          /* skills optional */
        }
        const result = await agentCoordinator.start({
          runId,
          cwd: req.cwd,
          goal,
          serverUrl: req.serverUrl,
          sessionToken: req.sessionToken,
          skills: req.intent.skills,
          projectId: req.projectId,
          sessionId: req.sessionId,
          planTaskId: req.planTaskId,
          kind: "edit",
          contextPrefix,
          guaranteedShip: req.intent.guaranteedShip,
        });
        return { runId: result.runId };
      }
      case "browse": {
        await executeTool("browser.session", toolCtx, {
          goal: req.intent.goal,
          startUrl: req.intent.startUrl,
          maxSteps: req.intent.maxSteps,
        });
        return { runId };
      }
      case "verify": {
        await executeTool("browser.verify_checklist", toolCtx, {
          url: req.intent.url,
          checklist: req.intent.checklist,
        });
        return { runId };
      }
      case "ask": {
        // Fire-and-forget like edit — return runId immediately so renderer can ingest SSE.
        void executeTool("marketing.ask", toolCtx, {
          prompt: req.intent.prompt,
          sessionId: req.sessionId,
          persona: req.persona,
          history: req.ask?.history ?? [],
          profile: req.ask?.profile,
          planSnapshot: req.ask?.planSnapshot,
          planProgressSummary: req.ask?.planProgressSummary,
          context: req.ask?.context,
          activeSurface: req.ask?.activeSurface,
          provider: req.ask?.provider ?? "anthropic",
          contextPrefix,
        }).catch((err) => {
          bus.emit({
            runId,
            type: "run.failed",
            status: "failed",
            title: "Ask failed",
            summary: err instanceof Error ? err.message : String(err),
          });
        });
        return { runId };
      }
      case "plan":
        bus.emit({
          runId,
          type: "run.planning",
          status: "running",
          title: "Plan generation",
          payload: { horizon: req.intent.horizon, mode: req.intent.mode },
        });
        return { runId, delegated: "plan" };
      default:
        bus.emit({
          runId,
          type: "run.failed",
          status: "failed",
          title: "Unknown intent",
        });
        return { runId };
    }
  }

  interrupt(runId: string): void {
    abortMarketingAsk(runId);
    stopBrowseSession(runId);
    void agentCoordinator.interrupt(runId);
  }

  approveBrowser(runId: string, approvalId: string, approved: boolean): void {
    const session = getBrowseSession(runId);
    if (!session) return;
    if (approved) session.approve(approvalId);
    else session.reject(approvalId);
  }
}

function intentSummary(req: StartOrchestratedRun): string {
  const i = req.intent;
  if (i.kind === "ask") return i.prompt.slice(0, 120);
  if (i.kind === "edit" || i.kind === "browse") return i.goal.slice(0, 120);
  if (i.kind === "verify") return `Verify ${i.url}`;
  if (i.kind === "plan") return `Plan ${i.horizon}d (${i.mode})`;
  return "run";
}

function enrichGoalWithMentions(
  goal: string,
  mentions?: Array<{ type: string; path?: string; name?: string }>,
): string {
  if (!mentions?.length) return goal;
  const lines = mentions
    .map((m) => (m.path ? `@${m.path}` : m.name ? `@${m.name}` : null))
    .filter(Boolean);
  if (!lines.length) return goal;
  return `${goal}\n\nReferenced context:\n${lines.join("\n")}`;
}

export const runOrchestrator = new RunOrchestrator();
