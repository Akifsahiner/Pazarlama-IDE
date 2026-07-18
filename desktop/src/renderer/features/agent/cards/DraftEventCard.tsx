import { Eye } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { SessionEvent } from "@renderer/state/session";
import { AgentMarkdown } from "../AgentMarkdown";
import { DraftAssetPreview } from "../DraftAssetPreview";
import { DraftQualityBadge } from "@renderer/components/DraftQualityBadge";
import { AssetActionBar } from "@renderer/components/AssetActionBar";
import { decisionKindToMarketingType } from "@shared/assetActions";
import { ThreadCard } from "./ThreadCard";

export function DraftEventCard({ event }: { event: SessionEvent }) {
  const project = useApp((s) => s.project);

  return (
    <ThreadCard tone="neutral" header={{ icon: Eye, label: "Draft" }}>
      <div className="mb-2">
        <DraftQualityBadge
          critique={event.draftCritique}
          qualityWarn={event.draftQualityWarn}
        />
      </div>
      {event.draftSummary && <AgentMarkdown content={event.draftSummary} />}
      {(event.draftAssets ?? []).map((a, i) => {
        const marketingAsset = {
          id: `draft_${event.id}_${i}`,
          type: decisionKindToMarketingType(a.kind),
          targetFile: a.suggested_target_file,
          after: a.content,
        };
        return (
          <div key={i} className="mt-3 space-y-2">
            <DraftAssetPreview asset={a} />
            <AssetActionBar
              asset={marketingAsset}
              project={project}
              title={a.title}
              decisionKind={a.kind}
            />
          </div>
        );
      })}
    </ThreadCard>
  );
}
