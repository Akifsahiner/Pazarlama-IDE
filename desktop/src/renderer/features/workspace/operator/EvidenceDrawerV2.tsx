import { useEffect, useState } from "react";
import { ChevronRight, Lightbulb } from "lucide-react";
import type { Finding, FindingSeverity } from "@shared/types";

const SEVERITY_TONE: Record<FindingSeverity, string> = {
  info: "bg-text-3",
  low: "bg-accent",
  medium: "bg-warn",
  high: "bg-warn",
  critical: "bg-danger",
};

interface EvidenceDrawerV2Props {
  findings: Finding[];
}

/**
 * Structured findings drawer: severity, evidence, suggestion.
 * Auto-opens on the first finding so discoveries are visible during live CU.
 */
export function EvidenceDrawerV2({ findings }: EvidenceDrawerV2Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (findings.length > 0) setOpen(true);
  }, [findings.length]);

  if (findings.length === 0) {
    return (
      <div className="absolute right-0 top-0 z-20 flex h-full w-9 flex-col border-l border-line bg-surface/95 backdrop-blur-sm">
        <button
          type="button"
          disabled
          title="No findings yet — run browser research to collect evidence"
          className="flex flex-col items-center gap-1 border-b border-line px-1 py-2 text-micro text-text-3"
        >
          <Lightbulb size={13} className="text-text-3" />
          <span className="text-[10px]">0</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`absolute right-0 top-0 z-20 flex h-full flex-col border-l border-line bg-surface/95 backdrop-blur-sm transition-[width] ${
        open ? "w-80" : "w-9"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={open ? "Collapse findings" : `Show ${findings.length} finding${findings.length === 1 ? "" : "s"}`}
        className="flex items-center gap-2 border-b border-line px-3 py-2 text-mini text-text-2 hover:text-text"
      >
        <ChevronRight size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        {open ? (
          <>
            <Lightbulb size={13} className="text-warn" /> <span>Findings ({findings.length})</span>
          </>
        ) : (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-warn-soft px-1 text-[9px] font-semibold text-warn">
            {findings.length}
          </span>
        )}
      </button>
      {open && (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {[...findings].reverse().map((f) => (
            <div key={f.id} className="overflow-hidden rounded-[var(--radius-sm)] border border-line bg-bg">
              <div className="flex items-start gap-2 p-2.5">
                <span className={`mt-1 h-3 w-1 shrink-0 rounded-full ${SEVERITY_TONE[f.severity]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-mini font-medium text-text">{f.title}</span>
                    <span className="text-[10px] uppercase tracking-wide text-text-3">{f.severity}</span>
                  </div>
                  <p className="mt-0.5 text-mini text-text-2">{f.evidence}</p>
                  {f.suggestion && (
                    <p className="mt-1 text-mini text-accent">→ {f.suggestion}</p>
                  )}
                  {f.url && <p className="mt-1 truncate font-mono text-[10.5px] text-text-3">{f.url}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
