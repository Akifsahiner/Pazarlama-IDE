import { useMemo, useState } from "react";
import { FileQuestion, Sparkles } from "lucide-react";
import type { MarketingAsset } from "@shared/types";
import { resolveAssetActions } from "@shared/assetActions";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { useApp } from "@renderer/state/store";
import { DiffViewer } from "@renderer/components/DiffViewer";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { TargetFilePicker } from "@renderer/components/TargetFilePicker";
import { Badge } from "@renderer/components/ui/Badge";
import { assetDiff } from "@renderer/lib/assetDiff";

const TYPE_LABEL: Record<MarketingAsset["type"], string> = {
  "landing-copy": "Landing page",
  tweet: "Social post",
  email: "Email",
  ad: "Ad creative",
};

function integrateRouteLabel(route?: string) {
  if (!route) return null;
  return (
    <>
      Target: <span className="font-mono text-text">{route}</span>.
    </>
  );
}

export function MarketingDiffCanvas() {
  const thread = useApp((s) => s.thread);
  const project = useApp((s) => s.project);
  const activeAssetId = useApp((s) => s.canvas.activeAssetId);
  const applyMarketingAsset = useApp((s) => s.applyMarketingAsset);
  const integrateCopyIntoSite = useApp((s) => s.integrateCopyIntoSite);
  const updateAssetTargetFile = useApp((s) => s.updateAssetTargetFile);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const [pickerOpen, setPickerOpen] = useState(false);

  const assets = useMemo(
    () => thread.filter((e) => e.kind === "asset" && e.asset).map((e) => e.asset as MarketingAsset),
    [thread],
  );

  const asset = useMemo(
    () => assets.find((a) => a.id === activeAssetId) ?? assets[assets.length - 1],
    [assets, activeAssetId],
  );

  const actions = useMemo(() => {
    if (!asset) return null;
    return resolveAssetActions({ asset, project });
  }, [asset, project]);

  const applyAction = useMemo(() => {
    if (!actions) return null;
    return actions.secondary.find((a) => a.kind === "apply_sidecar");
  }, [actions]);

  const integratePrimary = actions?.primary.kind === "integrate_run";
  const integrateSecondary = actions?.secondary.find((a) => a.kind === "integrate_run");

  if (!asset || !actions) {
    const guide = SURFACE_UNLOCK["marketing-diff"];
    return (
      <div className="flex h-full items-center justify-center p-8">
        <GuidedEmptyState
          icon={FileQuestion}
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

  const { removed, added } = assetDiff(asset);
  const alreadyApplied = !!asset.appliedCommit;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-accent/20 bg-accent-soft/20 px-4 py-3">
          <Sparkles size={16} className="text-accent" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm font-medium text-text">Marketing diff</span>
              <Badge tone="accent">{TYPE_LABEL[asset.type]}</Badge>
              {alreadyApplied && <Badge tone="ok">Applied</Badge>}
            </div>
            <p className="mt-0.5 text-micro text-text-2">
              {integratePrimary
                ? "Apply weaves this copy into your site code. Save to marketing/ keeps a sidecar draft."
                : "Review changes before writing to your project. Apply saves to"}{" "}
              {!integratePrimary && (
                <span className="font-mono text-text">{actions.displayPath}</span>
              )}
              {integratePrimary && integrateRouteLabel(actions.integrateRoute)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-micro text-accent underline-offset-2 hover:underline"
          >
            Choose file…
          </button>
        </div>
        <DiffViewer
          file={integratePrimary ? (actions.integrateRoute ?? actions.displayPath) : actions.displayPath}
          removed={removed}
          added={added}
          approveLabel={integratePrimary ? actions.primary.label : (applyAction?.label ?? "Apply to project")}
          approveDisabled={
            integratePrimary
              ? false
              : !actions.canApplyToRepo || alreadyApplied || applyAction?.disabled
          }
          approveTitle={
            integratePrimary
              ? actions.primary.title
              : alreadyApplied
                ? "Already applied in this session"
                : (applyAction?.title ?? actions.applyBlockReason)
          }
          onApprove={() =>
            integratePrimary
              ? integrateCopyIntoSite(asset, actions.integrateRoute)
              : void applyMarketingAsset(asset)
          }
          onReject={() => setWorkSurface("content-set")}
          secondaryAction={
            integratePrimary && applyAction
              ? {
                  label: applyAction.label,
                  onClick: () => void applyMarketingAsset(asset),
                  title: applyAction.title,
                  disabled: !actions.canApplyToRepo || alreadyApplied || applyAction.disabled,
                }
              : integrateSecondary
                ? {
                    label: integrateSecondary.label,
                    onClick: () => integrateCopyIntoSite(asset, actions.integrateRoute),
                    title: integrateSecondary.title,
                  }
                : undefined
          }
        />
      </div>
      <TargetFilePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        defaultName={actions.targetFile}
        onSelect={(path) => void updateAssetTargetFile(asset.id, path)}
      />
    </div>
  );
}
