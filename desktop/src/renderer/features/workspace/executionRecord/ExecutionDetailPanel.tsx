import { useEffect, useMemo } from "react";
import type { ExecutionRecordDetailTab } from "@shared/executionRecord";
import { normalizeToWorkSurface } from "@shared/workSurfaces";
import { buildDoneWhenChecklist } from "@shared/doneWhenChecklist";
import { getNowTask } from "@shared/cmoOpsCadence";
import { shipReceiptToProofView } from "@shared/shipReceipt";
import { Segmented } from "@renderer/components/ui/Segmented";
import { Button } from "@renderer/components/ui/Button";
import { useApp } from "@renderer/state/store";
import { ShipPipelineBar } from "../ShipPipelineBar";
import { RunCanvas } from "../canvas/RunCanvas";
import { BrowserCanvas } from "../canvas/BrowserCanvas";
import { WorkSurfaceShell } from "../canvas/WorkSurfaceShell";
import { WorkSurfaceBody } from "../canvas/work/WorkSurfaceBody";
import { ProofDetailView } from "./ProofDetailView";
import { DoneWhenChecklistHeader } from "./DoneWhenChecklistHeader";
import { DistributionHookDayGrid } from "./DistributionHookDayGrid";
import { SocialMetricsImportPanel } from "./SocialMetricsImportPanel";
import type { ExecutionRecordView } from "@shared/executionRecord";
import { isDistributionOperatorGate } from "@shared/cmoDistributionOperator";
import { Radio } from "lucide-react";

const TAB_OPTIONS: { value: ExecutionRecordDetailTab; label: string }[] = [
  { value: "diff", label: "Diff" },
  { value: "browser", label: "Browser" },
  { value: "proof", label: "Proof" },
];

export function ExecutionDetailPanel({
  record,
  defaultHint,
  fill = false,
}: {
  record: ExecutionRecordView;
  defaultHint: ExecutionRecordDetailTab;
  fill?: boolean;
}) {
  const tab = useApp((s) => s.executionRecordDetailTab);
  const setTab = useApp((s) => s.setExecutionRecordDetailTab);
  const run = useApp((s) => s.run);
  const replayExecutionTask = useApp((s) => s.replayExecutionTask);
  const executionKernel = useApp((s) => s.executionKernel ?? s.marketingProfile?.execution_kernel);
  const retryExecutionTask = useApp((s) => s.retryExecutionTask);
  const pauseExecutionTask = useApp((s) => s.pauseExecutionTask);
  const resumeExecutionTask = useApp((s) => s.resumeExecutionTask);
  const cancelExecutionTask = useApp((s) => s.cancelExecutionTask);
  const appendEvent = useApp((s) => s.appendEvent);
  const canvasMode = useApp((s) => s.canvas.mode);
  const surface = normalizeToWorkSurface(canvasMode);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const channelThesis = useApp((s) => s.channelThesis ?? s.marketingProfile?.channel_thesis);
  const lastShipReceipt = useApp((s) => s.lastShipReceipt);
  const shipPipeline = useApp((s) => s.shipPipeline);
  const distributionOperator = useApp(
    (s) => s.distributionOperator ?? s.marketingProfile?.distribution_operator,
  );
  const growthControlPlane = useApp(
    (s) => s.growthControlPlane ?? s.marketingProfile?.growth_control_plane,
  );

  const distOperatorActive =
    Boolean(distributionOperator) &&
    isDistributionOperatorGate({
      thesis: channelThesis,
      opsCadence: opsCadence ?? undefined,
      growthPlane: growthControlPlane ?? undefined,
    });

  const runActive =
    run?.status === "running" || run?.status === "planning" || run?.status === "created";
  const hasRun = Boolean(run?.runId);
  const hasPrimaryAction = record.next.action.kind !== "none";
  const nowTask = opsCadence ? getNowTask(opsCadence) : null;

  const checklistItems = useMemo(
    () =>
      buildDoneWhenChecklist(nowTask, channelThesis, {
        shipReceipt: lastShipReceipt,
        shipPipelineStage: shipPipeline?.stage,
        hasPendingApply: record.lifecycle === "awaiting_approval",
        qualityFindings: lastShipReceipt?.qualityWarnings,
      }),
    [nowTask, channelThesis, lastShipReceipt, shipPipeline?.stage, record.lifecycle],
  );

  const proofView = useMemo(
    () => (lastShipReceipt ? shipReceiptToProofView(lastShipReceipt, nowTask) : null),
    [lastShipReceipt, nowTask],
  );

  useEffect(() => {
    if (tab === "record") setTab(defaultHint);
  }, [defaultHint, setTab, tab]);

  useEffect(() => {
    if (runActive) setTab(run?.kind === "browse" ? "browser" : "diff");
  }, [runActive, run?.kind, setTab]);

  const activeTab = tab === "record" ? defaultHint : tab;
  const showWorkSurface = Boolean(surface);
  const kernelTimeline = replayExecutionTask(record.id);
  const kernelInst = executionKernel?.instances[record.id];
  const kernelFailed = kernelInst?.status === "failed";
  const kernelPaused = kernelInst?.status === "paused";
  const kernelRunning = kernelInst?.status === "running" || kernelInst?.status === "awaiting_approval";

  return (
    <div
      className={`mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radius-xl)] border bg-surface/80 shadow-[var(--shadow-1)] ${
        fill ? "min-h-0 flex-1" : ""
      } ${runActive ? "border-accent/35 ring-1 ring-accent/10" : "border-line"}`}
      data-testid="execution-detail-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
            Work surface
          </span>
          {kernelFailed && (
            <span className="text-[11px] font-medium text-warn" data-testid="execution-kernel-failed">
              Failed{kernelInst?.last_error ? ` — ${kernelInst.last_error}` : ""}
            </span>
          )}
          {kernelPaused && (
            <span className="text-[11px] font-medium text-text-2" data-testid="execution-kernel-paused">
              Paused
            </span>
          )}
          {runActive && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent">
              <Radio size={11} className="animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {kernelFailed && (
            <Button
              variant="primary"
              size="sm"
              data-testid="execution-kernel-retry"
              onClick={() => {
                const err = retryExecutionTask(record.id);
                if (err) appendEvent({ role: "system", kind: "error", text: err });
              }}
            >
              Retry
            </Button>
          )}
          {kernelPaused && (
            <Button
              variant="primary"
              size="sm"
              data-testid="execution-kernel-resume"
              onClick={() => resumeExecutionTask(record.id)}
            >
              Resume
            </Button>
          )}
          {(kernelRunning || kernelPaused) && (
            <>
              {kernelRunning && (
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="execution-kernel-pause"
                  onClick={() => pauseExecutionTask(record.id)}
                >
                  Pause
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                data-testid="execution-kernel-cancel"
                onClick={() => cancelExecutionTask(record.id)}
              >
                Cancel
              </Button>
            </>
          )}
          <Segmented
            value={activeTab}
            onChange={(v) => setTab(v as ExecutionRecordDetailTab)}
            options={TAB_OPTIONS}
          />
        </div>
      </div>

      <div
        className={`relative min-h-0 overflow-hidden ${
          fill ? "flex flex-1 flex-col" : runActive ? "min-h-[min(520px,52vh)]" : "min-h-[min(360px,40vh)]"
        }`}
      >
        <ShipPipelineBar />
        {showWorkSurface && surface ? (
          <WorkSurfaceShell active={surface}>
            <WorkSurfaceBody surface={surface} />
          </WorkSurfaceShell>
        ) : activeTab === "diff" ? (
          hasRun ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <DoneWhenChecklistHeader
                doneWhen={nowTask?.done_when}
                items={checklistItems}
              />
              <RunCanvas />
            </div>
          ) : (
            <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="max-w-sm text-body-sm text-text-2">
                Diff appears here — patches and apply show up once a run starts.
              </p>
              {hasPrimaryAction && (
                <p className="text-mini text-text-3">
                  Primary action is on the execution record above.
                </p>
              )}
            </div>
          )
        ) : activeTab === "browser" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <BrowserCanvas />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {distOperatorActive && distributionOperator && activeTab === "proof" && (
              <DistributionHookDayGrid workspace={distributionOperator} />
            )}
            {activeTab === "proof" && (
              <div className="border-b border-line/60 px-4 py-3">
                <SocialMetricsImportPanel />
              </div>
            )}
            <ProofDetailView
              receipt={proofView?.receipt}
              taskLabel={proofView?.taskLabel}
              doneWhen={proofView?.doneWhen}
            />
          </div>
        )}
      </div>
      {kernelTimeline.length > 0 && (
        <div
          className="border-t border-line/60 px-4 py-2 text-[11px] text-text-3"
          data-testid="execution-kernel-replay"
        >
          <span className="font-semibold uppercase tracking-wider text-text-2">Kernel timeline</span>
          <ul className="mt-1 space-y-0.5">
            {kernelTimeline.slice(-6).map((entry, i) => (
              <li key={`${entry.at}-${i}`}>
                {entry.title}
                {entry.detail ? ` — ${entry.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
