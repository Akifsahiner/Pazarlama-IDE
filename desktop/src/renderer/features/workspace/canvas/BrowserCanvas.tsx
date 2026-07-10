import { Operator } from "@renderer/features/workspace/operator/Operator";

/**
 * Dedicated browser canvas. Delegates entirely to the shared <Operator> live
 * theater (browser chrome, stage, cursor, findings, approvals, controls).
 */
export function BrowserCanvas() {
  return (
    <div className="h-full p-4">
      <div className="h-full overflow-hidden rounded-[var(--radius-lg)] border border-line">
        <Operator />
      </div>
    </div>
  );
}
