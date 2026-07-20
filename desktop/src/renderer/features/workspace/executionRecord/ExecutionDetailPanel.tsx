import { ChevronDown, ChevronUp } from "lucide-react";
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

const TAB_OPTIONS: { value: ExecutionRecordDetailTab; label: string }[] = [
  { value: "diff", label: "Diff" },
  { value: "browser", label: "Browser" },
  { value: "proof", label: "Kanıt" },
];

export function ExecutionDetailPanel({
  defaultHint,
  expanded,
  onToggleExpanded,
}: {
  defaultHint: ExecutionRecordDetailTab;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const tab = useApp((s) => s.executionRecordDetailTab);
  const setTab = useApp((s) => s.setExecutionRecordDetailTab);
  const run = useApp((s) => s.run);
  const canvasMode = useApp((s) => s.canvas.mode);
  const surface = normalizeToWorkSurface(canvasMode);

  useEffect(() => {
    if (tab === "record") setTab(defaultHint);
  }, [defaultHint, setTab, tab]);

  const activeTab = tab === "record" ? defaultHint : tab;
  const hasRun = Boolean(run?.runId);
  const showWorkSurface = Boolean(surface);

  return (
    <div
      className="mx-auto w-full max-w-3xl overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface/60"
      data-testid="execution-detail-panel"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line/60 px-3 py-2">
        <Segmented
          value={activeTab}
          onChange={(v) => setTab(v as ExecutionRecordDetailTab)}
          options={TAB_OPTIONS}
        />
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex items-center gap-1 text-micro text-accent hover:underline"
        >
          {expanded ? (
            <>
              Daralt <ChevronUp size={12} />
            </>
          ) : (
            <>
              Genişlet <ChevronDown size={12} />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="relative max-h-[min(420px,45vh)] min-h-[180px] overflow-hidden">
          <ShipPipelineBar />
          {showWorkSurface && surface ? (
            <WorkSurfaceShell active={surface}>
              <WorkSurfaceBody surface={surface} />
            </WorkSurfaceShell>
          ) : activeTab === "diff" ? (
            hasRun ? (
              <div className="h-full min-h-[180px] overflow-y-auto">
                <RunCanvas />
              </div>
            ) : (
              <div className="flex h-[180px] items-center justify-center p-4 text-center text-body-sm text-text-3">
                Henüz diff yok — sistem run başlat veya chat&apos;ten yönlendir.
              </div>
            )
          ) : activeTab === "browser" ? (
            <div className="h-full min-h-[180px] overflow-y-auto">
              <BrowserCanvas />
            </div>
          ) : (
            <ProofDetailView />
          )}
        </div>
      )}
    </div>
  );
}
