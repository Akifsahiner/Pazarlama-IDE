import { ArrowRight, Sparkles } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { SessionEvent } from "@renderer/state/session";
import { AgentMarkdown } from "../AgentMarkdown";
import { ThreadCard } from "./ThreadCard";
import { Button } from "@renderer/components/ui/Button";

export function ProactiveSuggestionCard({ event }: { event: SessionEvent }) {
  const executeProactiveAction = useApp((s) => s.executeProactiveAction);

  return (
    <div data-testid="proactive-suggestion-card">
      <ThreadCard
        tone="accent"
        header={{ icon: Sparkles, label: event.proactiveTitle ?? "Suggested next step" }}
      >
      {event.text && <AgentMarkdown content={event.text} />}
      {event.proactiveAction && (
        <div className="mt-3">
          <Button
            variant="primary"
            size="sm"
            iconRight={<ArrowRight size={14} />}
            onClick={() => executeProactiveAction(event.proactiveAction!)}
          >
            Continue
          </Button>
        </div>
      )}
    </ThreadCard>
    </div>
  );
}
