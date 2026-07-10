import type { NormRect } from "@shared/types";
import { PERMISSION_SCOPE_LABELS } from "@shared/types";
import { ApprovalGate } from "@renderer/components/ApprovalGate";

interface ApprovalModalV2Props {
  approvalId: string;
  summary: string;
  frame?: string;
  bbox?: NormRect;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

/** Browser operator approval — uses the shared ApprovalGate grammar. */
export function ApprovalModalV2({
  approvalId,
  summary,
  frame,
  bbox,
  onApprove,
  onReject,
}: ApprovalModalV2Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/70 p-6 backdrop-blur-[3px]">
      <ApprovalGate
        badge={PERMISSION_SCOPE_LABELS.submit_public_forms}
        summary={summary}
        frame={frame}
        bbox={bbox}
        onApprove={() => onApprove(approvalId)}
        onReject={() => onReject(approvalId)}
      />
    </div>
  );
}
