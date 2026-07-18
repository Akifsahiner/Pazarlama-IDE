import { ArrowRight, Sparkles } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { SessionEvent } from "@renderer/state/session";
import type { ProactiveSuggestionAction } from "@shared/agentTurnContext";
import { estimatePlanEffort, estimateProfileEffortHint } from "@shared/effortEstimate";
import { nextActionableTask } from "@shared/planProgress";
import { normalizePlan } from "@shared/planPlaybooks";
import { EffortBadge } from "@renderer/components/EffortBadge";
import { AgentMarkdown } from "../AgentMarkdown";
import { ThreadCard } from "./ThreadCard";
import { Button } from "@renderer/components/ui/Button";

function proactiveButtonLabel(action: ProactiveSuggestionAction, fallback?: string): string {
  if (fallback) return fallback;
  switch (action.kind) {
    case "continue_plan":
      return "Run task";
    case "generate_plan":
      return "Generate launch plan";
    case "open_plan":
      return "Open Plan Studio";
    case "focus_run":
      return "Return to run";
    case "log_kpi":
      return "Log KPI";
    default:
      return "Continue";
  }
}

export function ProactiveSuggestionCard({ event }: { event: SessionEvent }) {
  const executeProactiveAction = useApp((s) => s.executeProactiveAction);
  const plan = useApp((s) => s.plan);
  const planProgress = useApp((s) => s.planProgress);
  const marketingProfile = useApp((s) => s.marketingProfile);

  const effort = (() => {
    if (plan && planProgress) {
      const suite = normalizePlan(plan);
      const next = suite ? nextActionableTask(suite, planProgress.byTaskId) : null;
      return estimatePlanEffort(plan, {
        nextTaskId: next?.id,
        byTaskId: Object.fromEntries(
          Object.entries(planProgress.byTaskId).map(([id, row]) => [id, { status: row.status }]),
        ),
      });
    }
    return null;
  })();

  const effortLabel =
    effort?.label ??
    estimateProfileEffortHint(marketingProfile?.days_until_launch);

  const label = event.proactiveAction
    ? proactiveButtonLabel(event.proactiveAction, event.proactiveButtonLabel)
    : "Continue";

  return (
    <div data-testid="proactive-suggestion-card">
      <ThreadCard
        tone="accent"
        header={{ icon: Sparkles, label: event.proactiveTitle ?? "Suggested next step" }}
      >
      <div className="mb-2">
        <EffortBadge
          label={effortLabel}
          intensity={effort?.intensity ?? "standard"}
          compact
        />
      </div>
      {event.text && <AgentMarkdown content={event.text} />}
      {event.proactiveAction && (
        <div className="mt-3">
          <Button
            variant="primary"
            size="sm"
            iconRight={<ArrowRight size={14} />}
            onClick={() => executeProactiveAction(event.proactiveAction!)}
          >
            {label}
          </Button>
        </div>
      )}
    </ThreadCard>
    </div>
  );
}
