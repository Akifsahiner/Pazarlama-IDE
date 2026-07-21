import { Radio } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@renderer/state/store";

/** Inline run telemetry — one line, not a second panel. */
export function LiveActivityStrip() {
  const feedItems = useApp((s) => s.feedItems);
  const run = useApp((s) => s.run);

  const active =
    run?.status === "running" || run?.status === "planning" || run?.status === "created";

  const latest = useMemo(() => feedItems.slice(-2).reverse(), [feedItems]);

  if (!active) return null;

  return (
    <div
      className="mx-auto flex w-full max-w-4xl items-center gap-2 px-1 py-1 text-micro text-text-3"
      data-testid="live-activity-strip"
    >
      <Radio size={11} className="shrink-0 animate-pulse text-accent" />
      <span className="shrink-0 font-medium text-accent">{run?.intent ?? "Running"}</span>
      {latest.length > 0 && (
        <>
          <span className="text-text-3">·</span>
          <span className="truncate">{latest.map((i) => i.title).join(" · ")}</span>
        </>
      )}
    </div>
  );
}
