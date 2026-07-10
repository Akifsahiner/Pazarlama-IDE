import { Check, CircleDot, ExternalLink, FileCode2, Loader2, RefreshCw, Wrench, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { DiffViewer } from "@renderer/components/DiffViewer";
import { presentError } from "@renderer/lib/errorPresenter";
import { parseUnifiedPatch } from "@shared/patchParse";
import type { RunEvent } from "@shared/types";
import type { FilePatchPayload } from "@shared/types";
import type { RunInfo } from "@renderer/state/session";

function iconFor(type: RunEvent["type"]) {
  if (type.startsWith("file.")) return FileCode2;
  if (type.startsWith("tool.")) return Wrench;
  return CircleDot;
}

function toneFor(status: RunEvent["status"]) {
  if (status === "running") return "text-accent";
  if (status === "success") return "text-ok";
  if (status === "failed") return "text-danger";
  return "text-text-3";
}

function latestPatch(events: RunEvent[]): FilePatchPayload | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "file.patch_created" || e.type === "file.patch_updated") {
      return (e.payload as FilePatchPayload | undefined) ?? null;
    }
  }
  return null;
}

function recentSteps(events: RunEvent[], limit = 8): RunEvent[] {
  return events
    .filter(
      (e) =>
        e.type.startsWith("tool.") ||
        e.type.startsWith("file.") ||
        e.type === "agent.message" ||
        e.type === "agent.status" ||
        e.type === "run.planning",
    )
    .slice(-limit);
}

/** Latest run.failed reason so failures explain themselves in place. */
function failureReason(events: RunEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === "run.failed") {
      return events[i].summary ?? events[i].title ?? null;
    }
  }
  return null;
}

/**
 * Hero execution view — large intent + step feed + inspectable file diff (Cursor-style).
 */
export function ExecutionStage({ run }: { run: RunInfo }) {
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const startRun = useApp((s) => s.startRun);
  const connected = useApp((s) => s.connection.state === "connected");
  const active =
    run.status === "running" || run.status === "planning" || run.status === "created";
  const failed = run.status === "failed";
  const patch = latestPatch(run.events);
  const steps = recentSteps(run.events);
  const parsed = patch?.patch ? parseUnifiedPatch(patch.patch) : null;
  const failure = failed ? failureReason(run.events) : null;
  const presented = failure ? presentError(failure) : null;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-3xl text-center">
        {active && (
          <Loader2 size={28} className="mx-auto mb-3 animate-spin text-accent" aria-hidden />
        )}
        {!active && run.status === "completed" && (
          <Check size={28} className="mx-auto mb-3 text-ok" aria-hidden />
        )}
        {failed && <X size={28} className="mx-auto mb-3 text-danger" aria-hidden />}
        <h2 className="text-display text-[22px] font-semibold leading-snug text-text">
          {run.intent ?? run.goal}
        </h2>
        <p className="mt-2 text-body-sm text-text-2">
          {active
            ? run.kind === "browse"
              ? "Browser operator is researching — review captured steps below."
              : "Agent is editing in an isolated workspace — review each change below as it lands."
            : run.status === "completed"
              ? run.kind === "browse"
                ? "Browser task finished. Review captured evidence above."
                : "Run finished. Review the diff, then Apply or Discard."
              : failed
                ? "Run failed."
                : "Run stopped."}
        </p>
        {failed && (
          <div className="mx-auto mt-3 max-w-xl rounded-[var(--radius-md)] border border-danger-border bg-danger-soft px-4 py-3 text-left">
            <p className="text-body-sm text-danger">{presented?.message ?? "The run ended with an error."}</p>
            {!run.readOnly && (
              <button
                type="button"
                disabled={!connected}
                onClick={() => void startRun(run.goal, run.planTaskId)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-danger-border px-2.5 py-1 text-micro text-danger transition-colors hover:brightness-110 disabled:opacity-40"
              >
                <RefreshCw size={12} /> Retry run
              </button>
            )}
          </div>
        )}
      </div>

      {run.frame && run.kind === "browse" && (
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 text-micro font-medium uppercase tracking-wide text-text-3">
            Browser capture
          </div>
          <img
            src={`data:image/png;base64,${run.frame}`}
            alt="Browser frame"
            className="w-full rounded-[var(--radius-lg)] border border-line"
          />
        </div>
      )}

      {patch && (
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-micro font-medium uppercase tracking-wide text-text-3">
              Latest edit
            </div>
            <button
              type="button"
              onClick={() => setActiveCanvas("preview")}
              className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-micro text-accent transition-colors hover:bg-accent-soft"
            >
              Full diff view
              <ExternalLink size={12} />
            </button>
          </div>
          {parsed && (parsed.added.length > 0 || parsed.removed.length > 0) ? (
            <DiffViewer file={patch.file} removed={parsed.removed} added={parsed.added} />
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
              <div className="font-mono text-body-sm text-text">{patch.file}</div>
              <div className="mt-1 text-mini">
                <span className="text-ok">+{patch.additions}</span>{" "}
                <span className="text-danger">−{patch.deletions}</span>
              </div>
              <p className="mt-2 text-mini text-text-3">
                Diff is loading — open Full diff view or check the Diff &amp; Preview tab.
              </p>
            </div>
          )}
        </div>
      )}

      {steps.length > 0 && (
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 text-micro font-medium uppercase tracking-wide text-text-3">
            Steps
          </div>
          <ul className="space-y-2 rounded-[var(--radius-lg)] border border-line bg-surface p-3">
            {steps.map((e) => {
              const Icon = e.status === "running" ? Loader2 : iconFor(e.type);
              return (
                <li key={e.id} className="flex items-start gap-2.5 text-body-sm">
                  <Icon
                    size={14}
                    className={`mt-0.5 shrink-0 ${toneFor(e.status)} ${e.status === "running" ? "animate-spin" : ""}`}
                  />
                  <span className="min-w-0 flex-1 break-words text-text-2">
                    {e.summary ?? e.title}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
