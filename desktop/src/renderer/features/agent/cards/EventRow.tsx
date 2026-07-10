import { HelpCircle } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { SessionEvent } from "@renderer/state/session";
import { humanizeBrainTool } from "@shared/brainLabels";
import { ErrorRow } from "@renderer/components/ErrorState";
import { EventChip } from "../EventChip";
import { PlanTaskCompleteCard } from "../PlanTaskCompleteCard";
import { PlanCompleteCard } from "../PlanCompleteCard";
import { MarketingDecisionCard } from "../MarketingDecisionCard";
import { ThinkingStrip } from "../ThinkingStrip";
import { ApprovalPointerCard } from "./ApprovalPointerCard";
import { AssetLinkChip } from "./AssetLinkChip";
import { BrowserFrameCard } from "./BrowserFrameCard";
import { DraftEventCard } from "./DraftEventCard";
import { ProactiveSuggestionCard } from "./ProactiveSuggestionCard";
import { PlanRevisionCard } from "./PlanRevisionCard";

function FeedLinkEvent({ event }: { event: SessionEvent }) {
  const openFeedItem = useApp((s) => s.openFeedItem);
  const toggleFeedCollapsed = useApp((s) => s.toggleFeedCollapsed);
  return (
    <EventChip
      kind="feed"
      label={event.text ? `${event.text} → execution feed` : "View in execution feed"}
      onClick={() => {
        if (event.feedItemId) openFeedItem(event.feedItemId);
        else toggleFeedCollapsed(false);
      }}
    />
  );
}

/** Compact chronology marker for answered/dismissed missing_info questions. */
export function MissingInfoThreadCard({ event }: { event: SessionEvent }) {
  const question = event.missingQuestions?.[0];
  const answered = event.missingInfoState === "answered";
  const dismissed = event.missingInfoState === "dismissed";

  if (answered || dismissed) {
    return (
      <div className="max-w-[96%] rounded-[var(--radius-md)] border border-line/60 bg-surface/40 px-3 py-2">
        <div className="flex items-start gap-2 text-micro text-text-3">
          <HelpCircle size={11} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0">
            {question && <p className="text-body-sm text-text-2">{question}</p>}
            <p className="mt-0.5">
              {answered ? "Answered ✓" : "Dismissed"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-micro text-text-3">
      <HelpCircle size={11} className="shrink-0 text-accent" />
      Asked for more context — answer in the card above.
    </div>
  );
}

export function EventRow({ event, streaming }: { event: SessionEvent; streaming: boolean }) {
  const serverProjectId = useApp((s) => s.activeProjectId);
  const project = useApp((s) => s.project);

  switch (event.kind) {
    case "text":
      return null;
    case "thinking":
      return streaming ? <ThinkingStrip event={event} /> : null;
    case "decision":
      return event.decision ? (
        <MarketingDecisionCard
          decision={event.decision}
          critique={event.critique}
          summary={event.summary}
          eventId={event.id}
          projectId={serverProjectId ?? project?.id}
          skillId={event.thinkingSkills?.[0]}
        />
      ) : null;
    case "plan_task_complete":
      return (
        <PlanTaskCompleteCard
          completedDay={event.completedTaskDay}
          completedTitle={event.text}
          completedTaskId={event.completedTaskId}
          nextDay={event.nextTaskDay}
          nextTitle={event.nextTaskTitle}
          nextTaskId={event.planTaskFailed ? event.completedTaskId : event.nextTaskId}
          nextPlaybookId={event.nextPlaybookId}
          failed={event.planTaskFailed}
          variant={event.planTaskVariant ?? (event.planTaskFailed ? "failed" : "done")}
          reviewGate={event.planTaskReviewGate}
        />
      );
    case "plan_complete":
      return <PlanCompleteCard />;
    case "plan_revision":
      return event.planRevisionDiff ? (
        <PlanRevisionCard
          summary={event.planRevisionSummary ?? event.text ?? "Plan updated"}
          diff={event.planRevisionDiff}
          sourcePlanId={event.sourcePlanId}
        />
      ) : null;
    case "draft":
      return <DraftEventCard event={event} />;
    case "proactive_suggestion":
      return <ProactiveSuggestionCard event={event} />;
    case "missing_info":
      return <MissingInfoThreadCard event={event} />;
    case "status":
      return <EventChip kind="status" label={event.text ?? "Working…"} spinning={streaming} />;
    case "tool":
      if (event.tool?.startsWith("brain.")) {
        return (
          <EventChip
            kind="tool"
            label={humanizeBrainTool(event.tool)}
          />
        );
      }
      return (
        <EventChip
          kind="tool"
          label={event.tool ? `${event.tool}${event.text ? ` · ${event.text}` : ""}` : event.text ?? "tool"}
        />
      );
    case "feed_link":
      return <FeedLinkEvent event={event} />;
    case "asset":
      return <AssetLinkChip event={event} />;
    case "browser_frame":
      return <BrowserFrameCard event={event} />;
    case "approval":
      return event.approvalId ? <ApprovalPointerCard event={event} /> : null;
    case "error":
      return <ErrorRow message={event.text ?? "Unknown error"} />;
    default:
      return null;
  }
}
