import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import type { MarketingDecisionAsset } from "@shared/types";

/** Shared draft/asset preview block — one visual grammar for chat cards. */
export function DraftAssetPreview({
  asset,
  maxHeight = "max-h-48",
  showCopy = true,
}: {
  asset: MarketingDecisionAsset;
  maxHeight?: string;
  showCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asset.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface-2">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="text-mini font-medium text-text">{asset.title}</div>
        {showCopy && (
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-0.5 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            {copied ? <Check size={11} className="text-ok" /> : <ClipboardCopy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre
        className={`${maxHeight} overflow-y-auto whitespace-pre-wrap p-3 text-body-sm leading-relaxed text-text-2`}
      >
        {asset.content}
      </pre>
    </div>
  );
}
