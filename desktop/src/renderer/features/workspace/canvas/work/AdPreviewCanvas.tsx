import { useMemo } from "react";
import { Copy, Download, Megaphone, Package, Search } from "lucide-react";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { downloadAdExportZip } from "@renderer/lib/exportDownload";
import { useApp } from "@renderer/state/store";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { pickAdAsset } from "./surfaceData";
import type { MarketingAsset } from "@shared/types";

function MetaAdMock({ asset, productName }: { asset: MarketingAsset; productName: string }) {
  const headline = asset.after.split("\n")[0]?.slice(0, 80) ?? productName;
  const body = asset.after.slice(0, 200);
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-3">
        Meta feed preview
      </div>
      <div className="rounded-[var(--radius-md)] border border-line bg-surface p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-micro font-bold text-accent">
            {productName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-mini font-medium text-text">{productName}</div>
            <div className="text-[10px] text-text-3">Sponsored</div>
          </div>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-body-sm leading-relaxed text-text">
          {body}
        </p>
        <div className="mt-3 rounded-[var(--radius-sm)] bg-elevated px-3 py-2">
          <div className="text-micro font-medium text-text">{headline}</div>
          <div className="text-[10px] text-text-3">yourproduct.com</div>
        </div>
        {/* Decorative CTA — part of the platform mock, intentionally inert. */}
        <span
          aria-hidden
          className="btn-accent pointer-events-none mt-3 block w-full rounded-[var(--radius-sm)] py-2 text-center text-mini"
        >
          Learn more
        </span>
      </div>
    </div>
  );
}

function GoogleAdMock({ asset, productName }: { asset: MarketingAsset; productName: string }) {
  const lines = asset.after.split("\n").filter(Boolean);
  const headline = lines[0]?.slice(0, 30) ?? productName;
  const description = lines.slice(1).join(" ").slice(0, 90) || asset.after.slice(0, 90);
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-3">
        Google Search preview
      </div>
      <div className="rounded-[var(--radius-md)] border border-line bg-white p-4 text-black">
        <div className="text-micro text-[#202124]">Ad · yourproduct.com</div>
        <div className="mt-1 text-[18px] text-[#1a0dab]">{headline}</div>
        <div className="mt-1 text-body-sm leading-snug text-[#4d5156]">{description}</div>
      </div>
    </div>
  );
}

export function AdPreviewCanvas() {
  const thread = useApp((s) => s.thread);
  const canvas = useApp((s) => s.canvas);
  const project = useApp((s) => s.project);
  const focusArtifact = useApp((s) => s.focusArtifact);

  const threadAssets = useMemo(
    () => thread.filter((e) => e.kind === "asset" && e.asset).map((e) => e.asset!),
    [thread],
  );

  const adLike = useMemo(
    () => threadAssets.filter((a) => a.type === "ad" || a.type === "tweet"),
    [threadAssets],
  );

  const asset = pickAdAsset(threadAssets, canvas.adPreviewAssetId ?? canvas.activeAssetId);

  const productName = project?.name ?? "Your product";

  const exportAdPack = () => {
    if (!asset) return;
    downloadAdExportZip(asset, productName);
  };

  const exportAdCopy = () => {
    if (!asset) return;
    const text = `# Ad draft — ${productName}\n\n${asset.after}\n\n— Draft only. You publish from your ad platform.`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-draft-${productName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAdCopy = async () => {
    if (!asset) return;
    await navigator.clipboard.writeText(asset.after);
  };

  if (!asset || adLike.length === 0) {
    const guide = SURFACE_UNLOCK["ad-preview"];
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-8">
        <GuidedEmptyState
          icon={Megaphone}
          title={guide.unlockTitle}
          description={guide.unlockReason}
          steps={guide.steps}
          primaryAction={{
            label: guide.primaryLabel,
            onClick: () => runSurfaceUnlockAction(guide.primaryAction),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={exportAdPack}
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-accent-border bg-accent-soft px-2.5 py-1 text-micro text-accent hover:bg-accent-soft/80"
        >
          <Package size={12} /> Export pack
        </button>
        <button
          type="button"
          onClick={exportAdCopy}
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-text-2 hover:bg-elevated"
        >
          <Download size={12} /> Export ad copy
        </button>
        <button
          type="button"
          onClick={() => void copyAdCopy()}
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-text-2 hover:bg-elevated"
        >
          <Copy size={12} /> Copy creative
        </button>
        <span className="text-micro text-text-3">Draft only — you publish</span>
        <span className="text-micro text-text-3">·</span>
        <span className="text-micro text-text-3">In-app Meta OAuth publish: Faz 12</span>
      </div>
      {adLike.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Search size={14} className="text-text-3" />
          <span className="text-micro text-text-3">Creative:</span>
          {adLike.map((a) => (
            <button
              key={a.id}
              onClick={() => focusArtifact({ mode: "ad-preview", assetId: a.id })}
              className={`rounded-[6px] border px-2 py-1 text-[10.5px] ${
                a.id === asset.id
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line text-text-2 hover:bg-elevated"
              }`}
            >
              {a.type} · {a.after.slice(0, 24)}…
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <MetaAdMock asset={asset} productName={productName} />
        <GoogleAdMock asset={asset} productName={productName} />
      </div>
      <p className="text-center text-micro text-text-3">
        Mock previews only. Export pack includes HTML mocks, checklist, and copy — publish from Meta Ads
        Manager or Google Ads.
      </p>
    </div>
  );
}
