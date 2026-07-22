import { ChevronDown, ChevronUp, Handshake } from "lucide-react";
import { useState } from "react";
import { Badge } from "@renderer/components/ui/Badge";
import {
  buildContractView,
  formatThirtyDayTarget,
  isContractDefaultExpanded,
} from "@shared/contractView";
import type { MarketingProfile } from "@shared/types";

export function OurContractStrip({
  profile,
}: {
  profile?: MarketingProfile | null;
}) {
  const contract = buildContractView(profile);
  const [open, setOpen] = useState(() =>
    contract ? isContractDefaultExpanded(contract.sealedAt) : false,
  );

  if (!contract) return null;

  const kpi = formatThirtyDayTarget(contract.thirtyDayTarget);
  const sealedDate = new Date(contract.sealedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-accent/25 bg-accent-soft/10"
      data-testid="our-contract-strip"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Handshake size={14} className="shrink-0 text-accent" />
          <span className="text-body-sm font-semibold text-text">Our contract</span>
          <Badge tone="neutral">Option {contract.optionId}</Badge>
          <Badge tone="accent">{contract.postureLabel}</Badge>
          <span className="hidden text-micro text-text-3 sm:inline">Sealed {sealedDate}</span>
        </div>
        {open ? (
          <ChevronUp size={14} className="shrink-0 text-text-3" />
        ) : (
          <ChevronDown size={14} className="shrink-0 text-text-3" />
        )}
      </button>
      {open && (
        <div className="border-t border-line/60 px-4 pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                CMO commits
              </p>
              <ul className="mt-2 space-y-1 text-mini text-text-2">
                {contract.cmoCommits.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ok">
                Founder commits
              </p>
              <ul className="mt-2 space-y-1 text-mini text-text-2">
                {contract.founderCommits.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-mini text-text-3">
            {contract.mechanismLabel && <Badge tone="neutral">{contract.mechanismLabel}</Badge>}
            <Badge
              tone={
                contract.thirtyDayTarget.confidence === "measured"
                  ? "ok"
                  : contract.thirtyDayTarget.confidence === "stretch"
                    ? "warn"
                    : "neutral"
              }
            >
              {contract.thirtyDayTarget.confidence}
            </Badge>
            <span>{kpi.headline}</span>
          </div>
        </div>
      )}
    </div>
  );
}
