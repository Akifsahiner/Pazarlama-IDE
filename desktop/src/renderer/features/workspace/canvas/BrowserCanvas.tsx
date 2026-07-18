import { useApp } from "@renderer/state/store";
import { IntentStrip } from "@renderer/components/IntentStrip";
import { ActivityTimeline } from "@renderer/components/ActivityTimeline";
import { Operator } from "@renderer/features/workspace/operator/Operator";

/**
 * Dedicated Computer Use canvas — full live theater with intent + activity
 * chrome so browse runs feel like a mission control stage, not an empty iframe.
 */
export function BrowserCanvas() {
  const run = useApp((s) => s.run);
  const browser = useApp((s) => s.browser);
  const events = run?.kind === "browse" ? run.events : run?.events.filter((e) =>
    e.type.startsWith("browser.") || e.type === "evidence.captured" || e.type === "agent.status",
  ) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      {(run || browser.running) && <IntentStrip />}

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex min-h-0">
          <div className="min-w-0 flex-1 overflow-hidden">
            <Operator />
          </div>
          <aside className="hidden w-[15.5rem] shrink-0 flex-col border-l border-line bg-surface/50 xl:flex">
            <div className="border-b border-line px-3 py-2 text-micro font-medium text-text-2">
              Live activity
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ActivityTimeline events={events} className="px-2 py-2" />
            </div>
            {browser.currentGoal && (
              <div className="border-t border-line px-3 py-2 text-[10px] leading-relaxed text-text-3">
                {browser.currentGoal}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
