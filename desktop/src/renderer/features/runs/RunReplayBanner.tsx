import { ArrowLeft, History } from "lucide-react";
import { useApp } from "@renderer/state/store";

export function RunReplayBanner() {
  const clearReplayRun = useApp((s) => s.clearReplayRun);
  const navigate = useApp((s) => s.navigate);
  const replayRun = useApp((s) => s.replayRun);

  if (!replayRun?.readOnly) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-elevated/80 px-4 py-2">
      <span className="text-mini text-text-2">
        Archived run — replay only. Apply and discard are disabled.
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            clearReplayRun();
            navigate("runs");
          }}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-text-2 transition-colors hover:bg-surface hover:text-text"
        >
          <ArrowLeft size={13} /> Back to Runs
        </button>
        <button
          onClick={() => {
            useApp.getState().launchComposerAction({
              mode: "edit",
              draft: replayRun.goal,
            });
          }}
          className="rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-accent transition-colors hover:bg-surface"
        >
          Run similar task
        </button>
      </div>
    </div>
  );
}

/** Shown when archive is empty but we want a subtle icon reference. */
export function RunReplayEmptyHint() {
  return (
    <span className="inline-flex items-center gap-1 text-text-3">
      <History size={12} />
    </span>
  );
}
