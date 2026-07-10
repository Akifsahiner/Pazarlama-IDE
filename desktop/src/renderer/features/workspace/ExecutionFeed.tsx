import { ChevronDown, ChevronUp, Radio } from "lucide-react";
import { useMemo } from "react";
import { FEED_FILTERS, filterFeedItems, type FeedFilter } from "@shared/feed";
import { useApp } from "@renderer/state/store";
import { Segmented } from "@renderer/components/ui/Segmented";
import { DemoDataBanner } from "@renderer/components/DemoDataBanner";
import { FeedTimeline } from "./feed/FeedTimeline";

export function ExecutionFeed({ mini }: { mini?: boolean }) {
  const feedItems = useApp((s) => s.feedItems);
  const feedFilter = useApp((s) => s.feedFilter);
  const feedCollapsed = useApp((s) => s.feedCollapsed);
  const activeFeedItemId = useApp((s) => s.activeFeedItemId);
  const setFeedFilter = useApp((s) => s.setFeedFilter);
  const toggleFeedCollapsed = useApp((s) => s.toggleFeedCollapsed);
  const openFeedItem = useApp((s) => s.openFeedItem);

  const filtered = useMemo(
    () => filterFeedItems(feedItems, feedFilter),
    [feedItems, feedFilter],
  );

  const pending = feedItems.filter((i) => i.category === "gate" && i.status === "waiting").length;
  const stripItems = feedItems.slice(-3);

  if (mini || feedCollapsed) {
    return (
      <div className="flex shrink-0 flex-col border-t border-line bg-elevated/80 backdrop-blur-sm">
        <DemoDataBanner />
        <div className="flex items-center gap-2 px-3 py-2">
          <Radio size={13} className="shrink-0 text-accent" />
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
            {stripItems.length === 0 ? (
              <span className="truncate text-micro text-text-3">No execution activity yet</span>
            ) : (
              stripItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openFeedItem(item.id)}
                  className="truncate text-micro text-text-2 hover:text-text"
                >
                  {item.title}
                </button>
              ))
            )}
          </div>
          {pending > 0 && (
            <button
              type="button"
              onClick={() => {
                const gate = feedItems.find(
                  (i) => i.category === "gate" && i.status === "waiting" && !i.isDemo,
                );
                if (gate) openFeedItem(gate.id);
                setFeedFilter("needs-you");
                toggleFeedCollapsed(false);
              }}
              className="shrink-0 rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-medium text-warn hover:bg-warn/30"
            >
              {pending} need you · Review
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleFeedCollapsed(false)}
            className="flex shrink-0 items-center gap-1 text-micro text-accent hover:underline"
          >
            Expand <ChevronUp size={12} />
          </button>
        </div>
        <div className="flex items-center gap-2 border-t border-line/60 px-3 py-1.5">
          <Segmented
            value={feedFilter}
            onChange={(v) => setFeedFilter(v as FeedFilter)}
            options={FEED_FILTERS.map((f) => ({ value: f.id, label: f.label }))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col border-t border-line bg-elevated/80 backdrop-blur-sm">
      <DemoDataBanner />
      <div className="flex items-center justify-between gap-3 border-b border-line/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-accent" />
          <span className="text-mini font-semibold text-text">Execution feed</span>
          {pending > 0 && (
            <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-medium text-warn">
              {pending} in stage
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={feedFilter}
            onChange={(v) => setFeedFilter(v as FeedFilter)}
            options={FEED_FILTERS.map((f) => ({ value: f.id, label: f.label }))}
          />
          <button
            type="button"
            onClick={() => toggleFeedCollapsed(true)}
            title="Collapse feed"
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-text-3 hover:bg-surface-2 hover:text-text"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <div className="h-[var(--execution-feed-h,180px)] min-h-[120px]">
        <FeedTimeline
          items={filtered}
          activeId={activeFeedItemId}
          onSelect={openFeedItem}
        />
      </div>
    </div>
  );
}
