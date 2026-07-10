import { CheckCircle, Clock, FileText, Undo2 } from "lucide-react";
import { EmptyState } from "@renderer/components/EmptyState";
import { useApp } from "@renderer/state/store";
import type { MarketingAsset, ServerAsset } from "@shared/types";

type LibraryAsset = MarketingAsset & { applied: boolean; appliedCommit?: string | null };

function toAsset(row: ServerAsset): LibraryAsset {
  return {
    id: row.id,
    type: (row.type as MarketingAsset["type"]) ?? "landing-copy",
    targetFile: row.target_file ?? undefined,
    before: row.before_text ?? undefined,
    after: row.after_text,
    applied: !!row.applied_at,
    appliedCommit: row.applied_commit ?? undefined,
  };
}

export function AssetLibrary() {
  const serverAssets = useApp((s) => s.serverAssets);
  const thread = useApp((s) => s.thread);
  const focusArtifact = useApp((s) => s.focusArtifact);
  const rollbackAsset = useApp((s) => s.rollbackAsset);
  const launchComposerAction = useApp((s) => s.launchComposerAction);

  const threadAssets: LibraryAsset[] = thread
    .filter((e) => e.kind === "asset" && e.asset)
    .map((e) => ({ ...(e.asset as MarketingAsset), applied: !!e.asset?.appliedCommit }));

  const merged: LibraryAsset[] = [
    ...serverAssets.map(toAsset),
    ...threadAssets.filter((t) => !serverAssets.some((s) => s.id === t.id)),
  ];

  if (merged.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon={FileText}
          title="No assets yet"
          description="Ask the agent for landing copy, emails, or ad drafts — everything it writes lands here."
          primaryAction={{
            label: "Draft landing copy",
            onClick: () =>
              launchComposerAction({ mode: "ask", draft: "Write landing page copy for this product." }),
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="mb-4 text-[14px] font-medium text-text">Asset library</h2>
      <ul className="space-y-2">
        {merged.map((asset) => (
          <li key={asset.id}>
            <div className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3 transition-colors hover:border-accent/40 hover:bg-elevated">
              <button
                onClick={() => focusArtifact({ mode: "diff", assetId: asset.id })}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <FileText size={16} className="shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body-sm text-text">
                    {asset.targetFile ?? asset.type}
                  </div>
                  <div className="mt-0.5 text-micro text-text-3">{asset.type}</div>
                </div>
              </button>
              {asset.applied ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1 text-micro text-ok">
                    <CheckCircle size={12} /> Applied
                  </span>
                  {asset.appliedCommit && (
                    <button
                      onClick={() => void rollbackAsset(asset.id, asset.appliedCommit!)}
                      className="flex items-center gap-1 rounded-[6px] border border-line px-2 py-0.5 text-micro text-text-2 hover:bg-elevated"
                      title="Revert git commit"
                    >
                      <Undo2 size={11} /> Rollback
                    </button>
                  )}
                </div>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-micro text-warn">
                  <Clock size={12} /> Pending
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
