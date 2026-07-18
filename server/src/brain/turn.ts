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
import {
  critique,
  critiqueDraft,
  shouldReviseDraft,
  shouldWarnDraftQuality,
  type Critique,
  type DraftCritique,
} from "./critic.js";
import {
  chunkTextForStream,
  critiqueAnswer,
  shouldReviseAnswer,
  shouldWarnAnswerQuality,
  structuralAnswerLint,
  type AnswerCritique,
} from "./answerCritic.js";
import { PH_MANIPULATION_RE } from "./gtmCatalog.js";
import { buildProactiveSuggestion } from "./proactiveSuggestion.js";
import { buildAnswerCta } from "./marketingStrategyRoute.js";
import { buildAnswerExecutableActions } from "./answerActions.js";
import { bundleToSseEvent } from "./executionClassifier.js";
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
  "ads",
  "growth",
  "outreach",
  "content",
  "cro",
  "social",
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
    usageSink: opts.usageSink,
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

function decisionFailsEthics(decision: MarketingDecision): boolean {
  const blob = JSON.stringify(decision);
  return PH_MANIPULATION_RE.test(blob);
}

async function generateAnswerWithQualityGate(opts: {
  turn: TurnOpts;
  intent: RoutedIntent;
  profile: MarketingProfile;
  skillContext: string;
  skillLabels: string[];
  collectedAssets: MarketingAsset[];
}): Promise<{
  text: string;
  answerCritique?: AnswerCritique;
  qualityWarn?: boolean;
  proposedActions: import("./executionClassifier.js").ExecutableAction[];
}> {
  const product = opts.profile.product_name || "this product";
  const gateAnswer = opts.intent.discipline !== "meta_question";
  let revisionNotes: string[] = [];
  let answerCritique: AnswerCritique | undefined;
  let qualityWarn: boolean | undefined;
  let text = "";
  let proposedActions: import("./executionClassifier.js").ExecutableAction[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    text = "";
    const revisionBlock = revisionNotes.length
      ? `\n\nREVISION REQUIRED (address every point):\n${revisionNotes.map((r) => `- ${r}`).join("\n")}`
      : "";

    await generateAnswer(
      {
        system:
          answerSystemPrompt({
            profile: opts.profile,
            skillContext: opts.skillContext,
            userGoalSummary: opts.intent.user_goal_summary,
            persona: opts.turn.persona,
            planProgressSummary: opts.turn.planProgressSummary,
            activeSurface: opts.turn.activeSurface,
            agentContext: opts.turn.context,
          }) + revisionBlock,
        userMessage: opts.turn.message,
        history: opts.turn.history,
        signal: opts.turn.signal,
        usageSink: opts.turn.usageSink,
        provider: resolveBrainProvider(opts.turn.provider),
      },
      {
        onToken: (delta) => {
          text += delta;
        },
        onAsset: (asset) => {
          opts.collectedAssets.push(asset);
          opts.turn.emit({ type: "asset", asset });
        },
        onExecutableActions: (actions) => {
          proposedActions = actions;
        },
        onTool: (name, status, detail) => {
          opts.turn.emit({ type: "tool", name, status, detail });
        },
      },
      opts.turn.projectId
        ? { userId: opts.turn.userId, projectId: opts.turn.projectId, profile: opts.profile }
        : undefined,
    );

    if (!gateAnswer) break;

    const structural = structuralAnswerLint(text, product, {
      hasLocalContext: Boolean(opts.turn.context?.local_context_pack?.trim()),
      localContextPack: opts.turn.context?.local_context_pack,
      hasAsset: opts.collectedAssets.length > 0,
      hasExecutableActions: proposedActions.length > 0,
      copyRequested: /\b(copy|landing|hero|cta|headline|email|tweet|ad)\b/i.test(opts.turn.message),
      editClassified:
        /\b(edit|fix|change|update|rewrite|hero|cta|landing|page|implement|düzelt|sayfa)\b/i.test(
          opts.turn.message,
        ) && Boolean(opts.turn.context?.local_context_pack?.trim()),
    });
    if (structural.hardFail.length > 0 && attempt === 0) {
      opts.turn.emit({
        type: "brain.status",
        phase: "revising",
        text: "Tightening answer — honest ceiling + one executable next step…",
        skills: opts.skillLabels,
      });
      revisionNotes = [...structural.hardFail, ...structural.softWarn];
      continue;
    }

    answerCritique = (await critiqueAnswer(
      compactProfile(opts.profile),
      text,
      opts.turn.signal,
      opts.turn.usageSink,
    )) ?? undefined;

    if (shouldReviseAnswer(answerCritique ?? null, structural) && attempt === 0) {
      opts.turn.emit({
        type: "brain.status",
        phase: "revising",
        text: "Removing generic advice — grounding in your profile…",
        skills: opts.skillLabels,
      });
      revisionNotes = [
        ...structural.softWarn,
        ...(answerCritique?.revisions ?? []),
        ...(answerCritique && answerCritique.generality_penalty >= 7
          ? ["Collapse to ONE next action — no multi-channel strategy essay."]
          : []),
      ];
      continue;
    }

    if (answerCritique) {
      qualityWarn = shouldWarnAnswerQuality(answerCritique);
    }
    break;
  }

  for (const chunk of chunkTextForStream(text)) {
    opts.turn.emit({ type: "token", text: chunk });
  }

  if (answerCritique) {
    opts.turn.emit({
      type: "brain.answer_critique",
      critique: answerCritique,
      quality_warn: qualityWarn,
    });
  }

  return { text, answerCritique, qualityWarn, proposedActions };
}

function needsPhListSizeGate(message: string, profile: MarketingProfile): boolean {
  if (profile.email_list_size != null && profile.email_list_size > 0) return false;
  return /#1|number one|product hunt|ph launch|top 1|birinci/i.test(message);
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

  if (needsPhListSizeGate(opts.message, profile) && !decision.missing_info.some((q) => /email|list/i.test(q))) {
    decision = {
      ...decision,
      missing_info: [
        ...decision.missing_info,
        "How many engaged email subscribers do you have? (needed for honest PH aggression dial)",
      ].slice(0, 3),
    };
  }

  if (decisionFailsEthics(decision)) {
    opts.emit({
      type: "brain.status",
      phase: "revising",
      text: "Removing unethical PH language…",
      skills: skillLabels,
    });
    decision = await generateDecision(
      baseDecisionOpts([
        "Remove all upvote farm, vote ring, buy upvotes, or manipulation language.",
        "PH ethics: honest comments only — never beg for votes.",
      ]),
    );
  }

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
      if (
        (!firstCritique.approve && firstCritique.revisions.length > 0) ||
        firstCritique.generality_penalty > 6
      ) {
        opts.emit({
          type: "brain.status",
          phase: "revising",
          text: "Strengthening recommendation…",
          skills: skillLabels,
        });
        const antiNotes =
          firstCritique.generality_penalty > 6
            ? [
                "Reduce generic advice. Quote and obey skill anti-patterns from context.",
                "Include ≥5 measurable tactic_stack steps with registry-style ids.",
                ...firstCritique.revisions,
              ]
            : firstCritique.revisions;
        decision = await generateDecision(baseDecisionOpts(antiNotes));
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
  const primaryPlaybook = skills[0]?.playbook?.id;
  const aggressionLevel = primaryPlaybook?.includes("aggressive")
    ? "aggressive"
    : primaryPlaybook?.includes("no-audience")
      ? "conservative"
      : "standard";
  const tacticCount = skills[0]?.playbook?.body
    ? (skills[0].playbook.body.match(/^\d+\.\s+\*\*`/gm)?.length ??
      skills[0].playbook.body.match(/^\d+\.\s+/gm)?.length)
    : undefined;
  opts.emit({
    type: "brain.retrieved",
    skills: skillLabels,
    playbookId: primaryPlaybook,
    tacticCount: typeof tacticCount === "number" ? tacticCount : undefined,
    aggressionLevel,
  });

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
    if (draft.suggested_mode === "edit") {
      opts.emit(
        bundleToSseEvent({
          actions: [
            {
              kind: "edit_run",
              goal: `Apply the drafted marketing copy in the repo: ${draft.summary.slice(0, 240)}`,
              label: "Run in project",
            },
          ],
        }),
      );
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

  // Streaming answer (meta + quick Q&A) — buffered + quality gate before tokens reach UI
  opts.emit({
    type: "brain.status",
    phase: "answering",
    text: "Thinking…",
    skills: skillLabels,
  });

  const { text, answerCritique, proposedActions } = await generateAnswerWithQualityGate({
    turn: opts,
    intent,
    profile,
    skillContext,
    skillLabels,
    collectedAssets,
  });

  const localPack = opts.context?.local_context_pack;
  const executableActions = buildAnswerExecutableActions({
    message: opts.message,
    answerText: text,
    intent,
    localContextPack: localPack,
    planProgress: opts.planProgressSummary,
    proposedActions,
  });
  if (executableActions.length) {
    opts.emit(bundleToSseEvent({ actions: executableActions }));
    if (executableActions[0]?.kind === "edit_run") {
      opts.emit({
        type: "suggested_mode",
        mode: "edit",
        reason: "This answer needs file changes in your repo.",
      });
    }
  }

  const answerCta = buildAnswerCta({
    intent,
    profile,
    planProgress: opts.planProgressSummary,
  });
  if (answerCta) {
    opts.emit({
      type: "proactive_suggestion",
      title: answerCta.title,
      body: answerCta.body,
      action: answerCta.action,
      buttonLabel: answerCta.buttonLabel,
      source: "brain",
    });
  }

  return {
    intent,
    collectedAssets,
    persist: {
      kind: "answer",
      text,
      assets: collectedAssets,
      answer_critique: answerCritique,
      proactive: answerCta
        ? {
            title: answerCta.title,
            body: answerCta.body,
            action: answerCta.action,
            source: "brain",
          }
        : undefined,
    },
  };
}
