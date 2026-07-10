import { FlaskConical, X } from "lucide-react";
import { useApp } from "@renderer/state/store";

export function DemoDataBanner() {
  const hasDemo = useApp((s) => s.feedItems.some((i) => i.isDemo));
  const clearDemoFeed = useApp((s) => s.clearDemoFeed);

  if (!hasDemo) return null;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-warn/30 bg-warn/10 px-3 py-1.5 text-micro text-warn">
      <span className="flex min-w-0 items-center gap-1.5">
        <FlaskConical size={12} className="shrink-0" />
        <span>
          Demo data — connectors not connected. Performance metrics require analytics setup.
        </span>
      </span>
      <button
        type="button"
        onClick={() => clearDemoFeed()}
        className="flex shrink-0 items-center gap-1 underline underline-offset-2 hover:opacity-80"
      >
        Hide demo feed
        <X size={11} />
      </button>
    </div>
  );
}
