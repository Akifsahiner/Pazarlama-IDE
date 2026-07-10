import type {
  MarketingAsset,
  MarketingDecisionAsset,
  ProjectProfile,
} from "./types";
import {
  hasLocalFolder,
  inferIntegrateRoute,
  isCodePath,
  isSafeDirectWrite,
  resolveSidecarTarget,
} from "./assetTarget";

export type AssetActionKind =
  | "preview"
  | "copy"
  | "apply_sidecar"
  | "integrate_run"
  | "pick_target";

export interface AssetActionButton {
  kind: AssetActionKind;
  label: string;
  disabled?: boolean;
  title?: string;
}

export interface ResolvedAssetActions {
  primary: AssetActionButton;
  secondary: AssetActionButton[];
  targetFile?: string;
  integrateRoute?: string;
  displayPath: string;
  canApplyToRepo: boolean;
  applyBlockReason?: string;
  previewSurface: "marketing-diff" | "content-set" | "ad-preview";
  marketingType: MarketingAsset["type"];
}

export function decisionKindToMarketingType(
  kind: MarketingDecisionAsset["kind"],
): MarketingAsset["type"] {
  switch (kind) {
    case "email":
      return "email";
    case "post":
      return "tweet";
    case "ad":
      return "ad";
    default:
      return "landing-copy";
  }
}

export function isChannelAssetKind(kind: MarketingDecisionAsset["kind"]): boolean {
  return kind === "email" || kind === "post" || kind === "ad";
}

export function previewSurfaceForType(type: MarketingAsset["type"]): ResolvedAssetActions["previewSurface"] {
  if (type === "ad" || type === "tweet") return "ad-preview";
  if (type === "email") return "content-set";
  return "marketing-diff";
}

export function displayPathForAsset(
  asset: Pick<MarketingAsset, "targetFile" | "type" | "after">,
  title?: string,
): string {
  if (asset.targetFile) return asset.targetFile.replace(/\\/g, "/");
  if (title) return resolveSidecarTarget(title);
  return "Choose target file";
}

export function resolveAssetActions(opts: {
  asset: MarketingAsset;
  project: ProjectProfile | null;
  title?: string;
  decisionKind?: MarketingDecisionAsset["kind"];
}): ResolvedAssetActions {
  const { asset, project, title, decisionKind } = opts;
  const kind = decisionKind ?? inferKindFromType(asset.type);
  const marketingType = asset.type;
  const previewSurface = previewSurfaceForType(marketingType);
  const folder = hasLocalFolder(project);
  const integrateRoute = folder ? inferIntegrateRoute(project?.routes ?? []) : undefined;

  const sidecarTarget =
    asset.targetFile && isSafeDirectWrite(asset.targetFile)
      ? asset.targetFile.replace(/\\/g, "/")
      : resolveSidecarTarget(title ?? asset.type, asset.targetFile);

  const displayPath = displayPathForAsset(
    { ...asset, targetFile: sidecarTarget },
    title,
  );

  const copyAction: AssetActionButton = {
    kind: "copy",
    label: "Copy",
  };

  if (!folder) {
    return {
      primary: { kind: "preview", label: "Review copy" },
      secondary: [copyAction],
      displayPath,
      canApplyToRepo: false,
      applyBlockReason: "Open a local folder project to save files to the repo.",
      previewSurface,
      marketingType,
      targetFile: sidecarTarget,
    };
  }

  if (isChannelAssetKind(kind)) {
    const channelSidecar = resolveSidecarTarget(title ?? kind);
    return {
      primary: copyAction,
      secondary: [
        { kind: "preview", label: "Review" },
        {
          kind: "apply_sidecar",
          label: "Save to project",
          title: `Save as ${channelSidecar}`,
        },
      ],
      displayPath: channelSidecar,
      targetFile: channelSidecar,
      canApplyToRepo: true,
      previewSurface,
      marketingType,
    };
  }

  const explicitTarget = asset.targetFile?.replace(/\\/g, "/");
  const codeTarget = explicitTarget && isCodePath(explicitTarget);
  const canSidecarApply = isSafeDirectWrite(sidecarTarget);

  const reviewAction: AssetActionButton = { kind: "preview", label: "Review copy" };
  const sidecarAction: AssetActionButton = {
    kind: "apply_sidecar",
    label: "Save to marketing/",
    disabled: !canSidecarApply,
    title: canSidecarApply
      ? `Write ${sidecarTarget} as a sidecar draft`
      : "Choose a safe target path under marketing/",
  };

  if (integrateRoute) {
    return {
      primary: {
        kind: "integrate_run",
        label: "Apply to site",
        title: `Edit ${integrateRoute} with the agent`,
      },
      secondary: [sidecarAction, reviewAction, copyAction],
      displayPath: codeTarget ? (explicitTarget ?? displayPath) : sidecarTarget,
      targetFile: sidecarTarget,
      integrateRoute,
      canApplyToRepo: canSidecarApply,
      applyBlockReason: codeTarget
        ? "Site code can't be overwritten with plain copy — use Apply to site or save a sidecar file."
        : canSidecarApply
          ? undefined
          : "Pick a markdown sidecar path under marketing/ to save.",
      previewSurface,
      marketingType,
    };
  }

  return {
    primary: reviewAction,
    secondary: [sidecarAction, copyAction],
    targetFile: sidecarTarget,
    displayPath: sidecarTarget,
    canApplyToRepo: canSidecarApply,
    applyBlockReason: canSidecarApply
      ? undefined
      : "No landing page route found — scan the project or save a sidecar file.",
    previewSurface,
    marketingType,
  };
}

function inferKindFromType(type: MarketingAsset["type"]): MarketingDecisionAsset["kind"] {
  switch (type) {
    case "email":
      return "email";
    case "tweet":
      return "post";
    case "ad":
      return "ad";
    default:
      return "copy";
  }
}

export function prepareMarketingAssetFromDecision(
  decision: MarketingDecisionAsset,
  opts?: { id?: string; targetFile?: string; before?: string },
): MarketingAsset {
  const hinted =
    decision.suggested_target_file && isSafeDirectWrite(decision.suggested_target_file)
      ? decision.suggested_target_file.replace(/\\/g, "/")
      : undefined;
  return {
    id: opts?.id ?? `decision_${Date.now()}`,
    type: decisionKindToMarketingType(decision.kind),
    targetFile: opts?.targetFile ?? hinted ?? resolveSidecarTarget(decision.title),
    before: opts?.before,
    after: decision.content,
  };
}

export function decisionAssetDedupeKey(decision: MarketingDecisionAsset): string {
  return `${decision.kind}:${decision.title}:${decision.content.slice(0, 120)}`;
}

export function integrateRunGoal(copy: string, route: string): string {
  return [
    `Integrate the following marketing copy into ${route}.`,
    "Preserve existing layout, components, imports, and styling — update copy and CTAs only.",
    "Do not rewrite unrelated files.",
    "",
    "--- Copy to integrate ---",
    copy,
  ].join("\n");
}
