import type { FeedItem } from "@shared/feed";
import { Activity } from "lucide-react";
import { EmptyState } from "@renderer/components/EmptyState";
import { FeedRow } from "./FeedRow";

export function FeedTimeline({
  items,
  activeId,
  onSelect,
}: {
  items: FeedItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Execution feed"
        description="System actions will appear here as the agent works — tool calls, file edits, and browser steps."
        className="h-full py-8"
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto px-1 py-1">
      <div className="space-y-0.5">
        {items.map((item) => (
          <FeedRow
            key={item.id}
            item={item}
            active={activeId === item.id}
            onClick={() => onSelect?.(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
