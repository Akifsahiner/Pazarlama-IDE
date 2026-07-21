import type { ShipReceipt } from "@shared/shipReceipt";
import { Badge } from "@renderer/components/ui/Badge";
import { ShipBeforeAfterGrid } from "../ShipBeforeAfterGrid";

export function ProofDetailView({
  receipt,
  taskLabel,
  doneWhen,
}: {
  receipt?: ShipReceipt | null;
  taskLabel?: string;
  doneWhen?: string;
}) {
  if (!receipt) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center p-6 text-center">
        <p className="max-w-sm text-body-sm text-text-3">
          No proof yet. Apply changes to populate the ship receipt — commit, files, and live verify.
        </p>
      </div>
    );
  }

  const liveUrl = receipt.liveUrl ?? receipt.previewUrl;
  const validations = receipt.browserValidations ?? [];

  return (
    <div className="space-y-4 overflow-y-auto p-4" data-testid="proof-detail-view">
      {(taskLabel || doneWhen) && (
        <div>
          {taskLabel && (
            <>
              <div className="text-mini font-semibold uppercase tracking-wide text-text-3">Task</div>
              <p className="mt-1 text-body-sm font-medium text-text">{taskLabel}</p>
            </>
          )}
          {doneWhen && <p className="mt-1 text-mini text-text-3">{doneWhen}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {receipt.commitSha && (
          <Badge tone="ok" data-testid="proof-commit">
            {receipt.commitSha.slice(0, 7)}
          </Badge>
        )}
        {receipt.filesChanged > 0 && (
          <Badge tone="neutral">{receipt.filesChanged} files</Badge>
        )}
        {receipt.linesAdded + receipt.linesRemoved > 0 && (
          <Badge tone="neutral">
            +{receipt.linesAdded}/−{receipt.linesRemoved}
          </Badge>
        )}
        {receipt.verifyStatus === "passed" && (
          <Badge tone="ok">Verified live</Badge>
        )}
        {receipt.verifyStatus === "failed" && (
          <Badge tone="warn">Verify failed</Badge>
        )}
      </div>

      {(receipt.before || receipt.after) && (
        <ShipBeforeAfterGrid before={receipt.before} after={receipt.after} files={receipt.files} />
      )}

      {liveUrl && (
        <div className="rounded-[var(--radius-md)] border border-line p-3">
          <div className="text-mini font-semibold text-text-3">Live URL</div>
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-body-sm text-accent hover:underline"
          >
            {liveUrl}
          </a>
        </div>
      )}

      {validations.length > 0 && (
        <div className="space-y-2">
          <div className="text-mini font-semibold uppercase tracking-wide text-text-3">
            Browser checks
          </div>
          {validations.map((v) => (
            <div
              key={v.label}
              className={`rounded-[var(--radius-sm)] border px-3 py-2 text-mini ${
                v.passed ? "border-ok/30 bg-ok/8 text-ok" : "border-warn/30 bg-warn/8 text-warn"
              }`}
            >
              {v.passed ? "✓" : "✗"} {v.label}
              {v.detail && <span className="ml-1 text-text-3">— {v.detail}</span>}
            </div>
          ))}
        </div>
      )}

      {receipt.commitSha && (
        <div className="rounded-[var(--radius-md)] border border-line p-3">
          <div className="text-mini font-semibold text-text-3">Commit</div>
          <p className="mt-1 font-mono text-body-sm text-text">{receipt.commitSha}</p>
        </div>
      )}

      {receipt.qualityWarnings?.map((w) => (
        <div
          key={w.id}
          className={`rounded-[var(--radius-md)] border p-3 text-body-sm ${
            w.severity === "block" ? "border-warn/40 bg-warn/8" : "border-line bg-surface-2/50"
          }`}
        >
          <span className="font-medium text-text">{w.label}</span>
          <p className="mt-1 text-mini text-text-2">{w.detail}</p>
        </div>
      ))}
    </div>
  );
}
