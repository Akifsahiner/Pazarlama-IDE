import { Eye } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { SessionEvent } from "@renderer/state/session";
import { AgentMarkdown } from "../AgentMarkdown";
import { DraftAssetPreview } from "../DraftAssetPreview";
import { DraftQualityBadge } from "@renderer/components/DraftQualityBadge";
import { ThreadCard } from "./ThreadCard";

export function DraftEventCard({ event }: { event: SessionEvent }) {
  const previewMarketingAsset = useApp((s) => s.previewMarketingAsset);

  return (
    <ThreadCard tone="neutral" header={{ icon: Eye, label: "Draft" }}>
      <div className="mb-2">
        <DraftQualityBadge
          critique={event.draftCritique}
          qualityWarn={event.draftQualityWarn}
        />
      </div>
      {event.draftSummary && <AgentMarkdown content={event.draftSummary} />}
      {(event.draftAssets ?? []).map((a, i) => (
        <div key={i} className="mt-3 space-y-2">
          <DraftAssetPreview asset={a} />
          <button
            type="button"
            onClick={() => void previewMarketingAsset(a)}
            className="rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 hover:bg-elevated"
          >
            Review draft
          </button>
        </div>
      ))}
    </ThreadCard>
  );
}
