import { useMemo } from "react";
import { useApp } from "@renderer/state/store";
import { resolveStageSegments, currentStageLabel } from "./stageContext";

/** Single source for stage breadcrumb + conversation context chips. */
export function useStageContext() {
  const project = useApp((s) => s.project);
  const canvas = useApp((s) => s.canvas);
  const plan = useApp((s) => s.plan);
  const planProgress = useApp((s) => s.planProgress);
  const thread = useApp((s) => s.thread);
  const run = useApp((s) => s.run);
  const activePlanTaskId = useApp((s) => s.activePlanTaskId);
  const highlightPlanTaskId = useApp((s) => s.highlightPlanTaskId);
  const activePlaybookId = useApp((s) => s.activePlaybookId);
  const browserRunning = useApp((s) => s.browser.running);

  const threadAssets = useMemo(
    () => thread.filter((e) => e.kind === "asset" && e.asset).map((e) => e.asset!),
    [thread],
  );

  const segments = useMemo(
    () =>
      resolveStageSegments({
        project,
        canvasMode: canvas.mode,
        activeAssetId: canvas.activeAssetId,
        experimentId: canvas.experimentId,
        highlightPlanTaskId,
        activePlanTaskId,
        activePlaybookId,
        plan,
        planProgress,
        threadAssets,
        runGoal: run?.goal,
        browserRunning,
      }),
    [
      project,
      canvas.mode,
      canvas.activeAssetId,
      canvas.experimentId,
      highlightPlanTaskId,
      activePlanTaskId,
      activePlaybookId,
      plan,
      planProgress,
      threadAssets,
      run?.goal,
      browserRunning,
    ],
  );

  const stageLabel = useMemo(() => currentStageLabel(segments), [segments]);

  return { segments, stageLabel };
}
