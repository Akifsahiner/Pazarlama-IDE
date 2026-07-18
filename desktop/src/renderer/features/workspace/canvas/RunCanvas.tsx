import { useEffect } from "react";
import { ArrowLeft, Check, Eye, GitBranch, X, AlertTriangle } from "lucide-react";
import { normalizePlan } from "@shared/planPlaybooks";
import { runChangedFiles } from "@shared/runs";
import { useApp } from "@renderer/state/store";
import type { CanvasMode } from "@renderer/state/session";
import { ApprovalGate } from "@renderer/components/ApprovalGate";
import { IntentStrip } from "@renderer/components/IntentStrip";
import { StageBreadcrumb } from "@renderer/features/workspace/stage/StageBreadcrumb";
import { ActivityTimeline } from "@renderer/components/ActivityTimeline";
import { PermissionMatrix } from "@renderer/components/PermissionMatrix";
import { Operator } from "@renderer/features/workspace/operator/Operator";
import { ExecutionStage } from "./ExecutionStage";
import { RunReplayBanner } from "@renderer/features/runs/RunReplayBanner";
import type { PermissionScope, RunEvent } from "@shared/types";
import { PERMISSION_SCOPE_LABELS } from "@shared/types";

/** Collect distinct changed files from the run's patch events. */
function changedFiles(events: RunEvent[]): string[] {
  return runChangedFiles(events);
}

/** Centered approval overlay for a gated edit run — same grammar as browser operator. */
function RunApproval({
  approvalId,
  intent,
  scope,
}: {
  approvalId: string;
  intent: string;
  scope: PermissionScope;
}) {
  const approveRun = useApp((s) => s.approveRun);
  const rejectRun = useApp((s) => s.rejectRun);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-bg/60 p-4 backdrop-blur-[2px]">
      <ApprovalGate
        badge={PERMISSION_SCOPE_LABELS[scope]}
        summary={intent}
        onApprove={() => approveRun(approvalId)}
        onReject={() => rejectRun(approvalId)}
      />
    </div>
  );
}

/**
 * Execution Canvas — adaptive center stage with browser operator or execution hero.
 */
const SEGMENTS: { mode: CanvasMode; label: string }[] = [
  { mode: "run", label: "Stage" },
  { mode: "browser", label: "Browser" },
  { mode: "preview", label: "Diff & Preview" },
  { mode: "taskgraph", label: "Steps" },
];

function runHasBrowserActivity(events: RunEvent[]): boolean {
  return events.some((e) => e.type.startsWith("browser.") || e.type === "evidence.captured");
}

/** Plan → run → plan continuity: name the plan task this run belongs to. */
function PlanContextStrip({ planTaskId }: { planTaskId: string }) {
  const plan = useApp((s) => s.plan);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const suite = plan ? normalizePlan(plan) : null;
  const task = suite?.taskGraph.find((t) => t.id === planTaskId);
  if (!task) return null;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-accent/20 bg-accent-soft/15 px-4 py-1.5">
      <span className="min-w-0 truncate text-micro text-text-2">
        Plan task · <span className="text-text">Day {task.day} — {task.title}</span>
      </span>
      <button
        type="button"
        onClick={() => focusPlanTask({ playbookId: task.playbookId, taskId: task.id })}
        className="flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-0.5 text-micro text-accent transition-colors hover:bg-accent-soft"
      >
        <ArrowLeft size={11} /> Back to plan
      </button>
    </div>
  );
}

export function RunCanvas() {
  const liveRun = useApp((s) => s.run);
  const replayRun = useApp((s) => s.replayRun);
  const run = liveRun ?? replayRun;
  const readOnly = !!replayRun && !liveRun;
  const canvasMode = useApp((s) => s.canvas.mode);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const applyRunChanges = useApp((s) => s.applyRunChanges);
  const discardRunChanges = useApp((s) => s.discardRunChanges);
  const discardRunSelection = useApp((s) => s.discardRunSelection);
  const runApplySelection = useApp((s) => s.runApplySelection);
  const resetRunApplySelection = useApp((s) => s.resetRunApplySelection);
  const planProgress = useApp((s) => s.planProgress);
  const browserActive = useApp((s) => s.browser.running || !!s.browser.frame);
  const events = run?.events ?? [];
  const hasBrowser = runHasBrowserActivity(events) || browserActive;
  const files = run ? changedFiles(run.events) : [];
  const finished = run?.status === "completed" || run?.status === "failed";
  const planTaskStatus = run?.planTaskId
    ? planProgress?.byTaskId[run.planTaskId]?.status
    : undefined;
  const awaitingApply =
    finished && (planTaskStatus === "awaiting_apply" || planTaskStatus === "partial");

  useEffect(() => {
    if (run && finished && files.length > 0) {
      resetRunApplySelection(files);
    }
  }, [run, finished, files.join("|"), resetRunApplySelection]);

  // When Computer Use goes live during an edit run, jump to the Browser tab.
  useEffect(() => {
    if (readOnly || !browserActive) return;
    if (canvasMode === "preview" || canvasMode === "taskgraph") return;
    if (canvasMode !== "browser") setActiveCanvas("browser");
  }, [browserActive, readOnly, canvasMode, setActiveCanvas]);

  if (!run) return null;

  const visibleSegments = hasBrowser
    ? SEGMENTS
    : SEGMENTS.filter((s) => s.mode !== "browser");

  return (
    <div className="flex h-full flex-col">
      {readOnly && <RunReplayBanner />}
      <div className="border-b border-line bg-surface/90 px-4 py-2 backdrop-blur-sm">
        <StageBreadcrumb />
      </div>
      {run.planTaskId && <PlanContextStrip planTaskId={run.planTaskId} />}
      {awaitingApply && !readOnly && (
        <div className="flex items-center gap-2 border-b border-warn/30 bg-warn/10 px-4 py-2 text-micro text-warn">
          <AlertTriangle size={12} className="shrink-0" />
          <span>
            Apply at least one file to mark this plan task done — done means value landed in your repo.
          </span>
        </div>
      )}
      {!readOnly &&
        run.kind !== "browse" &&
        (run.status === "running" || run.status === "planning" || run.status === "created") && (
          <div className="flex items-center gap-2 border-b border-accent/15 bg-accent-soft/10 px-4 py-1 text-[10px] text-accent">
            <GitBranch size={11} />
            Editing in an isolated git worktree — apply merges changes into your repo
          </div>
        )}
      <IntentStrip />

      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface/60 px-4 py-1.5">
        <div className="flex items-center gap-1">
          {visibleSegments.map((seg) => (
            <button
              key={seg.mode}
              onClick={() => setActiveCanvas(seg.mode)}
              className={`relative rounded-[var(--radius-sm)] px-3 py-1 text-micro transition-colors ${
                canvasMode === seg.mode
                  ? "bg-elevated text-text"
                  : "text-text-2 hover:bg-elevated/60 hover:text-text"
              }`}
            >
              {seg.label}
              {seg.mode === "preview" && files.length > 0 && canvasMode !== "preview" && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
                  {files.length}
                </span>
              )}
              {seg.mode === "browser" && browserActive && canvasMode !== "browser" && (
                <span className="ml-1.5 inline-flex h-4 items-center justify-center rounded-full bg-ok/90 px-1.5 text-[10px] font-medium text-white">
                  Live
                </span>
              )}
            </button>
          ))}
        </div>
        <PermissionMatrix policy={run.policy} />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {canvasMode === "browser" && hasBrowser ? (
          readOnly && run.frame ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 overflow-y-auto bg-elevated/40 p-6">
              <img
                src={`data:image/png;base64,${run.frame}`}
                alt="Final browser frame from archived run"
                className="max-h-full max-w-full rounded-[var(--radius-md)] border border-line shadow-sm"
              />
              <p className="text-micro text-text-3">Archived browser session — final captured frame</p>
            </div>
          ) : !readOnly ? (
            <Operator />
          ) : (
            <ExecutionStage run={run} />
          )
        ) : browserActive && !readOnly && canvasMode === "run" ? (
          <Operator />
        ) : (
          <ExecutionStage run={run} />
        )}

        {!readOnly && run.pendingApproval && (
          <RunApproval
            approvalId={run.pendingApproval.approvalId}
            intent={run.pendingApproval.intent}
            scope={run.pendingApproval.scope}
          />
        )}
      </div>

      {!readOnly && finished && files.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-mini text-text-2">
            <GitBranch size={13} className="shrink-0 text-accent" />
            <span>
              {files.length} file{files.length > 1 ? "s" : ""} changed in isolated worktree
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCanvas("preview")}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text"
            >
              <Eye size={13} /> Review all diffs
            </button>
            <button
              type="button"
              disabled={runApplySelection.length === 0}
              onClick={() => void discardRunSelection(runApplySelection)}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text disabled:opacity-40"
            >
              <X size={13} /> Discard selected
            </button>
            <button
              onClick={() => void discardRunChanges()}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text"
            >
              <X size={13} /> Discard all
            </button>
            <button
              onClick={() => void applyRunChanges(runApplySelection.length ? runApplySelection : files)}
              disabled={runApplySelection.length === 0 && files.length === 0}
              data-testid="ship-apply-primary"
              className="btn-accent flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini disabled:opacity-40"
            >
              <Check size={13} /> Apply {runApplySelection.length || files.length} file
              {(runApplySelection.length || files.length) !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-line bg-surface/60">
        <ActivityTimeline events={run.events} />
      </div>
    </div>
  );
}
