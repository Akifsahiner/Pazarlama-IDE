import { CheckCircle2, Clock, Coins, FileCode2, GitCommit } from "lucide-react";
import type { TurnReceipt } from "@shared/turnReceipt";
import { actionButtonLabel, executableActionToIntent } from "@shared/executableAction";
import { useApp } from "@renderer/state/store";

export function TurnReceiptCard({
  receipt,
  variant = "default",
}: {
  receipt: TurnReceipt;
  variant?: "default" | "shipped";
}) {
  const executeIntent = useApp((s) => s.executeIntent);
  const d = receipt.deliverables;
  const tone =
    variant === "shipped" || receipt.shipped
      ? "border-ok/40 bg-ok/10"
      : "border-accent/30 bg-accent-soft/15";

  return (
    <div
      className={`max-w-[96%] rounded-[var(--radius-md)] border px-3 py-2.5 ${tone}`}
      data-testid="turn-receipt"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-2">
        {receipt.shipped || variant === "shipped" ? (
          <>
            <CheckCircle2 size={11} className="text-ok" />
            Shipped
          </>
        ) : (
          <>
            <FileCode2 size={11} className="text-accent" />
            Grounded in your repo
          </>
        )}
      </div>
      <p className="text-body-sm font-medium text-text">{receipt.summaryLine}</p>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-text-3">
        {d.filesProposed?.map((f) => (
          <span key={f} className="rounded-full border border-line px-2 py-0.5 font-mono">
            {f}
          </span>
        ))}
        {d.filesApplied?.map((f) => (
          <span key={f} className="rounded-full border border-ok/40 bg-ok/10 px-2 py-0.5 font-mono text-ok">
            ✓ {f}
          </span>
        ))}
        {d.commitSha && (
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 font-mono">
            <GitCommit size={9} />
            {d.commitSha.slice(0, 7)}
          </span>
        )}
        {d.durationMs != null && d.durationMs > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock size={9} />
            {Math.round(d.durationMs / 1000)}s
          </span>
        )}
        {d.costCents != null && d.costCents > 0 && (
          <span className="inline-flex items-center gap-1">
            <Coins size={9} />~${(d.costCents / 100).toFixed(2)}
          </span>
        )}
      </div>

      {receipt.primaryAction && !receipt.shipped && (
        <button
          type="button"
          className="mt-2.5 rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-mini font-medium text-on-accent hover:opacity-90"
          onClick={() => {
            const intent = executableActionToIntent(receipt.primaryAction!);
            if (intent) void executeIntent(intent);
          }}
        >
          {actionButtonLabel(receipt.primaryAction)}
        </button>
      )}
    </div>
  );
}
