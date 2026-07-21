import { useApp } from "@renderer/state/store";
import { ExecutionRecordCard } from "./ExecutionRecordCard";
import { ExecutionDetailPanel } from "./ExecutionDetailPanel";
import { ExecutionHistoryTimeline } from "./ExecutionHistoryTimeline";
import { ExecutionRecordEmpty } from "./ExecutionRecordEmpty";
import { LiveActivityStrip } from "./LiveActivityStrip";
import { useActiveExecutionRecord, useExecutionHistory } from "./useExecutionRecord";

export function ExecutionRecordStage() {
  const record = useActiveExecutionRecord();
  const history = useExecutionHistory();
  const project = useApp((s) => s.project);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const channelThesis = useApp((s) => s.channelThesis);
  const run = useApp((s) => s.run);
  const historyExpanded = useApp((s) => s.executionHistoryExpanded);
  const toggleHistory = useApp((s) => s.toggleExecutionHistoryExpanded);
  const heroExpanded = useApp((s) => s.executionHeroExpanded);

  const runActive =
    run?.status === "running" || run?.status === "planning" || run?.status === "created";
  const heroCompact = runActive && !heroExpanded;

  if (!project) {
    return (
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg" data-testid="execution-record-stage">
        <ExecutionRecordEmpty record={record} />
      </main>
    );
  }

  const preWeek1 = Boolean(channelThesis && !opsCadence);

  return (
    <main
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg"
      data-testid="execution-record-stage"
      data-run-active={runActive ? "true" : "false"}
    >
      <div
        className={`mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-4 md:px-6 ${
          heroCompact ? "gap-3 py-3" : "gap-5 py-6"
        }`}
      >
        {preWeek1 ? (
          <ExecutionRecordEmpty record={record} />
        ) : (
          <>
            <ExecutionRecordCard record={record} compact={heroCompact} />

            <ExecutionDetailPanel
              record={record}
              defaultHint={record.detailHint}
              fill={runActive}
            />

            {runActive && <LiveActivityStrip />}

            {!runActive && (
              <ExecutionHistoryTimeline
                entries={history}
                expanded={historyExpanded}
                onToggle={toggleHistory}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
