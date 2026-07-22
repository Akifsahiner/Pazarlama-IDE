import { useEffect } from "react";
import { useApp } from "@renderer/state/store";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";
import { isQuickStartTrack } from "@shared/quickStartWedge";
import { ShipWinCard } from "@renderer/features/workspace/ShipWinCard";
import { ShipRecoveryCard } from "@renderer/features/agent/ShipRecoveryCard";
import { QuickStartSealBanner } from "@renderer/features/onboarding/QuickStartSealBanner";
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
  const marketingProfile = useApp((s) => s.marketingProfile);
  const run = useApp((s) => s.run);
  const historyExpanded = useApp((s) => s.executionHistoryExpanded);
  const toggleHistory = useApp((s) => s.toggleExecutionHistoryExpanded);
  const heroExpanded = useApp((s) => s.executionHeroExpanded);
  const firstShipLedger = useApp((s) => s.firstShipLedger);
  const firstShipAt = useApp((s) => s.firstShipAt);
  const shipRecovery = useApp((s) => s.shipRecovery);
  const openStrategicIntake = useApp((s) => s.openStrategicIntake);
  const onboardingTrack = useApp((s) => s.onboardingTrack);
  const checkMorningDayUnlock = useApp((s) => s.checkMorningDayUnlock);
  const week1FocusMode = useApp((s) => s.week1FocusMode);

  useEffect(() => {
    if (!opsCadence) return;
    checkMorningDayUnlock();
    if (week1FocusMode && opsCadence.day_index === 1) {
      useApp.setState({ week1FocusMode: false });
    }
  }, [checkMorningDayUnlock, opsCadence?.id, opsCadence?.day_index, week1FocusMode]);

  const runActive =
    run?.status === "running" || run?.status === "planning" || run?.status === "created";
  const heroCompact = runActive && !heroExpanded;
  const showQuickStartSealBanner =
    isQuickStartTrack(onboardingTrack) &&
    firstShipAt != null &&
    !isStrategicDecisionSealed(marketingProfile);

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
          <>
            {showQuickStartSealBanner && (
              <QuickStartSealBanner onSeal={() => openStrategicIntake()} />
            )}
            <ExecutionRecordEmpty record={record} />
            {shipRecovery && !runActive && <ShipRecoveryCard recovery={shipRecovery} />}
            {firstShipAt && firstShipLedger && !runActive && (
              <ShipWinCard
                ledger={firstShipLedger}
                compact
                onContinueCmo={
                  channelThesis && !isStrategicDecisionSealed(marketingProfile)
                    ? openStrategicIntake
                    : undefined
                }
              />
            )}
          </>
        ) : (
          <>
            <ExecutionRecordCard record={record} compact={heroCompact} />

            {shipRecovery && !runActive && <ShipRecoveryCard recovery={shipRecovery} />}

            {firstShipAt && firstShipLedger && !runActive && (
              <ShipWinCard
                ledger={firstShipLedger}
                compact
                onContinueCmo={
                  channelThesis && !isStrategicDecisionSealed(marketingProfile)
                    ? openStrategicIntake
                    : undefined
                }
              />
            )}

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
