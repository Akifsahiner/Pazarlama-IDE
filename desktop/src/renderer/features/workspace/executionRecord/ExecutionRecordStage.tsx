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

  const runActive =
    run?.status === "running" || run?.status === "planning" || run?.status === "created";

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
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-bg"
      data-testid="execution-record-stage"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 md:px-6">
        {preWeek1 ? (
          <ExecutionRecordEmpty record={record} />
        ) : (
          <>
            {/* 1. Accountability hero — what & why & CTA */}
            <ExecutionRecordCard record={record} />

            {/* 2. Artifact workspace — Claude-style center when executing */}
            <ExecutionDetailPanel record={record} defaultHint={record.detailHint} />

            {runActive && <LiveActivityStrip />}

            {/* 3. History — collapsed by default, same language */}
            <ExecutionHistoryTimeline
              entries={history}
              expanded={historyExpanded}
              onToggle={toggleHistory}
            />
          </>
        )}
      </div>
    </main>
  );
}
