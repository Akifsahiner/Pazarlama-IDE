import { useMemo, useState } from "react";
import { FileText, Mail, Megaphone } from "lucide-react";
import { emailAssetMailtoUrl } from "@shared/outreachPack";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { useApp } from "@renderer/state/store";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { Badge } from "@renderer/components/ui/Badge";
import { buildContentSetItems } from "./surfaceData";

type Filter = "all" | "post" | "email" | "ad" | "landing";

export function ContentSetCanvas() {
  const plan = useApp((s) => s.plan);
  const thread = useApp((s) => s.thread);
  const serverAssets = useApp((s) => s.serverAssets);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const focusArtifact = useApp((s) => s.focusArtifact);
  const [filter, setFilter] = useState<Filter>("all");

  const threadAssets = useMemo(
    () => thread.filter((e) => e.kind === "asset" && e.asset).map((e) => e.asset!),
    [thread],
  );

  const items = useMemo(
    () => buildContentSetItems(plan, threadAssets, serverAssets),
    [plan, threadAssets, serverAssets],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "landing") return items.filter((i) => i.type.includes("landing"));
    return items.filter((i) => i.type === filter || i.type.includes(filter));
  }, [items, filter]);

  if (items.length === 0) {
    const guide = SURFACE_UNLOCK["content-set"];
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-8">
        <GuidedEmptyState
          icon={FileText}
          title={guide.unlockTitle}
          description={guide.unlockReason}
          steps={guide.steps}
          primaryAction={{
            label: guide.primaryLabel,
            onClick: () => runSurfaceUnlockAction(guide.primaryAction),
          }}
          secondaryAction={
            guide.secondaryAction
              ? {
                  label: guide.secondaryLabel!,
                  onClick: () => runSurfaceUnlockAction(guide.secondaryAction!),
                }
              : undefined
          }
        />
      </div>
    );
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "post", label: "Posts" },
    { id: "email", label: "Email" },
    { id: "ad", label: "Ads" },
    { id: "landing", label: "Landing" },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-[var(--radius-sm)] px-3 py-1 text-micro ${
              filter === f.id ? "bg-accent-soft text-accent" : "text-text-2 hover:bg-elevated"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const openable = !!item.asset;
          const mailtoUrl =
            item.asset && (item.type === "email" || item.asset.type === "email")
              ? emailAssetMailtoUrl(item.asset)
              : null;
          const Wrapper = openable ? "button" : "div";
          return (
            <Wrapper
              key={item.id}
              onClick={
                openable
                  ? () => {
                      if (item.type === "ad" || item.type === "tweet") {
                        setWorkSurface("ad-preview");
                        focusArtifact({ mode: "ad-preview", assetId: item.asset!.id });
                      } else {
                        setWorkSurface("marketing-diff");
                        focusArtifact({ mode: "marketing-diff", assetId: item.asset!.id });
                      }
                    }
                  : undefined
              }
              className={`rounded-[var(--radius-md)] border border-line bg-surface-2 p-4 text-left transition-colors ${
                openable ? "hover:border-accent/40 hover:bg-elevated" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone="neutral">{item.type}</Badge>
                <span className="text-[10px] text-text-3">{item.channel}</span>
              </div>
              <div className="mt-2 line-clamp-2 text-body-sm font-medium text-text">{item.title}</div>
              <p className="mt-2 line-clamp-4 text-micro leading-relaxed text-text-2">
                {item.snippet}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {openable ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-accent">
                    <Megaphone size={11} /> Open preview
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-text-3">
                    Planned — ask the agent to draft it
                  </span>
                )}
                {mailtoUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(mailtoUrl, "_blank");
                    }}
                    className="inline-flex items-center gap-1 text-[10.5px] text-accent hover:underline"
                  >
                    <Mail size={11} /> Open in mail client
                  </button>
                )}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
