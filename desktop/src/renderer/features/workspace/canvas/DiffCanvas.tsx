import { useMemo, useState } from "react";
import { FileQuestion } from "lucide-react";
import type { MarketingAsset } from "@shared/types";
import { resolveAssetActions } from "@shared/assetActions";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { useApp } from "@renderer/state/store";
import { DiffViewer } from "@renderer/components/DiffViewer";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { TargetFilePicker } from "@renderer/components/TargetFilePicker";
import { assetDiff } from "@renderer/lib/assetDiff";

export function DiffCanvas() {
  const thread = useApp((s) => s.thread);
  const project = useApp((s) => s.project);
  const activeAssetId = useApp((s) => s.canvas.activeAssetId);
  const applyMarketingAsset = useApp((s) => s.applyMarketingAsset);
  const integrateCopyIntoSite = useApp((s) => s.integrateCopyIntoSite);
  const updateAssetTargetFile = useApp((s) => s.updateAssetTargetFile);
  const focusArtifact = useApp((s) => s.focusArtifact);
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

  const applyAction = actions?.secondary.find((a) => a.kind === "apply_sidecar");
  const integratePrimary = actions?.primary.kind === "integrate_run";
  const integrateSecondary = actions?.secondary.find((a) => a.kind === "integrate_run");

  if (!asset || !actions) {
    const guide = SURFACE_UNLOCK["marketing-diff"];
    return (
      <div className="flex h-full items-center justify-center p-8">
        <GuidedEmptyState
          icon={FileQuestion}
          title="No asset selected"
          description="Generated assets show up here as a reviewable diff."
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

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl">
        <DiffViewer
          file={integratePrimary ? (actions.integrateRoute ?? actions.displayPath) : actions.displayPath}
          removed={removed}
          added={added}
          approveLabel={integratePrimary ? actions.primary.label : (applyAction?.label ?? "Apply to project")}
          approveDisabled={
            integratePrimary
              ? false
              : !actions.canApplyToRepo || !!asset.appliedCommit || applyAction?.disabled
          }
          approveTitle={
            integratePrimary
              ? actions.primary.title
              : asset.appliedCommit
                ? "Already applied"
                : (applyAction?.title ?? actions.applyBlockReason)
          }
          onApprove={() =>
            integratePrimary
              ? integrateCopyIntoSite(asset, actions.integrateRoute)
              : void applyMarketingAsset(asset)
          }
          onReject={() => focusArtifact({ mode: "empty" })}
          secondaryAction={
            integratePrimary && applyAction
              ? {
                  label: applyAction.label,
                  onClick: () => void applyMarketingAsset(asset),
                  title: applyAction.title,
                  disabled: !actions.canApplyToRepo || !!asset.appliedCommit || applyAction.disabled,
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
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-2 text-micro text-accent hover:underline"
        >
          Choose target file…
        </button>
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
