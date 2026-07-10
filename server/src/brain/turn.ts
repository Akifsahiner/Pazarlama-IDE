/**
 * Unified marketing conversation turn — single entry for `/agent`.
 */
import { marketingProfileSchema, type MarketingProfile } from "../schemas/marketingProfile.js";
import type { MarketingDecision } from "../schemas/decision.js";
import type {
  AgentStreamEvent,
  AgentTurnPersist,
  AgentTurnContext,
  MarketingAsset,
  PlanProgressSummary,
} from "../schemas/index.js";
import * as profileRepo from "../db/repos/marketingProfile.js";
import { route, type Discipline, type RoutedIntent } from "./router.js";
import { retrieveSkills, renderSkillContext } from "./skillRetrieval.js";
import {
  answerSystemPrompt,
  decisionSystemPrompt,
  draftSystemPrompt,
  researchSystemPrompt,
  compactProfile,
  type Persona,
} from "./prompts.js";
import { generateDecision } from "./generate.js";
import { generateAnswer, generateDraft, generateResearchBrief } from "./generateVariants.js";
import { critique, critiqueDraft, shouldReviseDraft, shouldWarnDraftQuality, type Critique, type DraftCritique } from "./critic.js";
import { buildProactiveSuggestion } from "./proactiveSuggestion.js";
import type { TokenUsageSink } from "./tokenUsage.js";
import { isPlanRevisionMessage } from "./planRevision.js";
import { revisePlanSuite } from "./planSuite.js";
import { marketingPlanSuiteSchema, type MarketingPlanSuite } from "../schemas/planPlaybooks.js";
import type { BrainProvider } from "./modelTier.js";
import { resolveBrainProvider } from "./llmClient.js";

const CRITIC_DISCIPLINES = new Set<Discipline>([
  "positioning",
  "icp",
  "launch_plan",
  "ph_launch",
  "landing",
]);

export interface TurnOpts {
  userId: string;
  projectId?: string;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  profile?: MarketingProfile;
  persona?: Persona;
  planProgressSummary?: PlanProgressSummary;
  activeSurface?: string;
  context?: AgentTurnContext;
  emit: (event: AgentStreamEvent) => void;
  signal?: AbortSignal;
  usageSink?: TokenUsageSink;
  provider?: BrainProvider;
  /** Active plan JSON for chat-driven revision (Faz 11). */
  planSnapshot?: MarketingPlanSuite;
}

export interface TurnResult {
  persist: AgentTurnPersist;
  intent: RoutedIntent;
  collectedAssets: MarketingAsset[];
  revisedPlan?: MarketingPlanSuite;
}

function decisionSummary(decision: MarketingDecision): string {
  return `${decision.decision} — ${decision.rationale.slice(0, 180)}${decision.rationale.length > 180 ? "…" : ""}`;
}

function shouldCritique(intent: RoutedIntent): boolean {
  return intent.urgency === "deep" || CRITIC_DISCIPLINES.has(intent.discipline);
}

async function runPlanRevisionPath(opts: TurnOpts): Promise<TurnResult> {
  const current = marketingPlanSuiteSchema.parse(opts.planSnapshot);
  opts.emit({
    type: "brain.status",
    phase: "planning",
    text: "Revising launch plan…",
    skills: [],
  });
  const { plan, diff, sourcePlanId } = await revisePlanSuite({
    currentPlan: current,
    instruction: opts.message,
    persona: opts.persona,
    emit: (e) => {
      if (e.type === "status") {
        opts.emit({ type: "brain.status", phase: "planning", text: e.message, skills: [] });
      }
    },
    signal: opts.signal,
  });
  opts.emit({
    type: "plan_revision",
    summary: diff.summary,
    diff,
    plan,
    sourcePlanId,
  });
  const detail = [
    diff.summary,
    diff.addedPlaybooks.length
      ? `Added playbooks: ${diff.addedPlaybooks.map((p) => p.title).join(", ")}.`
      : "",
    diff.addedTasks.length ? `Added ${diff.addedTasks.length} task(s).` : "",
    diff.removedTasks.length ? `Removed ${diff.removedTasks.length} task(s).` : "",
  ]
    .filter(Boolean)
    .join(" ");
  opts.emit({ type: "token", text: detail });
  return {
    intent: {
      discipline: "launch_plan",
      task_kind: "decide",
      urgency: "deep",
      user_goal_summary: opts.message.trim().slice(0, 100),
    },
    collectedAssets: [],
    revisedPlan: plan,
    persist: { kind: "answer", text: detail, summary: diff.summary },
  };
}

async function runDecisionPath(
  opts: TurnOpts,
  intent: RoutedIntent,
  profile: MarketingProfile,
  skillContext: string,
  skillLabels: string[],
): Promise<TurnResult> {
  const collectedAssets: MarketingAsset[] = [];
  const baseDecisionOpts = (revisionNotes?: string[]) => ({
    system: decisionSystemPrompt({
      discipline: intent.discipline,
      profile,
      skillContext,
      userGoalSummary: intent.user_goal_summary,
      persona: opts.persona,
      planProgressSummary: opts.planProgressSummary,
      activeSurface: opts.activeSurface,
      agentContext: opts.context,
      revisionNotes,
    }),
    userMessage: opts.message,
    history: opts.history,
    tier: intent.urgency === "deep" ? ("main" as const) : ("main" as const),
    onStatus: (text: string) =>
      opts.emit({
        type: "brain.status",
        phase: "generating",
        text,
        skills: skillLabels,
      }),
    signal: opts.signal,
    usageSink: opts.usageSink,
    provider: resolveBrainProvider(opts.provider),
  });

  opts.emit({
    type: "brain.status",
    phase: "diagnosing",
    text: "Diagnosing current state…",
    skills: skillLabels,
  });

  let decision = await generateDecision(baseDecisionOpts());

  if (decision.missing_info.length > 0) {
    opts.emit({ type: "missing_info", questions: decision.missing_info });
    return {
      intent,
      collectedAssets,
      persist: { kind: "missing_info", questions: decision.missing_info },
    };
  }

  let critiqueResult: Critique | undefined;
  if (shouldCritique(intent)) {
    opts.emit({
      type: "brain.status",
      phase: "critiquing",
      text: "Reviewing decision…",
      skills: skillLabels,
    });
    const firstCritique = await critique(
      compactProfile(profile),
      decision,
      opts.signal,
      opts.usageSink,
    );
    if (firstCritique) {
      critiqueResult = firstCritique;
      opts.emit({ type: "brain.critique", critique: firstCritique });
      if (!firstCritique.approve && firstCritique.revisions.length > 0) {
        opts.emit({
          type: "brain.status",
          phase: "revising",
          text: "Strengthening recommendation…",
          skills: skillLabels,
        });
        decision = await generateDecision(baseDecisionOpts(firstCritique.revisions));
        if (decision.missing_info.length > 0) {
          opts.emit({ type: "missing_info", questions: decision.missing_info });
          return {
            intent,
            collectedAssets,
            persist: { kind: "missing_info", questions: decision.missing_info },
          };
        }
      }
    }
  }

  const summary = decisionSummary(decision);
  opts.emit({ type: "decision", decision, critique: critiqueResult, summary });

  if (opts.projectId) {
    try {
      await profileRepo.recordExperiment(opts.userId, opts.projectId, {
        id: `exp_${Date.now().toString(36)}`,
        date: new Date().toISOString(),
        hypothesis: decision.decision,
        discipline: intent.discipline,
        outcome: "pending",
        metric: decision.success_metric
          ? {
              name: decision.success_metric.name,
              value: 0,
            }
          : undefined,
        evidence_urls: [],
      });
    } catch {
      /* non-fatal */
    }
  }

  return {
    intent,
    collectedAssets,
    persist: {
      kind: "decision",
      summary,
      decision,
      critique: critiqueResult,
    },
  };
}

function runProactivePath(
  opts: TurnOpts,
  _profile: MarketingProfile,
): TurnResult {
  const suggestion = buildProactiveSuggestion(opts.context ?? {}, opts.planProgressSummary);
  opts.emit({
    type: "proactive_suggestion",
    title: suggestion.title,
    body: suggestion.body,
    action: suggestion.action,
    source: suggestion.source,
  });
  return {
    intent: {
      discipline: "meta_question",
      task_kind: "answer",
      urgency: "fast",
      user_goal_summary: "Proactive next-step suggestion",
    },
    collectedAssets: [],
    persist: {
      kind: "answer",
      text: suggestion.body,
      proactive: {
        title: suggestion.title,
        body: suggestion.body,
        action: suggestion.action,
        source: suggestion.source,
      },
    },
  };
}

export async function runTurn(opts: TurnOpts): Promise<TurnResult> {
  const profile: MarketingProfile =
    opts.profile ??
    (opts.projectId
      ? await profileRepo.get(opts.userId, opts.projectId)
      : marketingProfileSchema.parse({}));

  if (opts.context?.proactive_trigger) {
    return runProactivePath(opts, profile);
  }

  if (opts.planSnapshot && isPlanRevisionMessage(opts.message)) {
    return runPlanRevisionPath(opts);
  }

  opts.emit({ type: "brain.profile", gaps: profile.gaps ?? [] });

  const contextHint = [opts.projectId ?? "", opts.persona ?? "marketing"].join("::");
  const brainProvider = resolveBrainProvider(opts.provider);
  const intent = await route(
    opts.message,
    contextHint,
    opts.signal,
    opts.persona ?? "marketing",
    opts.usageSink,
    brainProvider,
  );

  opts.emit({
    type: "brain.intent",
    discipline: intent.discipline,
    task_kind: intent.task_kind,
    urgency: intent.urgency,
  });

  const skills = await retrieveSkills(intent.discipline, profile);
  const skillLabels = skills.map((p) => p.manifest.name);
  opts.emit({ type: "brain.retrieved", skills: skillLabels });

  const skillContext = renderSkillContext(skills);
  const collectedAssets: MarketingAsset[] = [];

  // Strategic decision paths
  if (
    intent.discipline !== "meta_question" &&
    (intent.task_kind === "decide" ||
      intent.task_kind === "diagnose" ||
      intent.task_kind === "audit")
  ) {
    return runDecisionPath(opts, intent, profile, skillContext, skillLabels);
  }

  // Draft copy
  if (intent.task_kind === "draft" && intent.discipline !== "meta_question") {
    opts.emit({
      type: "brain.status",
      phase: "drafting",
      text: "Drafting copy…",
      skills: skillLabels,
    });
    const draftOpts = (revisionNotes?: string[]) => ({
      system: draftSystemPrompt({
        discipline: intent.discipline,
        profile,
        skillContext,
        userGoalSummary: intent.user_goal_summary,
        persona: opts.persona,
        planProgressSummary: opts.planProgressSummary,
        activeSurface: opts.activeSurface,
        agentContext: opts.context,
      }) + (revisionNotes?.length
        ? `\n\nREVISION REQUIRED:\n${revisionNotes.map((r) => `- ${r}`).join("\n")}`
        : ""),
      userMessage: opts.message,
      history: opts.history,
      onStatus: (text: string) =>
        opts.emit({ type: "brain.status", phase: "drafting", text, skills: skillLabels }),
      signal: opts.signal,
      usageSink: opts.usageSink,
      provider: resolveBrainProvider(opts.provider),
    });

    let draft = await generateDraft(draftOpts());

    let draftCritiqueResult: DraftCritique | undefined;
    opts.emit({
      type: "brain.status",
      phase: "critiquing",
      text: "Reviewing draft quality…",
      skills: skillLabels,
    });
    const firstDraftCritique = await critiqueDraft(
      compactProfile(profile),
      { summary: draft.summary, assets: draft.assets },
      opts.signal,
      opts.usageSink,
    );
    if (firstDraftCritique) {
      draftCritiqueResult = firstDraftCritique;
      if (shouldReviseDraft(firstDraftCritique) && firstDraftCritique.revisions.length > 0) {
        opts.emit({
          type: "brain.status",
          phase: "revising",
          text: "Strengthening draft…",
          skills: skillLabels,
        });
        draft = await generateDraft(draftOpts(firstDraftCritique.revisions));
      }
    }

    const qualityWarn = draftCritiqueResult ? shouldWarnDraftQuality(draftCritiqueResult) : false;
    opts.emit({
      type: "draft",
      summary: draft.summary,
      assets: draft.assets,
      suggested_mode: draft.suggested_mode,
      draft_critique: draftCritiqueResult,
      quality_warn: qualityWarn,
    });
    if (draft.suggested_mode) {
      opts.emit({
        type: "suggested_mode",
        mode: draft.suggested_mode,
        reason: draft.suggested_mode === "edit" ? "This may need file edits." : undefined,
      });
    }
    return {
      intent,
      collectedAssets,
      persist: {
        kind: "draft",
        summary: draft.summary,
        draftAssets: draft.assets,
        suggested_mode: draft.suggested_mode,
        draft_critique: draftCritiqueResult,
      },
    };
  }

  // Research brief → browse handoff
  if (intent.task_kind === "research" && intent.discipline !== "meta_question") {
    opts.emit({
      type: "brain.status",
      phase: "researching",
      text: "Planning research…",
      skills: skillLabels,
    });
    const brief = await generateResearchBrief({
      system: researchSystemPrompt({
        discipline: intent.discipline,
        profile,
        skillContext,
        userGoalSummary: intent.user_goal_summary,
        persona: opts.persona,
      }),
      userMessage: opts.message,
      history: opts.history,
      signal: opts.signal,
      usageSink: opts.usageSink,
      provider: resolveBrainProvider(opts.provider),
    });
    const summary = `${brief.summary}\n\n**Research queries:**\n${brief.research_queries.map((q) => `- ${q}`).join("\n")}`;
    opts.emit({
      type: "draft",
      summary,
      assets: [],
      suggested_mode: "browse",
    });
    opts.emit({
      type: "suggested_mode",
      mode: "browse",
      reason: "This task needs live browser research.",
    });
    return {
      intent,
      collectedAssets,
      persist: {
        kind: "draft",
        summary,
        draftAssets: [],
        suggested_mode: "browse",
      },
    };
  }

  // Streaming answer (meta + quick Q&A)
  opts.emit({
    type: "brain.status",
    phase: "answering",
    text: "Thinking…",
    skills: skillLabels,
  });
  let text = "";
  await generateAnswer(
    {
      system: answerSystemPrompt({
        profile,
        skillContext,
        persona: opts.persona,
        planProgressSummary: opts.planProgressSummary,
        activeSurface: opts.activeSurface,
        agentContext: opts.context,
      }),
      userMessage: opts.message,
      history: opts.history,
      signal: opts.signal,
      usageSink: opts.usageSink,
      provider: resolveBrainProvider(opts.provider),
    },
    {
      onToken: (delta) => {
        text += delta;
        opts.emit({ type: "token", text: delta });
      },
      onAsset: (asset) => {
        collectedAssets.push(asset);
        opts.emit({ type: "asset", asset });
      },
      onTool: (name, status, detail) => {
        opts.emit({ type: "tool", name, status, detail });
      },
    },
    opts.projectId
      ? { userId: opts.userId, projectId: opts.projectId, profile }
      : undefined,
  );

  return {
    intent,
    collectedAssets,
    persist: { kind: "answer", text, assets: collectedAssets },
  };
}
