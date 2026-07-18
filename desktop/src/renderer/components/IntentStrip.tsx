import { Loader2, Square } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { RunStatus } from "@shared/types";
import { detectSkill } from "@renderer/features/workspace/operator/capabilities";

const STATUS_LABEL: Record<RunStatus, string> = {
  created: "Starting",
  planning: "Planning",
  running: "Running",
  paused: "Stopped",
  completed: "Complete",
  failed: "Failed",
};

function elapsed(startedAt: number): string {
  const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * The single line above the Execution Canvas that tells the user what the agent
 * is doing right now — a short intent summary, never raw chain-of-thought.
 */
export function IntentStrip() {
  const run = useApp((s) => s.run);
  const browser = useApp((s) => s.browser);
  const interruptRun = useApp((s) => s.interruptRun);
  const stopBrowser = useApp((s) => s.stopBrowser);
  if (!run && !browser.running) return null;

  const browseActive = browser.running || run?.kind === "browse";
  const active = browseActive
    ? browser.running
    : !!run && (run.status === "running" || run.status === "planning" || run.status === "created");
  const goal = browser.currentGoal ?? run?.intent ?? run?.goal ?? "Working…";
  const skill = detectSkill(`${run?.intent ?? ""} ${goal}`);
  const statusLabel = browseActive
    ? browser.running
      ? browser.phase === "acting"
        ? "Acting"
        : browser.phase === "verifying"
          ? "Verifying"
          : "Browsing"
      : "Idle"
    : run
      ? STATUS_LABEL[run.status]
      : "Idle";

  return (
    <div className="flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-2 backdrop-blur-sm">
      {active ? (
        <Loader2 size={14} className="shrink-0 animate-spin text-accent" />
      ) : (
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            run?.status === "failed" || browser.lastError ? "bg-danger" : "bg-ok"
          }`}
        />
      )}
      {browseActive && (
        <span className="shrink-0 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10.5px] text-accent">
          Computer Use
        </span>
      )}
      {skill && !browseActive && (
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] ${
            skill.category === "Sales"
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-line bg-surface-2 text-text-2"
          }`}
        >
          {skill.category} · {skill.label}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-body-sm text-text">{goal}</span>
      <span className="shrink-0 text-micro uppercase tracking-wide text-text-3">
        {statusLabel}
        {run ? ` · ${elapsed(run.startedAt)}` : ""}
      </span>
      {active && (
        <button
          onClick={() => (browseActive ? stopBrowser() : interruptRun())}
          className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
        >
          <Square size={12} /> Stop
        </button>
      )}
    </div>
  );
}
