/**
 * Marketing Brain orchestrator: routes the user request → loads the project
 * memory → retrieves relevant skill packs → produces a structured decision
 * (or a quick chat reply for meta questions).
 *
 * Used by `/agent` (chat) and `/plan` (strategic plan).
 */
import { marketingProfileSchema, type MarketingProfile } from "../schemas/marketingProfile.js";
import type { MarketingDecision } from "../schemas/decision.js";
import * as profileRepo from "../db/repos/marketingProfile.js";
import { route, type Discipline, type RoutedIntent } from "./router.js";
import { retrieveSkills, renderSkillContext, type SkillPack } from "./skillRetrieval.js";
import { decisionSystemPrompt, compactProfile } from "./prompts.js";
import { generateDecision } from "./generate.js";
import { critique, type Critique } from "./critic.js";

const CRITIC_DISCIPLINES = new Set<Discipline>([
  "positioning",
  "icp",
  "launch_plan",
  "ph_launch",
  "landing",
]);

export interface BrainEvent {
  type:
    | "brain.intent"
    | "brain.retrieved"
    | "brain.status"
    | "brain.profile"
    | "decision"
    | "error";
  payload?: unknown;
  message?: string;
}

export interface RunOpts {
  userId: string;
  projectId?: string;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  /** Optional pre-loaded profile (skip repo lookup). */
  profile?: MarketingProfile;
  /** Optional forced discipline (e.g. /plan always uses "launch_plan"). */
  forceDiscipline?: Discipline;
  /** SSE emitter — Brain pushes lifecycle events as it works. */
  emit: (event: BrainEvent) => void;
  signal?: AbortSignal;
}

export { runTurn, type TurnOpts, type TurnResult } from "./turn.js";

export interface RunResult {
  intent: RoutedIntent;
  skills: SkillPack[];
  decision: MarketingDecision;
  critique?: Critique;
}

/** Run a strategic decision turn end-to-end. Throws on unrecoverable errors. */
export async function runDecision(opts: RunOpts): Promise<RunResult> {
  const t0 = Date.now();

  // 1) Profile (cheap, possibly cached). When no project/profile is available
  // we run "stateless" with an empty profile so single-shot smokes and pre-
  // onboarding flows still work — the decision just won't be product-specific.
  const profile: MarketingProfile =
    opts.profile ??
    (opts.projectId ? await profileRepo.get(opts.userId, opts.projectId) : marketingProfileSchema.parse({}));

  opts.emit({ type: "brain.profile", payload: { gaps: profile.gaps } });

  // 2) Route
  const contextHint = opts.projectId ?? "";
  const intent = opts.forceDiscipline
    ? ({
        discipline: opts.forceDiscipline,
        task_kind: "decide",
        urgency: "deep",
        user_goal_summary: opts.message.slice(0, 120),
      } as RoutedIntent)
    : await route(opts.message, contextHint, opts.signal);
  opts.emit({
    type: "brain.intent",
    payload: { discipline: intent.discipline, task_kind: intent.task_kind, urgency: intent.urgency },
  });

  // 3) Retrieve skill packs (≤ 2)
  const skills = await retrieveSkills(intent.discipline, profile);
  opts.emit({
    type: "brain.retrieved",
    payload: {
      skills: skills.map((p) => ({ id: p.id, label: p.manifest.name })),
    },
  });
  const skillContext = renderSkillContext(skills);

  // 4) Generate
  opts.emit({ type: "brain.status", payload: { phase: "diagnosing", text: "Diagnosing current state…" } });
  const decision = await generateDecision({
    system: decisionSystemPrompt({
      discipline: intent.discipline,
      profile,
      skillContext,
      userGoalSummary: intent.user_goal_summary,
    }),
    userMessage: opts.message,
    history: opts.history,
    tier: intent.urgency === "deep" ? "main" : "main",
    onStatus: (text) => opts.emit({ type: "brain.status", payload: { text } }),
    signal: opts.signal,
  });

  opts.emit({ type: "decision", payload: decision });

  // Record the decision as a pending experiment so future retrievals can refer
  // to "what was tried before". The user can mark its outcome later from the UI.
  if (opts.projectId) {
    try {
      const expId = `exp_${Date.now().toString(36)}`;
      await profileRepo.recordExperiment(opts.userId, opts.projectId, {
        id: expId,
        date: new Date().toISOString(),
        hypothesis: decision.decision,
        discipline: intent.discipline,
        outcome: "pending",
      });
    } catch {
      /* persistence off / network blip — non-fatal */
    }
  }

  // Optional quality critic — only for strategic disciplines (or explicit deep urgency).
  let critiqueResult: Critique | null = null;
  if (intent.urgency === "deep" || CRITIC_DISCIPLINES.has(intent.discipline)) {
    opts.emit({ type: "brain.status", payload: { phase: "critiquing", text: "Reviewing decision…" } });
    critiqueResult = await critique(compactProfile(profile), decision, opts.signal);
    if (critiqueResult) {
      opts.emit({
        type: "brain.status",
        payload: { phase: "reviewed", text: `Reviewed · ${critiqueResult.total}/60`, score: critiqueResult },
      });
    }
  }

  void t0; // future: telemetry hook
  return { intent, skills, decision, critique: critiqueResult ?? undefined };
}
