/**
 * Fold Brain SSE (carried on RunEvent.payload.streamEvent) into the Ask thread.
 */
import type {
  AgentStreamEvent,
  MarketingAsset,
  MarketingPlan,
  ComposerSuggestedMode,
} from "@shared/types";
import type { ExecutableAction } from "@shared/executableAction";
import { parseExecutableActionBundle } from "@shared/executableAction";
import { buildTurnReceipt, type TurnReceipt } from "@shared/turnReceipt";

export interface AskFoldSession {
  runId: string;
  thinkingEventId: string;
  agentTextEventId: string | null;
  useTextBubble: boolean;
  streamBuffer: string;
  streamFlushTimer: ReturnType<typeof setTimeout> | null;
  capturedBrainSkills?: string[];
  proactive: boolean;
  trimmed: string;
  activeProjectId: string | null;
  startedAt: number;
  pendingActions: ExecutableAction[];
  collectedAssets: MarketingAsset[];
  turnCostCents: number;
  decisionsCount: number;
}

export interface AskFoldDeps {
  appendEvent: (e: Record<string, unknown>) => string;
  patchEvent: (id: string, patch: Record<string, unknown>) => void;
  getEventText: (id: string) => string;
  removeEventIds: (ids: string[]) => void;
  appendPresentedError: (msg: string) => void;
  setSuggestedMode: (mode: ComposerSuggestedMode, reason?: string) => void;
  applyPlanRevision: (args: {
    plan: MarketingPlan;
    summary: string;
    diff?: unknown;
    sourcePlanId?: string;
  }) => void;
  onAsset: (asset: MarketingAsset) => void;
  onUsage: (u: { tokens_in: number; tokens_out: number; cost_cents: number }) => void;
  hintWorkSurface: (surface: string) => void;
  strategyContextSummary: (skills: string[]) => string;
  onTurnComplete?: (receipt: TurnReceipt) => void;
}

export function createAskFoldSession(
  partial: Omit<
    AskFoldSession,
    | "agentTextEventId"
    | "useTextBubble"
    | "streamBuffer"
    | "streamFlushTimer"
    | "startedAt"
    | "pendingActions"
    | "collectedAssets"
    | "turnCostCents"
    | "decisionsCount"
  >,
): AskFoldSession {
  return {
    ...partial,
    agentTextEventId: null,
    useTextBubble: true,
    streamBuffer: "",
    streamFlushTimer: null,
    startedAt: Date.now(),
    pendingActions: [],
    collectedAssets: [],
    turnCostCents: 0,
    decisionsCount: 0,
  };
}

function flushStreamText(session: AskFoldSession, deps: AskFoldDeps): void {
  if (!session.agentTextEventId || !session.streamBuffer) return;
  const prev = deps.getEventText(session.agentTextEventId);
  deps.patchEvent(session.agentTextEventId, {
    text: prev + session.streamBuffer,
  });
  session.streamBuffer = "";
}

/** Flush buffer then clear thinking / empty text bubbles; emit turn receipt. */
export function finalizeAskFold(session: AskFoldSession | null, deps: AskFoldDeps): void {
  if (!session) return;
  if (session.streamFlushTimer) {
    clearTimeout(session.streamFlushTimer);
    session.streamFlushTimer = null;
  }
  flushStreamText(session, deps);
  const drop: string[] = [session.thinkingEventId];
  deps.removeEventIds(drop);
  if (session.capturedBrainSkills?.length) {
    deps.appendEvent({
      role: "agent",
      kind: "status",
      text: deps.strategyContextSummary(session.capturedBrainSkills),
    });
  }

  const answerText = session.agentTextEventId
    ? deps.getEventText(session.agentTextEventId)
    : session.trimmed;
  const turnId = session.agentTextEventId ?? session.thinkingEventId;
  const receipt = buildTurnReceipt({
    turnId,
    runId: session.runId,
    startedAt: session.startedAt,
    answerText,
    assets: session.collectedAssets,
    actions: {
      primary: session.pendingActions[0],
      secondary: session.pendingActions.slice(1),
    },
    costCents: session.turnCostCents || undefined,
    decisionsCount: session.decisionsCount || undefined,
  });

  deps.appendEvent({
    role: "agent",
    kind: "turn_receipt",
    turnReceipt: receipt,
    text: receipt.summaryLine,
  });
  deps.onTurnComplete?.(receipt);
}

export function foldAskStreamEvent(
  session: AskFoldSession,
  e: AgentStreamEvent,
  deps: AskFoldDeps,
): void {
  const removeThinking = () => deps.removeEventIds([session.thinkingEventId]);

  switch (e.type) {
    case "brain.status":
      if (e.skills?.length) session.capturedBrainSkills = e.skills;
      deps.patchEvent(session.thinkingEventId, {
        thinkingPhase: e.phase,
        thinkingText: e.text,
        thinkingSkills: e.skills,
      });
      break;
    case "brain.intent":
      deps.patchEvent(session.thinkingEventId, {
        thinkingText:
          e.urgency === "deep"
            ? `Senior review — ${e.discipline.replace(/_/g, " ")}…`
            : `Working on ${e.discipline.replace(/_/g, " ")}…`,
        thinkingUrgency: e.urgency,
      });
      break;
    case "brain.retrieved":
      session.capturedBrainSkills = e.skills;
      deps.patchEvent(session.thinkingEventId, {
        thinkingText: e.playbookId
          ? `Pulling ${e.skills.join(", ")} — ${e.playbookId}${
              e.aggressionLevel ? ` (${e.aggressionLevel})` : ""
            }${e.tacticCount ? ` · ${e.tacticCount} tactics` : ""}…`
          : `Pulling ${e.skills.length} playbook sections…`,
        thinkingSkills: e.skills,
      });
      break;
    case "brain.profile":
      deps.patchEvent(session.thinkingEventId, { thinkingText: "Reading product profile…" });
      break;
    case "brain.critique":
      deps.patchEvent(session.thinkingEventId, { thinkingText: "Reviewing decision quality…" });
      break;
    case "brain.answer_critique":
      deps.patchEvent(session.thinkingEventId, {
        thinkingText: `Answer quality gate · ${e.critique.total}/40`,
      });
      if (session.agentTextEventId) {
        deps.patchEvent(session.agentTextEventId, {
          answerCritique: e.critique,
          answerQualityWarn: e.quality_warn,
        });
      }
      break;
    case "decision":
      removeThinking();
      session.useTextBubble = false;
      session.decisionsCount += 1;
      deps.appendEvent({
        role: "agent",
        kind: "decision",
        decision: e.decision,
        critique: e.critique,
        summary: e.summary,
        text: e.summary,
      });
      break;
    case "draft":
      removeThinking();
      session.useTextBubble = false;
      deps.appendEvent({
        role: "agent",
        kind: "draft",
        draftSummary: e.summary,
        draftAssets: e.assets,
        draftCritique: e.draft_critique,
        draftQualityWarn: e.quality_warn,
        text: e.summary,
      });
      if (e.assets.length) deps.hintWorkSurface("content-set");
      break;
    case "proactive_suggestion":
      removeThinking();
      session.useTextBubble = false;
      deps.appendEvent({
        role: "agent",
        kind: "proactive_suggestion",
        proactiveTitle: e.title,
        proactiveAction: e.action,
        proactiveButtonLabel: e.buttonLabel,
        text: e.body,
      });
      break;
    case "plan_revision":
      removeThinking();
      session.useTextBubble = false;
      deps.applyPlanRevision({
        plan: e.plan,
        summary: e.summary,
        diff: e.diff,
        sourcePlanId: e.sourcePlanId,
      });
      break;
    case "missing_info":
      removeThinking();
      session.useTextBubble = false;
      deps.appendEvent({
        role: "agent",
        kind: "missing_info",
        missingQuestions: e.questions,
        missingInfoState: "open",
      });
      break;
    case "suggested_mode":
      deps.setSuggestedMode(e.mode, e.reason);
      break;
    case "executable_action": {
      const bundle = parseExecutableActionBundle(e);
      const all = [
        ...(bundle.primary ? [bundle.primary] : []),
        ...(bundle.secondary ?? []),
        ...(e.actions ?? []).filter(
          (a) => a !== bundle.primary && !bundle.secondary?.includes(a),
        ),
      ];
      session.pendingActions = all.slice(0, 3);
      if (session.pendingActions.length) {
        deps.appendEvent({
          role: "agent",
          kind: "executable_action",
          executableActions: session.pendingActions,
          text: session.pendingActions[0]?.kind === "edit_run"
            ? "Ready to run in project"
            : "Next action available",
        });
      }
      break;
    }
    case "token":
      if (!session.useTextBubble) return;
      if (!session.agentTextEventId) {
        removeThinking();
        session.agentTextEventId = deps.appendEvent({ role: "agent", kind: "text", text: "" });
      }
      session.streamBuffer += e.text;
      if (!session.streamFlushTimer) {
        session.streamFlushTimer = setTimeout(() => {
          flushStreamText(session, deps);
          session.streamFlushTimer = null;
        }, 50);
      }
      break;
    case "tool":
      if (e.name.startsWith("brain.")) return;
      deps.appendEvent({
        role: "agent",
        kind: "tool",
        tool: e.name,
        text: e.detail ?? e.status,
      });
      break;
    case "asset":
      session.collectedAssets.push(e.asset);
      deps.appendEvent({ role: "agent", kind: "asset", asset: e.asset });
      deps.onAsset(e.asset);
      if (e.asset.type === "ad" || e.asset.type === "tweet") {
        deps.hintWorkSurface("ad-preview");
      } else {
        deps.hintWorkSurface("content-set");
      }
      break;
    case "error":
      removeThinking();
      deps.appendPresentedError(e.message);
      break;
    case "usage":
      session.turnCostCents += e.cost_cents;
      deps.onUsage({
        tokens_in: e.tokens_in,
        tokens_out: e.tokens_out,
        cost_cents: e.cost_cents,
      });
      break;
    case "done":
      break;
    default:
      break;
  }
}
