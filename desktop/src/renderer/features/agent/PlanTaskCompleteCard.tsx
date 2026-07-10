import {
  CheckCircle2,
  BarChart3,
  Play,
  RotateCcw,
  GitBranch,
  Eye,
  Check,
  ClipboardCheck,
} from "lucide-react";
import { inferKpiPresetFromText } from "@shared/kpiPresets";
import type { PlanTaskCompletionGate } from "@shared/planTaskCompletion";
import { useApp } from "@renderer/state/store";

export type PlanTaskCardVariant =
  | "done"
  | "failed"
  | "awaiting_apply"
  | "awaiting_review"
  | "partial";

export function PlanTaskCompleteCard({
  completedDay,
  completedTitle,
  completedTaskId,
  nextDay,
  nextTitle,
  nextTaskId,
  nextPlaybookId,
  failed,
  variant: variantProp,
  reviewGate,
}: {
  completedDay?: number;
  completedTitle?: string;
  completedTaskId?: string;
  nextDay?: number;
  nextTitle?: string;
  nextTaskId?: string;
  nextPlaybookId?: string;
  failed?: boolean;
  variant?: PlanTaskCardVariant;
  reviewGate?: PlanTaskCompletionGate;
}) {
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const openKpiLog = useApp((s) => s.openKpiLog);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const applyRunChanges = useApp((s) => s.applyRunChanges);
  const run = useApp((s) => s.run);
  const runApplySelection = useApp((s) => s.runApplySelection);
  const confirmPlanTaskWithoutApply = useApp((s) => s.confirmPlanTaskWithoutApply);
  const markPlanTaskComplete = useApp((s) => s.markPlanTaskComplete);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const navigate = useApp((s) => s.navigate);
  const plan = useApp((s) => s.plan);

  const variant: PlanTaskCardVariant =
    variantProp ?? (failed ? "failed" : "done");

  const kpiPresetId = inferKpiPresetFromText(completedTitle);
  const retryTaskId = variant === "failed" ? completedTaskId : nextTaskId;

  const retry = () => {
    if (!retryTaskId || !plan) return;
    const task = plan.taskGraph.find((t) => t.id === retryTaskId);
    if (!task) return;
    focusPlanTask({
      playbookId: task.playbookId,
      taskId: task.id,
      startRun: true,
    });
  };

  const reviewAndApply = () => {
    setActiveCanvas("preview");
    const files = runApplySelection.length ? runApplySelection : undefined;
    if (files?.length) void applyRunChanges(files);
  };

  const shellClass =
    variant === "failed"
      ? "border-danger/30 bg-danger/5"
      : variant === "done"
        ? "border-ok/30 bg-ok/5"
        : variant === "partial"
          ? "border-warn/35 bg-warn/5"
          : "border-warn/30 bg-warn/5";

  const header = (() => {
    switch (variant) {
      case "failed":
        return (
          <>
            <RotateCcw size={14} className="text-danger" /> Run failed
          </>
        );
      case "awaiting_apply":
        return (
          <>
            <GitBranch size={14} className="text-warn" /> Apply to complete this task
          </>
        );
      case "awaiting_review":
        return (
          <>
            <ClipboardCheck size={14} className="text-warn" /> Confirm task outcome
          </>
        );
      case "partial":
        return (
          <>
            <GitBranch size={14} className="text-warn" /> Partially applied
          </>
        );
      default:
        return (
          <>
            <CheckCircle2 size={14} className="text-ok" /> Plan task complete
          </>
        );
    }
  })();

  const subcopy = (() => {
    switch (variant) {
      case "awaiting_apply":
        return "Run finished — review the diff and apply at least one file to mark Day done.";
      case "awaiting_review":
        if (reviewGate === "connector-pending") {
          return "Connect GA4 or log KPIs on Performance — then mark this task complete.";
        }
        if (reviewGate === "research-pending") {
          return "Browser finished with no findings — confirm when research is sufficient.";
        }
        return "Run finished with no file diffs — confirm when the outcome is sufficient.";
      case "partial":
        return "Some changes were applied. Mark complete when the task goal is met.";
      default:
        return null;
    }
  })();

  return (
    <div className={`max-w-[96%] rounded-[var(--radius-lg)] border p-4 ${shellClass}`}>
      <div className="flex items-center gap-2 text-mini font-medium text-text">{header}</div>
      {completedTitle && (
        <p className="mt-1 text-body-sm text-text-2">
          Day {completedDay}: {completedTitle}
        </p>
      )}
      {subcopy && <p className="mt-1 text-micro text-text-3">{subcopy}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {variant === "failed" && retryTaskId && (
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini hover:bg-elevated"
          >
            <RotateCcw size={12} /> Retry task
          </button>
        )}

        {variant === "awaiting_apply" && (
          <>
            <button
              type="button"
              onClick={() => setActiveCanvas("preview")}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini hover:bg-elevated"
            >
              <Eye size={12} /> Review diff
            </button>
            <button
              type="button"
              onClick={reviewAndApply}
              disabled={!run?.runId}
              className="btn-accent inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini disabled:opacity-40"
            >
              <Check size={12} /> Apply changes
            </button>
          </>
        )}

        {variant === "awaiting_review" && completedTaskId && (
          <>
            {reviewGate === "connector-pending" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCanvas("performance");
                    setWorkSurface("performance");
                  }}
                  className="btn-accent inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini"
                >
                  <BarChart3 size={12} /> Open Performance
                </button>
                <button
                  type="button"
                  onClick={() => navigate("settings", "connection")}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini hover:bg-elevated"
                >
                  Connect GA4
                </button>
                <button
                  type="button"
                  onClick={() => confirmPlanTaskWithoutApply(completedTaskId)}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini hover:bg-elevated"
                >
                  <Check size={12} /> KPI logged — mark complete
                </button>
              </>
            ) : reviewGate === "research-pending" ? (
              <button
                type="button"
                onClick={() => confirmPlanTaskWithoutApply(completedTaskId)}
                className="btn-accent inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini"
              >
                <ClipboardCheck size={12} /> Research sufficient
              </button>
            ) : (
              <button
                type="button"
                onClick={() => confirmPlanTaskWithoutApply(completedTaskId)}
                className="btn-accent inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini"
              >
                <Check size={12} /> No file changes needed
              </button>
            )}
          </>
        )}

        {variant === "partial" && completedTaskId && (
          <button
            type="button"
            onClick={() => markPlanTaskComplete(completedTaskId)}
            className="btn-accent inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini"
          >
            <CheckCircle2 size={12} /> Mark complete
          </button>
        )}

        {variant === "done" && kpiPresetId && (
          <button
            type="button"
            onClick={() => openKpiLog(kpiPresetId)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-accent/30 bg-accent-soft px-3 py-1.5 text-mini text-accent hover:bg-accent/10"
          >
            <BarChart3 size={12} /> Log result?
          </button>
        )}

        {variant === "done" && nextTaskId && nextTitle && (
          <button
            type="button"
            onClick={() =>
              focusPlanTask({
                playbookId: nextPlaybookId,
                taskId: nextTaskId,
                startRun: true,
              })
            }
            className="btn-accent inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini"
          >
            <Play size={12} /> Continue · Day {nextDay}
          </button>
        )}

        {variant === "done" && nextTaskId && (
          <button
            type="button"
            onClick={() => focusPlanTask({ playbookId: nextPlaybookId, taskId: nextTaskId })}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 hover:bg-elevated"
          >
            Open in Plan Studio
          </button>
        )}
      </div>
    </div>
  );
}
