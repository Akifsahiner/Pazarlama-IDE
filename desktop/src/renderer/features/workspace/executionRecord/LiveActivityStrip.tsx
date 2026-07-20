import { Radio } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@renderer/state/store";

export function LiveActivityStrip() {
  const feedItems = useApp((s) => s.feedItems);
  const run = useApp((s) => s.run);
  const openFeedItem = useApp((s) => s.openFeedItem);

  const active =
    run?.status === "running" ||
    run?.status === "planning" ||
    run?.status === "created";

  const recent = useMemo(() => feedItems.slice(-4).reverse(), [feedItems]);

  if (!active && recent.length === 0) return null;

  return (
    <div
      className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-[var(--radius-md)] border border-line/60 bg-elevated/50 px-3 py-2"
      data-testid="live-activity-strip"
    >
      <Radio size={12} className={`shrink-0 ${active ? "animate-pulse text-accent" : "text-text-3"}`} />
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {active && run && (
          <span className="shrink-0 text-micro font-medium text-accent">
            Canlı · {run.intent ?? run.goal.slice(0, 60)}
          </span>
        )}
        {recent.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openFeedItem(item.id)}
            className="shrink-0 truncate text-micro text-text-3 hover:text-text"
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
