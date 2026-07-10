import { Maximize2 } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { SessionEvent } from "@renderer/state/session";
import { ThreadCard } from "./ThreadCard";

export function BrowserFrameCard({ event }: { event: SessionEvent }) {
  const focusArtifact = useApp((s) => s.focusArtifact);
  if (!event.frame) return null;

  return (
    <ThreadCard tone="neutral" header={{ icon: Maximize2, label: "Browser step" }} className="max-w-[88%]">
      {event.text && <p className="mb-2 text-micro text-text-2">{event.text}</p>}
      <button
        type="button"
        onClick={() => focusArtifact({ mode: "browser" })}
        className="group block w-full overflow-hidden rounded-[var(--radius-md)] border border-line"
      >
        <img
          src={`data:image/png;base64,${event.frame}`}
          alt="Browser step"
          className="max-h-28 w-full bg-bg object-contain opacity-90 transition-opacity group-hover:opacity-100"
        />
        <span className="flex items-center gap-1 bg-surface-2 px-2.5 py-1 text-micro text-text-2">
          <Maximize2 size={11} /> View in canvas
        </span>
      </button>
    </ThreadCard>
  );
}
