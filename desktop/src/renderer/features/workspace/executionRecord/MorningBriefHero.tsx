import { useId } from "react";
import { LayoutList, Play } from "lucide-react";
import type { MorningBriefView } from "@shared/morningBrief";
import type { CommandSurfaceAction } from "@shared/cmoCommandSurface";
import { Button } from "@renderer/components/ui/Button";
import { CommandSurfaceField } from "@renderer/features/workspace/CommandSurfaceField";
import { CommandSurfaceGovernanceBanner } from "@renderer/features/workspace/CommandSurfaceGovernanceBanner";
import { useApp } from "@renderer/state/store";

export function MorningBriefHero({
  brief,
  primaryAction,
  onPrimaryAction,
  compact = false,
}: {
  brief: MorningBriefView;
  primaryAction: Exclude<CommandSurfaceAction, { kind: "none" }> | null;
  onPrimaryAction: (action: CommandSurfaceAction) => void;
  compact?: boolean;
}) {
  const id = useId();
  const toggleWarRoomExpanded = useApp((s) => s.toggleWarRoomExpanded);
  const warRoomExpanded = useApp((s) => s.warRoomExpanded);
  const focusWarRoomAnchor = useApp((s) => s.focusWarRoomAnchor);

  if (compact) {
    return (
      <div data-testid="morning-brief-hero" data-compact="true">
        <p className="truncate text-micro text-text-3">{brief.headerLine}</p>
        <p className="mt-0.5 truncate text-body-sm font-semibold text-text">{brief.today}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="morning-brief-hero">
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

      {brief.nextUp && (
        <p className="text-mini text-text-2">
          <span className="font-semibold uppercase tracking-wide text-text-3">Next · </span>
          {brief.nextUp.label}
        </p>
      )}

      {primaryAction && (
        <Button
          variant="primary"
          size="md"
          className="w-full justify-center px-6 py-2.5 text-body-sm sm:w-auto sm:min-w-[220px]"
          data-testid={primaryAction.testId}
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
