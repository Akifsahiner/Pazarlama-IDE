import type { MarketingAsset } from "@shared/types";
import { resolveSidecarTarget } from "@shared/assetTarget";

/** Display path for diff header — never invent fake filenames. */
export function assetFileName(asset: MarketingAsset, title?: string): string {
  if (asset.targetFile) return asset.targetFile.replace(/\\/g, "/");
  if (title) return resolveSidecarTarget(title);
  return "Choose target file";
}

function toLines(value: string): string[] {
  return value.replace(/\r\n/g, "\n").split("\n");
}

export function assetDiff(asset: MarketingAsset): { removed: string[]; added: string[] } {
  return {
    removed: asset.before ? toLines(asset.before) : [],
    added: toLines(asset.after),
  };
}
