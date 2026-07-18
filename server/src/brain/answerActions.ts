import { isBroadMarketingStrategy } from "./marketingStrategyRoute.js";
import type { ExecutableAction } from "./executionClassifier.js";
import type { PlanProgressSummary } from "../schemas/index.js";
import type { RoutedIntent } from "./router.js";

const EDIT_INTENT_RE =
  /\b(edit|fix|change|update|rewrite|improve|hero|cta|copy|landing|page|meta|tracking|implement|düzelt|düzenle|güncelle|sayfa)\b/i;

const DO_THIS_NEXT_RE = /###\s*Do this next\s*([\s\S]*?)(?=###|$)/i;

export function extractDoThisNextExcerpt(text: string): string | undefined {
  const m = text.match(DO_THIS_NEXT_RE);
  const section = m?.[1]?.trim();
  if (!section || section.length < 10) return undefined;
  return section.replace(/\n+/g, " ").slice(0, 300);
}

export function buildAnswerExecutableActions(opts: {
  message: string;
  answerText: string;
  intent: RoutedIntent;
  localContextPack?: string;
  planProgress?: PlanProgressSummary | null;
  proposedActions?: ExecutableAction[];
}): ExecutableAction[] {
  if (opts.proposedActions?.length) return opts.proposedActions.slice(0, 3);

  const actions: ExecutableAction[] = [];
  const doThisNext = extractDoThisNextExcerpt(opts.answerText);
  const hasRepo = Boolean(opts.localContextPack?.trim());

  if (opts.planProgress?.nextTaskId && isBroadMarketingStrategy(opts.message)) {
    return [
      {
        kind: "continue_plan",
        taskId: opts.planProgress.nextTaskId,
        playbookId: opts.planProgress.nextPlaybookId,
        label: opts.planProgress.nextTaskTitle
          ? `Run: ${opts.planProgress.nextTaskTitle}`
          : "Run next plan task",
      },
    ];
  }

  if (hasRepo && (EDIT_INTENT_RE.test(opts.message) || EDIT_INTENT_RE.test(doThisNext ?? ""))) {
    actions.push({
      kind: "edit_run",
      goal:
        doThisNext ||
        `Implement in the repo: ${opts.message.trim().slice(0, 200)}`,
      label: "Run in project",
    });
    return actions;
  }

  if (!opts.planProgress?.nextTaskId && EDIT_INTENT_RE.test(opts.message)) {
    actions.push({
      kind: "edit_run",
      goal: doThisNext || opts.message.trim().slice(0, 240),
      label: "Run in project",
    });
    return actions;
  }

  if (opts.planProgress?.nextTaskId) {
    actions.push({
      kind: "continue_plan",
      taskId: opts.planProgress.nextTaskId,
      playbookId: opts.planProgress.nextPlaybookId,
      label: opts.planProgress.nextTaskTitle
        ? `Run: ${opts.planProgress.nextTaskTitle}`
        : "Run next plan task",
    });
  } else if (!isBroadMarketingStrategy(opts.message)) {
    actions.push({ kind: "generate_plan", label: "Build executable plan" });
  }

  return actions.slice(0, 3);
}
