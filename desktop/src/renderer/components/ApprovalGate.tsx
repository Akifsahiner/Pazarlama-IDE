import { Check, ShieldAlert, X } from "lucide-react";
import type { NormRect } from "@shared/types";

export interface ApprovalGateProps {
  title?: string;
  badge?: string;
  summary: string;
  frame?: string;
  bbox?: NormRect;
  onApprove: () => void;
  onReject: () => void;
  className?: string;
}

/**
 * Single approval grammar shared by run stage overlay and browser operator modal.
 * One decision surface, one visual language.
 */
export function ApprovalGate({
  title = "Approval needed",
  badge,
  summary,
  frame,
  bbox,
  onApprove,
  onReject,
  className,
}: ApprovalGateProps) {
  return (
    <div
      className={`w-full max-w-lg overflow-hidden rounded-[var(--radius-lg)] border border-warn/40 bg-surface shadow-[var(--shadow-3)] ${className ?? ""}`}
    >
      {frame && (
        <div className="relative max-h-56 overflow-hidden border-b border-line bg-bg">
          <img
            src={`data:image/png;base64,${frame}`}
            alt="Action context"
            className="h-full w-full object-contain opacity-90"
          />
          {bbox && (
            <span
              className="absolute rounded-[4px] border-2 border-warn bg-warn/15"
              style={{
                left: `${bbox.x * 100}%`,
                top: `${bbox.y * 100}%`,
                width: `${bbox.w * 100}%`,
                height: `${bbox.h * 100}%`,
              }}
            />
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-2">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-warn" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm font-medium text-text">{title}</span>
              {badge && (
                <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10.5px] text-warn">
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap break-words text-body-sm leading-relaxed text-text-2">
              {summary}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="btn-accent flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini"
          >
            <Check size={13} /> Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            <X size={13} /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}
