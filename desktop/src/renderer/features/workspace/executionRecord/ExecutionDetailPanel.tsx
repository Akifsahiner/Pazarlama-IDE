import { useEffect } from "react";
import type { ExecutionRecordDetailTab } from "@shared/executionRecord";
import { normalizeToWorkSurface } from "@shared/workSurfaces";
import { Segmented } from "@renderer/components/ui/Segmented";
import { useApp } from "@renderer/state/store";
import { ShipPipelineBar } from "../ShipPipelineBar";
import { RunCanvas } from "../canvas/RunCanvas";
import { BrowserCanvas } from "../canvas/BrowserCanvas";
import { WorkSurfaceShell } from "../canvas/WorkSurfaceShell";
import { WorkSurfaceBody } from "../canvas/work/WorkSurfaceBody";
import { ProofDetailView } from "./ProofDetailView";
import { useCommandSurfaceDispatch } from "./useCommandSurfaceDispatch";
import type { ExecutionRecordView } from "@shared/executionRecord";
import { Radio } from "lucide-react";

const TAB_OPTIONS: { value: ExecutionRecordDetailTab; label: string }[] = [
  { value: "diff", label: "Diff" },
  { value: "browser", label: "Browser" },
  { value: "proof", label: "Kanıt" },
];

export function ExecutionDetailPanel({
  record,
  defaultHint,
  fill = false,
}: {
  record: ExecutionRecordView;
  defaultHint: ExecutionRecordDetailTab;
  /** When true, panel grows to fill remaining vertical space (run / focus mode). */
  fill?: boolean;
}) {
  const tab = useApp((s) => s.executionRecordDetailTab);
  const setTab = useApp((s) => s.setExecutionRecordDetailTab);
  const run = useApp((s) => s.run);
  const canvasMode = useApp((s) => s.canvas.mode);
  const surface = normalizeToWorkSurface(canvasMode);
  const dispatch = useCommandSurfaceDispatch();

  const runActive =
    run?.status === "running" || run?.status === "planning" || run?.status === "created";
  const hasRun = Boolean(run?.runId);
  const primary = record.next.action.kind !== "none" ? record.next.action : null;

  useEffect(() => {
    if (tab === "record") setTab(defaultHint);
  }, [defaultHint, setTab, tab]);

  useEffect(() => {
    if (runActive) setTab(run?.kind === "browse" ? "browser" : "diff");
  }, [runActive, run?.kind, setTab]);

  const activeTab = tab === "record" ? defaultHint : tab;
  const showWorkSurface = Boolean(surface);

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
            Çalışma alanı
          </span>
          {runActive && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent">
              <Radio size={11} className="animate-pulse" />
              Canlı
            </span>
          )}
        </div>
        <Segmented
          value={activeTab}
          onChange={(v) => setTab(v as ExecutionRecordDetailTab)}
          options={TAB_OPTIONS}
        />
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
            <div className="min-h-0 flex-1 overflow-y-auto">
              <RunCanvas />
            </div>
          ) : (
            <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="max-w-sm text-body-sm text-text-2">
                Diff burada — run başlayınca patch ve apply bu alanda görünür.
              </p>
              {primary && (
                <button
                  type="button"
                  className="btn-accent rounded-[var(--radius-md)] px-4 py-2 text-body-sm font-medium"
                  data-testid="detail-empty-cta"
                  onClick={() => dispatch(primary)}
                >
                  {primary.label}
                </button>
              )}
            </div>
          )
        ) : activeTab === "browser" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <BrowserCanvas />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ProofDetailView />
          </div>
        )}
      </div>
    </div>
  );
}
