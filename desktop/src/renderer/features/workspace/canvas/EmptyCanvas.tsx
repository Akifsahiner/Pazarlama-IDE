import { useMemo } from "react";
import { Command, FolderOpen, Plug, Wand2 } from "lucide-react";
import { nextActionableTask } from "@shared/planProgress";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { useApp } from "@renderer/state/store";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { Kbd } from "@renderer/components/ui/Kbd";

export function EmptyCanvas() {
  const startRun = useApp((s) => s.startRun);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const navigate = useApp((s) => s.navigate);
  const openProjectPicker = useApp((s) => s.openProjectPicker);
  const togglePalette = useApp((s) => s.togglePalette);
  const connected = useApp((s) => s.connection.state === "connected");
  const project = useApp((s) => s.project);
  const plan = useApp((s) => s.plan);
  const planProgress = useApp((s) => s.planProgress);
  const hasFolder = project?.source.kind === "folder";

  const continueTask = useMemo(() => {
    if (!plan || !planProgress) return null;
    return nextActionableTask(plan, planProgress.byTaskId);
  }, [plan, planProgress]);

  const runContinueTask = () => {
    if (!continueTask) return;
    setActiveCanvas("campaign-plan");
    setWorkSurface("campaign-plan");
    void startRun(
      `Execute Day ${continueTask.day}: ${continueTask.title}. ${continueTask.deliverable ?? "Concrete file changes only."}`,
      continueTask.id,
    );
  };

  const focusComposer = () => {
    document.getElementById("agent-composer")?.focus();
  };

  const planGuide = SURFACE_UNLOCK["campaign-plan"];

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-8">
      <div className="w-full max-w-xl">
        <GuidedEmptyState
          icon={Wand2}
          title={project ? "Ready when you are" : "Open a project to begin"}
          description={
            project
              ? "Work surfaces live in the tab bar and Project rail. Tell the agent what to do in the composer — or pick a command."
              : "The operator works against an open project. Pick one to get started."
          }
          steps={
            project
              ? [
                  "Use the composer or command palette (Ctrl+K)",
                  "Generate a plan or run an Edit task",
                  "Review output in the matching work surface",
                ]
              : planGuide.steps
          }
          primaryAction={
            !project
              ? { label: "Open a project", onClick: openProjectPicker, icon: FolderOpen }
              : connected
                ? {
                    label: planGuide.primaryLabel,
                    onClick: () => runSurfaceUnlockAction(planGuide.primaryAction),
                  }
                : {
                    label: planGuide.secondaryLabel ?? "Preview outline",
                    onClick: () =>
                      runSurfaceUnlockAction(planGuide.secondaryAction ?? "preview_plan"),
                  }
          }
        />

        {project && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={focusComposer}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-mini text-text-2 transition-colors hover:border-accent/40 hover:bg-elevated hover:text-text"
            >
              Focus composer <Kbd>Ctrl L</Kbd>
            </button>
            <button
              type="button"
              onClick={() => togglePalette(true)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-mini text-text-2 transition-colors hover:border-accent/40 hover:bg-elevated hover:text-text"
            >
              <Command size={12} /> Command palette <Kbd>Ctrl K</Kbd>
            </button>
          </div>
        )}

        {continueTask && planProgress && planProgress.computed.done > 0 && (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-accent/30 bg-accent-soft/40 p-4">
            <div className="text-mini font-medium uppercase tracking-wide text-accent">Pick up where you left off</div>
            <p className="mt-2 text-body-sm leading-relaxed text-text">
              Day {continueTask.day} · {continueTask.title}
            </p>
            <p className="mt-1 text-mini text-text-3">
              {planProgress.computed.done}/{planProgress.computed.total} tasks complete
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  focusPlanTask({ playbookId: continueTask.playbookId, taskId: continueTask.id })
                }
                className="rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 transition-colors hover:bg-elevated hover:text-text"
              >
                View in plan
              </button>
              <button
                type="button"
                onClick={runContinueTask}
                disabled={!connected || !hasFolder}
                className="btn-accent rounded-[var(--radius-sm)] px-3 py-1.5 text-mini disabled:opacity-40"
              >
                Continue Day {continueTask.day}
              </button>
            </div>
          </div>
        )}

        {project && !connected && (
          <div className="mt-5 flex items-center justify-center">
            <button
              type="button"
              onClick={() => navigate("settings")}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-line px-4 py-2 text-body-sm text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Plug size={14} /> Connect a backend
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
