import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { MarketingPlanSuite } from "@shared/planPlaybooks";

export function StrategicCallouts({ plan }: { plan: MarketingPlanSuite }) {
  const [open, setOpen] = useState(false);
  const anti = plan.antiPatterns ?? [];

  if (!plan.strategyNote && anti.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-lg)] border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-mini font-semibold uppercase tracking-wider text-text-3">
          Strategic notes
        </span>
        <ChevronDown size={14} className={`text-text-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-line px-5 pb-5 pt-3">
          {plan.strategyNote && (
            <p className="font-serif text-[14px] leading-relaxed text-text">{plan.strategyNote}</p>
          )}
          {anti.length > 0 && (
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-warn">
                Anti-patterns
              </div>
              <ul className="space-y-1 text-mini text-text-2">
                {anti.map((a) => (
                  <li key={a}>· {a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
