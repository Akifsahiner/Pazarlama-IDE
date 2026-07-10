import { useMemo, useState } from "react";
import { CheckCircle2, Clock, FileText, Library, Undo2 } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { MarketingAsset, ServerAsset } from "@shared/types";
import { Page } from "@renderer/components/ui/Page";
import { Badge } from "@renderer/components/ui/Badge";
import { Segmented } from "@renderer/components/ui/Segmented";
import { EmptyState } from "@renderer/components/EmptyState";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { OutreachDispatchPanel } from "./OutreachDispatchPanel";

type LibraryAsset = MarketingAsset & {
  applied: boolean;
  appliedCommit?: string | null;
  /** Draft-only assets from the live thread have no server persistence yet. */
  draft: boolean;
};

type Filter = "all" | "applied" | "pending";

function toAsset(row: ServerAsset): LibraryAsset {
  return {
    id: row.id,
    type: (row.type as MarketingAsset["type"]) ?? "landing-copy",
    targetFile: row.target_file ?? undefined,
    before: row.before_text ?? undefined,
    after: row.after_text,
    applied: !!row.applied_at,
    appliedCommit: row.applied_commit ?? undefined,
    draft: false,
  };
}

export function AssetsPage() {
  const serverAssets = useApp((s) => s.serverAssets);
  const thread = useApp((s) => s.thread);
  const project = useApp((s) => s.project);
  const focusArtifact = useApp((s) => s.focusArtifact);
  const rollbackAsset = useApp((s) => s.rollbackAsset);
  const navigate = useApp((s) => s.navigate);
  const launchComposerAction = useApp((s) => s.launchComposerAction);
  const openProjectPicker = useApp((s) => s.openProjectPicker);
  const settings = useApp((s) => s.settings);
  const [filter, setFilter] = useState<Filter>("all");

  const merged = useMemo<LibraryAsset[]>(() => {
    const threadAssets: LibraryAsset[] = thread
      .filter((e) => e.kind === "asset" && e.asset)
      .map((e) => ({
        ...(e.asset as MarketingAsset),
        applied: !!e.asset?.appliedCommit,
        draft: !e.asset?.appliedCommit,
      }));
    return [
      ...serverAssets.map(toAsset),
      ...threadAssets.filter((t) => !serverAssets.some((s) => s.id === t.id)),
    ];
  }, [thread, serverAssets]);

  const filtered = useMemo(() => {
    if (filter === "applied") return merged.filter((a) => a.applied);
    if (filter === "pending") return merged.filter((a) => !a.applied);
    return merged;
  }, [merged, filter]);

  return (
    <Page title="Assets" eyebrow="Library">
      {settings.persona === "sales" && (
        <div className="mb-5">
          <OutreachDispatchPanel variant="panel" />
        </div>
      )}
      {merged.length > 0 && (
        <div className="mb-4">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All (${merged.length})` },
              { value: "applied", label: "Applied" },
              { value: "pending", label: "Pending" },
            ]}
          />
        </div>
      )}

      {merged.length === 0 ? (
        <div className="flex h-[60vh] items-center justify-center">
          <GuidedEmptyState
            icon={Library}
            title={project ? "No assets yet" : "Open a project first"}
            description={
              project
                ? SURFACE_UNLOCK["content-set"].unlockReason
                : "Assets are scoped to your active project. Open a local folder, then ask the agent for copy or ads."
            }
            steps={project ? SURFACE_UNLOCK["content-set"].steps : undefined}
            primaryAction={
              project
                ? {
                    label: SURFACE_UNLOCK["content-set"].primaryLabel,
                    onClick: () => {
                      launchComposerAction({
                        mode: "ask",
                        draft: "Write landing page copy for this product.",
                      });
                      navigate("workspace");
                    },
                  }
                : { label: "Open project", onClick: openProjectPicker }
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center">
          <EmptyState
            icon={Library}
            title={filter === "applied" ? "Nothing applied yet" : "Nothing pending"}
            description={
              filter === "applied"
                ? "Apply an asset from the diff view and it shows up here with its commit."
                : "All assets have been applied — nice."
            }
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-2 p-3 transition-colors hover:border-[var(--accent-border)] hover:bg-elevated"
            >
              <button
                onClick={() => {
                  focusArtifact({ mode: "diff", assetId: asset.id });
                  navigate("workspace");
                }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <FileText size={16} className="shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body text-text">{asset.targetFile ?? asset.type}</div>
                  <div className="mt-0.5 line-clamp-1 text-caption">
                    {asset.type} · {asset.after.slice(0, 90)}
                  </div>
                </div>
              </button>
              {asset.applied ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="ok">
                    <CheckCircle2 size={11} /> Applied
                  </Badge>
                  {asset.appliedCommit && (
                    <button
                      onClick={() => void rollbackAsset(asset.id, asset.appliedCommit!)}
                      className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-0.5 text-caption text-text-2 hover:bg-elevated"
                      title="Revert git commit"
                    >
                      <Undo2 size={11} /> Rollback
                    </button>
                  )}
                </div>
              ) : asset.draft ? (
                <Badge tone="neutral">Draft</Badge>
              ) : (
                <Badge tone="warn">
                  <Clock size={11} /> Pending
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
