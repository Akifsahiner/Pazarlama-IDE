import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MarketingCritique } from "@shared/types";
import { DecisionQualityBadge } from "@renderer/components/DecisionQualityBadge";

const DIMENSIONS: { key: keyof MarketingCritique; label: string; invert?: boolean }[] = [
  { key: "product_specificity", label: "Product fit" },
  { key: "actionability", label: "Actionability" },
  { key: "strategic_depth", label: "Strategy" },
  { key: "realism", label: "Realism" },
  { key: "brand_voice_match", label: "Brand voice" },
  { key: "generality_penalty", label: "Specificity", invert: true },
];

function barTone(score: number, invert?: boolean): string {
  const v = invert ? 10 - score : score;
  if (v >= 8) return "bg-ok";
  if (v >= 6) return "bg-accent";
  return "bg-warn";
}

export function CritiquePanel({ critique }: { critique: MarketingCritique }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-micro font-medium uppercase tracking-wide text-text-2">
          <DecisionQualityBadge critique={critique} />
        </span>
        <ChevronDown size={14} className={`text-text-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3">
          {DIMENSIONS.map(({ key, label, invert }) => {
            const raw = critique[key];
            if (typeof raw !== "number") return null;
            const display = invert ? 10 - raw : raw;
            const pct = Math.max(0, Math.min(100, (display / 10) * 100));
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-[10.5px] text-text-3">{label}</span>
                <div className="h-1.5 flex-1 rounded-full bg-elevated">
                  <div
                    className={`h-full rounded-full ${barTone(raw, invert)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[10px] tabular-nums text-text-3">{display}</span>
              </div>
            );
          })}
          {critique.revisions.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-3">
                Revisions applied
              </div>
              <ul className="space-y-0.5 text-micro text-text-2">
                {critique.revisions.map((r, i) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
