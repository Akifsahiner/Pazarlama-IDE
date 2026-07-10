import type { MarketingAsset, MarketingDecisionAsset, ProjectProfile } from "@shared/types";
import {
  prepareMarketingAssetFromDecision,
  resolveAssetActions,
  type AssetActionKind,
} from "@shared/assetActions";
import { useApp } from "@renderer/state/store";

async function runCopy(content: string) {
  try {
    await navigator.clipboard.writeText(content);
  } catch {
    /* clipboard unavailable */
  }
}

export function AssetActionBar({
  asset,
  project,
  title,
  decisionKind,
  onPickTarget,
  compact = false,
}: {
  asset: MarketingAsset;
  project: ProjectProfile | null;
  title?: string;
  decisionKind?: MarketingDecisionAsset["kind"];
  onPickTarget?: () => void;
  compact?: boolean;
}) {
  const previewMarketingAsset = useApp((s) => s.previewMarketingAsset);
  const applyMarketingAsset = useApp((s) => s.applyMarketingAsset);
  const integrateCopyIntoSite = useApp((s) => s.integrateCopyIntoSite);

  const actions = resolveAssetActions({ asset, project, title, decisionKind });

  const run = (kind: AssetActionKind) => {
    if (kind === "copy") {
      void runCopy(asset.after);
      return;
    }
    if (kind === "preview" && decisionKind && title) {
      void previewMarketingAsset({
        kind: decisionKind,
        title,
        content: asset.after,
        suggested_target_file: asset.targetFile,
      });
      return;
    }
    if (kind === "preview") {
      return;
    }
    if (kind === "apply_sidecar") {
      void applyMarketingAsset(asset);
      return;
    }
    if (kind === "integrate_run") {
      integrateCopyIntoSite(asset, actions.integrateRoute);
      return;
    }
    if (kind === "pick_target") {
      onPickTarget?.();
    }
  };

  const btnClass =
    "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text disabled:opacity-40";

  const accentPrimary =
    actions.primary.kind === "integrate_run" ||
    (actions.primary.kind === "preview" && compact) ||
    actions.primary.kind === "copy";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => run(actions.primary.kind)}
        disabled={actions.primary.disabled}
        title={actions.primary.title}
        className={accentPrimary ? `btn-accent ${btnClass}` : btnClass}
      >
        {actions.primary.label}
      </button>
      {actions.secondary.map((action) => (
        <button
          key={action.kind + action.label}
          type="button"
          onClick={() => run(action.kind)}
          disabled={action.disabled}
          title={action.title}
          className={btnClass}
        >
          {action.label}
        </button>
      ))}
      {onPickTarget && (
        <button type="button" onClick={onPickTarget} className={btnClass}>
          Choose file…
        </button>
      )}
    </div>
  );
}

export function actionsForDecision(
  decision: MarketingDecisionAsset,
  project: ProjectProfile | null,
) {
  const asset = prepareMarketingAssetFromDecision(decision);
  return resolveAssetActions({
    asset,
    project,
    title: decision.title,
    decisionKind: decision.kind,
  });
}
