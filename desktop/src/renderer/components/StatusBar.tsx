import { useEffect, useState } from "react";
import { Circle, Cpu, FolderGit2, GitBranch } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { UsageMeter } from "@renderer/components/UsageMeter";
import { NotificationBell } from "@renderer/components/NotificationBell";
import type { RepoStatus } from "@shared/types";

export function StatusBar() {
  const settings = useApp((s) => s.settings);
  const project = useApp((s) => s.project);
  const run = useApp((s) => s.run);
  const state = useApp((s) => s.connection.state);
  const runtime = useApp((s) => s.runtime);
  const localOnlyMode = useApp((s) => s.localOnlyMode);
  const version = useApp((s) => s.version);
  const checkConnection = useApp((s) => s.checkConnection);
  const openConnectFlow = useApp((s) => s.openConnectFlow);
  const outboxCount = useApp((s) => s.outboxCount);
  const outboxFlushing = useApp((s) => s.outboxFlushing);
  const flushMessageOutbox = useApp((s) => s.flushMessageOutbox);
  const [repoStatus, setRepoStatus] = useState<RepoStatus | null>(null);

  const projectRoot =
    project?.source.kind === "folder"
      ? project.source.path
      : project?.localPath;
  const runActive =
    !!run &&
    (run.status === "running" || run.status === "planning" || run.status === "created");
  const browserRunActive = run?.kind === "browse" && runActive;
  const runReviewPending =
    !!run &&
    (run.status === "completed" || run.status === "failed") &&
    (run.events?.some(
      (e) => e.type === "file.patch_created" || e.type === "file.patch_updated",
    ) ??
      false);

  useEffect(() => {
    if (!projectRoot) {
      setRepoStatus(null);
      return;
    }
    let cancelled = false;
    void window.api.git.status(projectRoot).then((status) => {
      if (!cancelled) setRepoStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [projectRoot, run?.status]);

  const label =
    runtime === "connected"
      ? "Connected"
      : localOnlyMode
        ? "Local mode — enable AI when ready"
        : state === "checking"
          ? "Checking…"
          : "Not connected";
  const dotClass =
    runtime === "connected"
      ? "fill-ok text-ok"
      : state === "checking"
        ? "fill-warn text-warn"
        : localOnlyMode
          ? "fill-warn text-warn"
          : "fill-text-3 text-text-3";

  return (
    <footer
      className="flex items-center justify-between border-t border-line bg-surface px-3 text-micro text-text-2"
      style={{ height: "var(--statusbar-h)" }}
    >
      <div className="flex min-w-0 items-center gap-4">
        <NotificationBell />
        <button
          onClick={() => (runtime === "connected" ? void checkConnection() : openConnectFlow())}
          title={runtime === "connected" ? "Click to retry connection" : "Retry connection"}
          className="flex shrink-0 items-center gap-1.5 transition-colors hover:text-text"
        >
          <Circle size={8} className={dotClass} />
          {label}
        </button>
        {project && (
          <span className="flex min-w-0 items-center gap-1.5">
            <FolderGit2 size={12} className="shrink-0" />
            <span className="truncate">{project.name}</span>
          </span>
        )}
        {repoStatus?.isGit && repoStatus.branch && (
          <span
            className="hidden items-center gap-1 sm:flex"
            title={repoStatus.headSha ? `HEAD ${repoStatus.headSha}` : undefined}
          >
            <GitBranch size={12} className="shrink-0 text-text-3" />
            <span className="truncate font-mono">{repoStatus.branch}</span>
            {repoStatus.headSha && (
              <span className="font-mono text-text-3">{repoStatus.headSha}</span>
            )}
          </span>
        )}
        {(runActive || runReviewPending) && repoStatus?.isGit && run?.kind !== "browse" && (
          <span
            className="inline-flex rounded-[var(--radius-sm)] border border-accent/25 bg-accent-soft/20 px-2 py-0.5 text-[10px] text-accent sm:inline"
            title={
              runReviewPending
                ? "Review diffs before apply — changes are in an isolated worktree"
                : "Agent edits run in an isolated git worktree until you apply or discard"
            }
          >
            {runReviewPending ? "Review worktree" : "Isolated worktree"}
          </span>
        )}
        {browserRunActive && (
          <span
            className="inline-flex rounded-[var(--radius-sm)] border border-ok/25 bg-ok/10 px-2 py-0.5 text-[10px] text-ok sm:inline"
            title="Browser operator session — research only, you publish"
          >
            Browser run
          </span>
        )}
        {outboxCount > 0 && (
          <button
            type="button"
            onClick={() => void flushMessageOutbox()}
            disabled={outboxFlushing || runtime !== "connected"}
            className="inline-flex rounded-[var(--radius-sm)] border border-warn/30 bg-warn/10 px-2 py-0.5 text-[10px] text-warn transition-colors hover:bg-warn/15 disabled:opacity-50"
            title={
              runtime === "connected"
                ? "Queued messages waiting to send — click to flush"
                : "Messages queued offline — will send when connected"
            }
          >
            {outboxFlushing ? "Sending…" : `${outboxCount} queued`}
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <UsageMeter />
        <span className="flex items-center gap-1.5">
          <Cpu size={12} />
          {settings.provider === "anthropic" ? "Claude" : "OpenAI"}
        </span>
        <span>v{version}</span>
      </div>
    </footer>
  );
}
