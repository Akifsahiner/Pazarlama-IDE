import { FolderOpen, Sparkles } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";
import { Button } from "@renderer/components/ui/Button";
import type { ExecutionRecordView } from "@shared/executionRecord";
import { ExecutionRecordCard } from "./ExecutionRecordCard";

export function ExecutionRecordEmpty({ record }: { record: ExecutionRecordView }) {
  const project = useApp((s) => s.project);
  const openProjectPicker = useApp((s) => s.openProjectPicker);
  const openStrategicIntake = useApp((s) => s.openStrategicIntake);
  const channelThesis = useApp((s) => s.channelThesis);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const beginCmoWeek1 = useApp((s) => s.beginCmoWeek1);
  const opsCadence = useApp((s) => s.opsCadence);

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <GuidedEmptyState
          icon={FolderOpen}
          title="Proje aç"
          description="Execution Record proje bağlamında çalışır. Bir repo seçerek başla."
          steps={["Proje klasörünü aç", "Scan + reveal", "Week 1 execution başlat"]}
          primaryAction={{ label: "Proje aç", onClick: openProjectPicker, icon: FolderOpen }}
        />
      </div>
    );
  }

  if (channelThesis && !opsCadence && !isStrategicDecisionSealed(marketingProfile)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <ExecutionRecordCard record={record} />
        <div className="max-w-md text-center">
          <p className="text-body-sm text-text-2">
            Kararı mühürle → Week 1 başlat. Execution Record aktif olunca günlük hareket burada
            yaşar.
          </p>
          <Button variant="primary" className="mt-4" onClick={openStrategicIntake}>
            <Sparkles size={14} className="mr-1" />
            Stratejik kararı mühürle
          </Button>
        </div>
      </div>
    );
  }

  if (channelThesis && !opsCadence) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <ExecutionRecordCard record={record} />
        <Button variant="primary" onClick={() => void beginCmoWeek1()}>
          Week 1 başlat
        </Button>
      </div>
    );
  }

  return null;
}
