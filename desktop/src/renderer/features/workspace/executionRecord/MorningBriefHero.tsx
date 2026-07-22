import { useId } from "react";
import { LayoutList, Play, Radio } from "lucide-react";
import type { MorningBriefView } from "@shared/morningBrief";
import type { CommandSurfaceAction } from "@shared/cmoCommandSurface";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { CommandSurfaceField } from "@renderer/features/workspace/CommandSurfaceField";
import { CommandSurfaceGovernanceBanner } from "@renderer/features/workspace/CommandSurfaceGovernanceBanner";
import { useApp } from "@renderer/state/store";
import { evaluateHookPerformance } from "@shared/cmoDistributionOperator";

export function MorningBriefHero({
  brief,
  primaryAction,
  onPrimaryAction,
  dispatchAllowed = true,
  compact = false,
  verifying = false,
}: {
  brief: MorningBriefView;
  primaryAction: Exclude<CommandSurfaceAction, { kind: "none" }> | null;
  onPrimaryAction: (action: CommandSurfaceAction) => void;
  /** False when governance blocks ops dispatch — button stays visible but disabled. */
  dispatchAllowed?: boolean;
  compact?: boolean;
  verifying?: boolean;
}) {
  const id = useId();
  const toggleWarRoomExpanded = useApp((s) => s.toggleWarRoomExpanded);
  const warRoomExpanded = useApp((s) => s.warRoomExpanded);
  const distributionOperator = useApp(
    (s) => s.distributionOperator ?? s.marketingProfile?.distribution_operator,
  );
  const distVerdict = distributionOperator
    ? evaluateHookPerformance(distributionOperator)
    : undefined;
  const focusWarRoomAnchor = useApp((s) => s.focusWarRoomAnchor);

  const productLoop = brief.governance?.kind === "product_loop";
  const pauseHeadline =
    productLoop && brief.governance
      ? `Marketing paused — ${brief.bottleneck}`
      : null;

  if (compact) {
    return (
      <div data-testid="morning-brief-hero" data-compact="true">
        <p className="truncate text-micro text-text-3">
          {verifying ? "Verifying live page…" : brief.headerLine}
        </p>
        <p className="mt-0.5 truncate text-body-sm font-semibold text-text">{brief.today}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="morning-brief-hero">
      {verifying && (
        <div
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-accent/30 bg-accent/8 px-3 py-1.5 text-mini font-medium text-accent"
          data-testid="morning-brief-verifying"
        >
          <Radio size={11} className="animate-pulse" />
          Verifying live page…
        </div>
      )}
      {pauseHeadline && (
        <div
          className="rounded-[var(--radius-md)] border border-warn/40 bg-warn/8 px-3 py-2 text-body-sm font-medium text-warn"
          data-testid="product-loop-pause-banner"
        >
          {pauseHeadline}
        </div>
      )}
      <p className="text-mini font-medium text-text-2">{brief.headerLine}</p>

      <div className="grid gap-2 sm:grid-cols-2" data-testid="morning-brief-grid">
        <CommandSurfaceField
          label="Bottleneck"
          value={brief.bottleneck}
          labelId={`${id}-bottleneck`}
          emphasis
        />
        <CommandSurfaceField label="Today" value={brief.today} labelId={`${id}-today`} emphasis />
        <CommandSurfaceField label="Why" value={brief.why} labelId={`${id}-why`} />
        <CommandSurfaceField label="Done when" value={brief.doneWhen} labelId={`${id}-done`} />
      </div>

      {brief.governance && (
        <CommandSurfaceGovernanceBanner governance={brief.governance} />
      )}

      {brief.nextUp && !productLoop && (
        <p className="text-mini text-text-2">
          <span className="font-semibold uppercase tracking-wide text-text-3">Next · </span>
          {brief.nextUp.label}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5" data-testid="morning-brief-footer">
        <Badge tone="neutral">{brief.footer.pendingOps} ops</Badge>
        {brief.footer.pendingLaneB > 0 && (
          <Badge tone="neutral">{brief.footer.pendingLaneB} prepared</Badge>
        )}
        {brief.footer.pendingLaneD > 0 && (
          <Badge tone="warn">{brief.footer.pendingLaneD} product P0</Badge>
        )}
        {brief.footer.operatorSummary && !productLoop && (
          <Badge tone="accent">{brief.footer.operatorSummary}</Badge>
        )}
        {distVerdict && !productLoop && (
          <Badge
            tone={distVerdict.kind === "kill" ? "warn" : distVerdict.kind === "scale" ? "ok" : "neutral"}
            data-testid="morning-brief-verdict-chip"
          >
            {distVerdict.kind.replace("_", " ")}
          </Badge>
        )}
        {brief.mechanismLabel && !productLoop && (
          <span title={brief.footer.mechanismAntiPattern}>
            <Badge tone="accent">{brief.mechanismLabel}</Badge>
          </span>
        )}
      </div>

      {primaryAction && (
        <Button
          variant="primary"
          size="md"
          className="w-full justify-center px-6 py-2.5 text-body-sm sm:w-auto sm:min-w-[220px]"
          data-testid={primaryAction.testId}
          disabled={!dispatchAllowed}
          aria-disabled={!dispatchAllowed}
          onClick={() => onPrimaryAction(primaryAction)}
        >
          <Play size={16} className="mr-2" />
          {primaryAction.label}
        </Button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="subtle" size="sm" onClick={() => toggleWarRoomExpanded()}>
          <LayoutList size={14} className="mr-1" />
          {warRoomExpanded ? "Close war room" : "War room — full week plan"}
        </Button>
        {brief.queuedHint && (
          <button
            type="button"
            className="text-mini text-accent hover:underline"
            onClick={() => focusWarRoomAnchor("cmo-ops-board")}
          >
            {brief.queuedHint.message}
          </button>
        )}
      </div>
    </div>
  );
}
