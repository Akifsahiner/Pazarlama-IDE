import { FolderOpen, Sparkles } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";
import { isQuickStartTrack } from "@shared/quickStartWedge";
import { Button } from "@renderer/components/ui/Button";
import type { ExecutionRecordView } from "@shared/executionRecord";
import { QuickStartSealBanner } from "@renderer/features/onboarding/QuickStartSealBanner";
import { ExecutionRecordCard } from "./ExecutionRecordCard";

export function ExecutionRecordEmpty({ record }: { record: ExecutionRecordView }) {
  const project = useApp((s) => s.project);
  const openProjectPicker = useApp((s) => s.openProjectPicker);
  const openStrategicIntake = useApp((s) => s.openStrategicIntake);
  const openLaunchReadiness = useApp((s) => s.openLaunchReadiness);
  const channelThesis = useApp((s) => s.channelThesis);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const opsCadence = useApp((s) => s.opsCadence);
  const firstShipAt = useApp((s) => s.firstShipAt);
  const onboardingTrack = useApp((s) => s.onboardingTrack);

  const showQuickStartSealBanner =
    isQuickStartTrack(onboardingTrack) &&
    firstShipAt != null &&
    !isStrategicDecisionSealed(marketingProfile);

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <GuidedEmptyState
          icon={FolderOpen}
          title="Open project"
          description="Execution Record runs in project context. Pick a repo to begin."
          steps={["Open project folder", "Scan + reveal", "Start Week 1 execution"]}
          primaryAction={{ label: "Open project", onClick: openProjectPicker, icon: FolderOpen }}
        />
      </div>
    );
  }

  if (channelThesis && !opsCadence && !isStrategicDecisionSealed(marketingProfile)) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        {showQuickStartSealBanner && (
          <QuickStartSealBanner onSeal={() => openStrategicIntake()} />
        )}
        <ExecutionRecordCard record={record} />
        <div className="mx-auto max-w-md text-center">
          <p className="text-body-sm text-text-2">
            Seal your strategic decision, then complete launch setup. Daily execution lives here once
            Week 1 starts.
          </p>
          <Button variant="primary" className="mt-4" onClick={openStrategicIntake}>
            <Sparkles size={14} className="mr-1" />
            Seal strategic decision
          </Button>
        </div>
      </div>
    );
  }

  if (channelThesis && !opsCadence) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <ExecutionRecordCard record={record} />
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
          <p className="text-body-sm text-text-2">
            Contract sealed — finish launch setup to queue mechanism-specific Week 1 tasks.
          </p>
          <Button variant="primary" onClick={() => openLaunchReadiness()}>
            Complete launch setup
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
