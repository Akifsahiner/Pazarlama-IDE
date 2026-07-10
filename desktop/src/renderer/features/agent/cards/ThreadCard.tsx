import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ThreadCardTone = "neutral" | "success" | "warn" | "danger" | "accent";

const TONE_CLASS: Record<ThreadCardTone, string> = {
  neutral: "border-line bg-surface-2",
  success: "border-ok/30 bg-ok/5",
  warn: "border-warn/30 bg-warn/[0.06]",
  danger: "border-danger/30 bg-danger/5",
  accent: "border-line bg-surface-2",
};

interface ThreadCardHeader {
  icon?: LucideIcon;
  label: string;
  collapse?: {
    expanded: boolean;
    onToggle: () => void;
    subtitle?: string;
  };
}

export function ThreadCard({
  tone = "neutral",
  header,
  footer,
  children,
  className,
}: {
  tone?: ThreadCardTone;
  header?: ThreadCardHeader;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const HeaderIcon = header?.icon;
  const collapse = header?.collapse;

  return (
    <div
      className={`max-w-[98%] overflow-hidden rounded-[var(--radius-lg)] border ${TONE_CLASS[tone]} ${className ?? ""}`}
    >
      {header && (
        collapse ? (
          <button
            type="button"
            onClick={collapse.onToggle}
            className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
          >
            <div className="flex min-w-0 items-center gap-2 text-micro uppercase tracking-wide text-text-2">
              {HeaderIcon ? <HeaderIcon size={12} className="shrink-0 text-accent" /> : null}
              <span className="truncate">{header.label}</span>
              {collapse.subtitle ? (
                <span className="truncate normal-case text-text-3">· {collapse.subtitle}</span>
              ) : null}
            </div>
            <ChevronDown
              size={14}
              className={`shrink-0 text-text-3 transition-transform ${collapse.expanded ? "rotate-180" : ""}`}
            />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 text-micro uppercase tracking-wide text-accent">
            {HeaderIcon ? <HeaderIcon size={12} /> : null}
            {header.label}
          </div>
        )
      )}
      {(!collapse || collapse.expanded) && (
        <div className={header && !collapse ? "px-4 pb-4" : header ? "border-t border-line px-4 py-3" : "p-4"}>
          {children}
          {footer ? <div className="mt-3">{footer}</div> : null}
        </div>
      )}
    </div>
  );
}
