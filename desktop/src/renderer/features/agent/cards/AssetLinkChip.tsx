import { Maximize2 } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { assetFileName } from "@renderer/lib/assetDiff";
import type { SessionEvent } from "@renderer/state/session";
import { MarketingDecisionCard, tryParseDecision } from "../MarketingDecisionCard";

export function AssetLinkChip({ event }: { event: SessionEvent }) {
  const focusArtifact = useApp((s) => s.focusArtifact);
  if (!event.asset) return null;
  const asset = event.asset;

  const decision = tryParseDecision(asset.after);
  if (decision) {
    return <MarketingDecisionCard decision={decision} />;
  }

  const label = assetFileName(asset);
  const surface = asset.type === "ad" || asset.type === "tweet" ? "ad-preview" : "content-set";
  const surfaceLabel = surface === "ad-preview" ? "Ad preview" : "Content set";

  return (
    <button
      type="button"
      onClick={() =>
        focusArtifact({
          mode: surface === "ad-preview" ? "ad-preview" : "diff",
          assetId: asset.id,
        })
      }
      className="inline-flex max-w-[96%] items-center gap-1.5 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-left text-mini text-text-2 transition-colors hover:bg-elevated"
    >
      <Maximize2 size={12} className="shrink-0 text-accent" />
      <span>
        <span className="font-medium text-text">{label}</span>
        <span className="text-text-3"> — open in {surfaceLabel}</span>
      </span>
    </button>
  );
}
