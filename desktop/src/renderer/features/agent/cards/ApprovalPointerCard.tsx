import { ShieldAlert } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { SessionEvent } from "@renderer/state/session";
import { ThreadCard } from "./ThreadCard";

/** Chat pointer only — approval UI lives on the stage. */
export function ApprovalPointerCard({ event }: { event: SessionEvent }) {
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const browserPending = useApp((s) => s.browser.pendingApprovalId);
  const runPending = useApp((s) => s.run?.pendingApproval?.approvalId);

  const stillPending = event.approvalId === browserPending || event.approvalId === runPending;
  if (!stillPending) return null;

  const target = event.approvalId === browserPending ? "browser" : "run";

  return (
    <button type="button" onClick={() => setActiveCanvas(target)} className="max-w-[96%] text-left">
      <ThreadCard tone="warn" header={{ icon: ShieldAlert, label: "Approval needed" }}>
        <p className="text-mini text-warn">
          Review in the stage — <span className="underline">open {target} canvas</span>
        </p>
      </ThreadCard>
    </button>
  );
}
