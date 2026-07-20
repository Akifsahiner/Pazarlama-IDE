import { useState } from "react";
import { useApp } from "@renderer/state/store";
import { BottleneckSentence } from "./BottleneckSentence";
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
  const [detailExpanded, setDetailExpanded] = useState(true);
  const historyExpanded = useApp((s) => s.executionHistoryExpanded);
  const toggleHistory = useApp((s) => s.toggleExecutionHistoryExpanded);

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
      <div className="shrink-0 border-b border-line/60 bg-surface/30">
        <BottleneckSentence sentence={record.bottleneckSentence} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-5">
        {preWeek1 ? (
          <ExecutionRecordEmpty record={record} />
        ) : (
          <>
            <ExecutionRecordCard record={record} />
            <ExecutionDetailPanel
              defaultHint={record.detailHint}
              expanded={detailExpanded}
              onToggleExpanded={() => setDetailExpanded((v) => !v)}
            />
            <LiveActivityStrip />
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
