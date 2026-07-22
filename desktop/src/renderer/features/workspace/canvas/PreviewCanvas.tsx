import { useEffect, useMemo, useState } from "react";
import { Check, CircleDot, ExternalLink, FileCode2, ListChecks, Loader2, Play, X } from "lucide-react";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { EmptyState } from "@renderer/components/EmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { useApp } from "@renderer/state/store";
import type { CanvasMode } from "@renderer/state/session";
import { IntentStrip } from "@renderer/components/IntentStrip";
import { DiffViewer } from "@renderer/components/DiffViewer";
import { runChangedFiles } from "@shared/runs";
import type { FilePatchPayload, RunEvent, RunEventStatus, ValidationPayload } from "@shared/types";

type PreviewTab = "diff" | "preview" | "validation";

/** Shared sub-mode switcher so users can navigate back from Preview/Steps. */
const CANVAS_SEGMENTS: { mode: CanvasMode; label: string }[] = [
  { mode: "run", label: "Stage" },
  { mode: "preview", label: "Diff & Preview" },
  { mode: "taskgraph", label: "Steps" },
];

/** Distinct changed files from the run's patch events (respects selective discard). */
function changedFiles(events: RunEvent[]): string[] {
  return runChangedFiles(events);
}

/** Latest patch payload for a given file. */
function latestPatchFor(events: RunEvent[], file: string): FilePatchPayload | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "file.patch_created" || e.type === "file.patch_updated") {
      const p = e.payload as FilePatchPayload | undefined;
      if (p?.file === file) return p;
    }
  }
  return null;
}

import { parseHunks, parseUnifiedPatch } from "@shared/patchParse";
import { evaluateApplyGate } from "@shared/applyGate";
function previewUrl(events: RunEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === "preview.ready") {
      return (events[i].payload as { url?: string } | undefined)?.url ?? null;
    }
  }
  return null;
}

/** Latest validation checks, if validation has completed. */
function latestChecks(events: RunEvent[]): ValidationPayload["checks"] | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === "file.validation_completed") {
      return (events[i].payload as ValidationPayload | undefined)?.checks ?? null;
    }
  }
  return null;
}

function CheckIcon({ status }: { status: RunEventStatus }) {
  if (status === "running") return <Loader2 size={13} className="shrink-0 animate-spin text-accent" />;
  if (status === "success") return <Check size={13} className="shrink-0 text-ok" />;
  if (status === "failed") return <X size={13} className="shrink-0 text-danger" />;
  return <CircleDot size={13} className="shrink-0 text-text-3" />;
}

/**
 * Preview Canvas — the review surface for a run: file diffs, a live preview
 * iframe, and validation checks, switchable via a top tab bar.
 */
export function PreviewCanvas() {
  const run = useApp((s) => s.run);
  const project = useApp((s) => s.project);
  const startRunPreview = useApp((s) => s.startRunPreview);
  const validateRun = useApp((s) => s.validateRun);
  const canvasMode = useApp((s) => s.canvas.mode);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const runApplySelection = useApp((s) => s.runApplySelection);
  const resetRunApplySelection = useApp((s) => s.resetRunApplySelection);
  const toggleRunApplyFile = useApp((s) => s.toggleRunApplyFile);
  const applyRunChanges = useApp((s) => s.applyRunChanges);
  const applyRunHunks = useApp((s) => s.applyRunHunks);
  const discardRunChanges = useApp((s) => s.discardRunChanges);
  const discardRunSelection = useApp((s) => s.discardRunSelection);
  const [tab, setTab] = useState<PreviewTab>("diff");
  const [selectedHunkIds, setSelectedHunkIds] = useState<string[]>([]);

  const projectRoot = project?.source.kind === "folder" ? project.source.path : undefined;

  const events = run?.events ?? [];
  const files = useMemo(() => changedFiles(events), [events]);
  const [selected, setSelected] = useState<string | null>(null);
  const activeFile = selected ?? files[0] ?? null;
  const url = previewUrl(events);
  const checks = latestChecks(events);
  const applyGate = useMemo(() => evaluateApplyGate({ events }), [events]);
  const finished = run?.status === "completed" || run?.status === "failed";

  useEffect(() => {
    if (!run) return;
    if (finished && files.length > 0) resetRunApplySelection(files);
  }, [run, finished, files, resetRunApplySelection]);

  if (!run) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <GuidedEmptyState
          icon={FileCode2}
          title="No run to review"
          description="File diffs, live preview, and validation appear here after an Edit run."
          steps={[
            "Switch composer to Edit mode",
            "Describe what to change in your project",
            "Review and apply changes here",
          ]}
          primaryAction={{
            label: "Focus composer",
            onClick: () => runSurfaceUnlockAction("run_agent"),
          }}
        />
      </div>
    );
  }

  const patch = activeFile ? latestPatchFor(events, activeFile) : null;
  const parsed = patch?.patch ? parseUnifiedPatch(patch.patch) : null;
  const hunks = useMemo(
    () => (patch?.patch ? parseHunks(patch.patch) : []),
    [patch?.patch],
  );

  useEffect(() => {
    setSelectedHunkIds(hunks.map((h) => h.id));
  }, [activeFile, hunks]);

  const absFilePath =
    projectRoot && activeFile
      ? `${projectRoot.replace(/[\\/]+$/, "")}/${activeFile.replace(/\\/g, "/")}`
      : null;

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: "diff", label: "Diff" },
    { id: "preview", label: "Live Preview" },
    { id: "validation", label: "Validation" },
  ];

  return (
    <div className="flex h-full flex-col">
      <IntentStrip />

      <div className="flex items-center gap-1 border-b border-line bg-surface/60 px-4 py-1.5">
        {CANVAS_SEGMENTS.map((seg) => (
          <button
            key={seg.mode}
            onClick={() => setActiveCanvas(seg.mode)}
            className={`rounded-[var(--radius-sm)] px-3 py-1 text-micro transition-colors ${
              canvasMode === seg.mode
                ? "bg-elevated text-text"
                : "text-text-2 hover:bg-elevated/60 hover:text-text"
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 border-b border-line bg-surface/60 px-3 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-[var(--radius-sm)] px-3 py-1 text-micro transition-colors ${
              tab === t.id
                ? "bg-elevated text-text"
                : "text-text-2 hover:bg-elevated/60 hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "diff" &&
          (files.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={FileCode2}
                title="No file changes yet"
                description="Edits appear here line by line as the agent works — nothing has landed so far."
              />
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between gap-2 border-b border-line bg-surface/40 px-3 py-2">
                <span className="text-micro text-text-2">
                  Review {files.length} changed file{files.length > 1 ? "s" : ""} before apply
                </span>
                {absFilePath && (
                  <button
                    type="button"
                    onClick={() =>
                      void window.api.shell.openInEditor({ editor: "cursor", path: absFilePath })
                    }
                    className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 hover:bg-elevated hover:text-text"
                  >
                    <ExternalLink size={11} /> Open in Cursor
                  </button>
                )}
              </div>
              <div className="flex min-h-0 flex-1">
              <div className="w-56 shrink-0 overflow-y-auto border-r border-line bg-surface/40 py-2">
                {files.map((f) => {
                  const p = latestPatchFor(events, f);
                  const selected = runApplySelection.includes(f);
                  return (
                    <div
                      key={f}
                      className={`flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors ${
                        activeFile === f ? "bg-elevated" : "hover:bg-elevated/60"
                      }`}
                    >
                      {finished && (
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => toggleRunApplyFile(f, e.target.checked)}
                          className="mt-1 shrink-0"
                          aria-label={`Apply ${f}`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setSelected(f)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block w-full truncate font-mono text-micro text-text">{f}</span>
                        {p && (
                          <span className="text-micro">
                            <span className="text-ok">+{p.additions}</span>{" "}
                            <span className="text-danger">−{p.deletions}</span>
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="min-w-0 flex-1 overflow-y-auto p-3">
                {activeFile && hunks.length > 0 && finished ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-micro text-text-2">
                        {selectedHunkIds.length} of {hunks.length} hunks selected
                      </span>
                      <button
                        type="button"
                        disabled={selectedHunkIds.length === 0}
                        onClick={() =>
                          void applyRunHunks(activeFile, selectedHunkIds)
                        }
                        className="btn-accent rounded-[var(--radius-sm)] px-2.5 py-1 text-micro disabled:opacity-40"
                      >
                        Apply selected hunks
                      </button>
                    </div>
                    {hunks.map((h) => {
                      const checked = selectedHunkIds.includes(h.id);
                      const preview = h.lines
                        .filter((l) => l.startsWith("+") || l.startsWith("-"))
                        .slice(0, 6)
                        .join("\n");
                      return (
                        <label
                          key={h.id}
                          className="flex cursor-pointer gap-2 rounded-[var(--radius-sm)] border border-line bg-surface/40 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 shrink-0"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedHunkIds((prev) =>
                                e.target.checked
                                  ? [...prev, h.id]
                                  : prev.filter((id) => id !== h.id),
                              );
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-micro text-text-2">{h.header}</div>
                            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-mini text-text">
                              {preview || "(context only)"}
                            </pre>
                          </div>
                        </label>
                      );
                    })}
                    {parsed && (
                      <DiffViewer
                        file={activeFile}
                        removed={parsed.removed}
                        added={parsed.added}
                      />
                    )}
                  </div>
                ) : activeFile && parsed ? (
                  <DiffViewer file={activeFile} removed={parsed.removed} added={parsed.added} />
                ) : patch ? (
                  <div className="rounded-[var(--radius-md)] border border-line bg-surface px-5 py-4">
                    <div className="font-mono text-body-sm text-text">{patch.file}</div>
                    <div className="mt-1 text-mini">
                      <span className="text-ok">+{patch.additions}</span>{" "}
                      <span className="text-danger">−{patch.deletions}</span>
                    </div>
                  </div>
                ) : null}
              </div>
              </div>
              {finished && (
                <div className="flex flex-col gap-2 border-t border-line bg-surface/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-micro text-text-2">
                      {runApplySelection.length} of {files.length} selected for apply
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={runApplySelection.length === 0}
                        onClick={() => void discardRunSelection(runApplySelection)}
                        className="rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-text-2 hover:bg-elevated disabled:opacity-40"
                      >
                        Discard selected
                      </button>
                      <button
                        type="button"
                        onClick={() => void discardRunChanges()}
                        className="rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-text-2 hover:bg-elevated"
                      >
                        Discard all
                      </button>
                      <button
                        type="button"
                        disabled={runApplySelection.length === 0 || applyGate.blocked}
                        onClick={() => void applyRunChanges(runApplySelection)}
                        data-testid="ship-apply-primary"
                        className="btn-accent rounded-[var(--radius-sm)] px-2.5 py-1 text-micro disabled:opacity-40"
                      >
                        Apply first change
                      </button>
                    </div>
                  </div>
                  {applyGate.blocked && (
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-warn/30 bg-warn-soft/20 px-2.5 py-2"
                      data-testid="apply-validation-gate"
                    >
                      <p className="text-micro text-text-2">{applyGate.reason}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => validateRun()}
                          className="rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-text hover:bg-elevated"
                          data-testid="apply-gate-run-validation"
                        >
                          Run validation
                        </button>
                        <button
                          type="button"
                          disabled={runApplySelection.length === 0}
                          onClick={() =>
                            void applyRunChanges(runApplySelection, { validationOverride: true })
                          }
                          className="rounded-[var(--radius-sm)] border border-danger/40 px-2.5 py-1 text-micro text-danger hover:bg-danger/10 disabled:opacity-40"
                          data-testid="apply-gate-override"
                        >
                          Apply anyway (override)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

        {tab === "preview" &&
          (url ? (
            <iframe src={url} className="h-full w-full border-0 bg-white" title="Live preview" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <button
                onClick={() => startRunPreview()}
                className="btn-accent flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini"
              >
                <Play size={13} /> Start preview
              </button>
            </div>
          ))}

        {tab === "validation" && (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {checks && checks.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {checks.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-body-sm text-text-2">
                      <CheckIcon status={c.status} />
                      <span className="min-w-0 truncate">{c.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <EmptyState
                    icon={ListChecks}
                    title="No validation results yet"
                    description="Run validation to typecheck, lint, and build the changed workspace."
                    primaryAction={{ label: "Run validation", onClick: () => validateRun() }}
                  />
                </div>
              )}
            </div>
            <div className="border-t border-line bg-surface/60 px-4 py-2.5">
              <button
                onClick={() => validateRun()}
                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
              >
                <ListChecks size={12} /> Run validation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
