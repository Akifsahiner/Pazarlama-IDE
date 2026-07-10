import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Globe, RefreshCw, WifiOff } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { EmptyState } from "@renderer/components/EmptyState";
import { BrowserChrome } from "./BrowserChrome";
import { OperatorStage } from "./OperatorStage";
import { PhaseBadge } from "./PhaseBadge";
import { StepProgress } from "./StepProgress";
import { ControlBar } from "./ControlBar";
import { Filmstrip } from "./Filmstrip";
import { EvidenceDrawerV2 } from "./EvidenceDrawerV2";
import { ApprovalModalV2 } from "./ApprovalModalV2";
import { SafetyToasts, type SafetyEvent } from "./SafetyToasts";

/**
 * The Computer Use "Operator" — the single live-theater surface shared by the
 * dedicated browser canvas and the in-run stage. Reads browser state from the
 * global store and wires controls/approvals/steering back to it.
 */
export function Operator() {
  const browser = useApp((s) => s.browser);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const runtime = useApp((s) => s.runtime);
  const openConnectFlow = useApp((s) => s.openConnectFlow);
  const connected = runtime === "connected";
  const approve = useApp((s) => s.approve);
  const reject = useApp((s) => s.reject);
  const pauseBrowser = useApp((s) => s.pauseBrowser);
  const resumeBrowser = useApp((s) => s.resumeBrowser);
  const steerBrowser = useApp((s) => s.steerBrowser);
  const stopBrowser = useApp((s) => s.stopBrowser);
  const setAutoApprove = useApp((s) => s.setAutoApprove);
  const runBrowserTask = useApp((s) => s.runBrowserTask);
  const launchComposerAction = useApp((s) => s.launchComposerAction);

  const [selectedTs, setSelectedTs] = useState<string | undefined>(undefined);
  const [steerText, setSteerText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (browser.running && startRef.current === null) startRef.current = Date.now();
    if (!browser.running) startRef.current = null;
  }, [browser.running]);

  useEffect(() => {
    if (!browser.running) return;
    const t = setInterval(() => {
      if (startRef.current) setElapsed(Date.now() - startRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [browser.running]);

  // Resolve the frame to show: a pinned filmstrip frame, or the live latest.
  const pinned = selectedTs
    ? browser.frameHistory.find((f) => f.ts === selectedTs && f.pngBase64)
    : undefined;
  const shownFrame = pinned?.pngBase64 ?? browser.frame;

  // Single-story approvals: the modal already owns the pending decision, so no
  // duplicate "public action" toast alongside it.
  const safety = useMemo<SafetyEvent[]>(() => {
    const out: SafetyEvent[] = [];
    const s = browser.lastStatus?.toLowerCase() ?? "";
    if (s.includes("restricted") || s.includes("blocked navigation")) {
      out.push({ id: "blocked", kind: "blocked_site", detail: browser.url });
    }
    if (s.includes("credential")) out.push({ id: "cred", kind: "credential_blocked" });
    return out;
  }, [browser.lastStatus, browser.url]);

  const idle = !browser.running && !browser.frame;

  return (
    <div className="flex h-full flex-col">
      <BrowserChrome url={browser.url} title={browser.title} reloading={browser.phase === "acting"} />

      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface/60 px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <PhaseBadge phase={browser.phase} paused={browser.paused} />
          {browser.currentGoal && browser.running && (
            <p className="min-w-0 truncate text-micro text-text-2" title={browser.currentGoal}>
              {browser.currentGoal}
            </p>
          )}
        </div>
        <StepProgress step={browser.step} stepMax={browser.stepMax} elapsedMs={elapsed} />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <OperatorStage
          frame={shownFrame}
          prevFrame={selectedTs ? undefined : browser.prevFrame}
          phase={browser.phase}
          cursor={selectedTs ? undefined : browser.cursor}
          bbox={selectedTs ? undefined : browser.bbox}
          verb={selectedTs ? undefined : browser.actionVerb}
          running={browser.running}
          reducedMotion={reducedMotion}
        />

        {/* Idle / offline / failed states get designed placeholders with recovery. */}
        {idle && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg">
            {!connected ? (
              <EmptyState
                icon={WifiOff}
                title="Connect for browser tasks"
                description="Web research runs through your connected backend. Sign in or check connection settings."
                primaryAction={{ label: "Connect", onClick: openConnectFlow }}
              />
            ) : browser.lastError ? (
              <EmptyState
                icon={RefreshCw}
                title="Browser task failed"
                description={browser.lastError}
                primaryAction={
                  browser.currentGoal
                    ? { label: "Retry task", onClick: () => runBrowserTask(browser.currentGoal!) }
                    : undefined
                }
              />
            ) : (
              <EmptyState
                icon={Globe}
                title="No live session"
                description="Run a browser task — competitor teardowns, lead research, and site verification appear here live."
                primaryAction={{
                  label: "Start a browser task",
                  onClick: () => launchComposerAction({ mode: "browse" }),
                }}
              />
            )}
          </div>
        )}

        {browser.lastError && !idle && !browser.running && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 border-b border-danger-border bg-danger-soft px-4 py-2 text-mini text-danger">
            <span className="min-w-0 truncate">{browser.lastError}</span>
            {browser.currentGoal && (
              <button
                type="button"
                onClick={() => runBrowserTask(browser.currentGoal!)}
                className="flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-danger-border px-2 py-0.5 text-micro hover:brightness-110"
              >
                <RefreshCw size={11} /> Retry
              </button>
            )}
          </div>
        )}

        <EvidenceDrawerV2 findings={browser.findings} />
        {!browser.pendingApprovalId && <SafetyToasts events={safety} />}

        {browser.pendingApprovalId && browser.pendingSummary && (
          <ApprovalModalV2
            approvalId={browser.pendingApprovalId}
            summary={browser.pendingSummary}
            frame={browser.frame}
            bbox={browser.bbox}
            onApprove={approve}
            onReject={reject}
          />
        )}
      </div>

      {browser.paused && browser.running && (
        <div className="flex items-center gap-2 border-t border-warn/30 bg-warn/[0.06] px-3 py-2">
          <input
            value={steerText}
            onChange={(e) => setSteerText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && steerText.trim()) {
                steerBrowser(steerText.trim());
                setSteerText("");
              }
            }}
            placeholder="Tell the agent what to do next, then resume…"
            className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 py-1.5 text-body-sm text-text outline-none placeholder:text-text-3"
          />
          <button
            onClick={() => {
              if (steerText.trim()) {
                steerBrowser(steerText.trim());
                setSteerText("");
              } else {
                resumeBrowser();
              }
            }}
            className="btn-accent flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-mini"
          >
            <ArrowUp size={13} /> {steerText.trim() ? "Send & resume" : "Resume"}
          </button>
        </div>
      )}

      <Filmstrip
        frames={browser.frameHistory}
        selectedTs={selectedTs}
        onSelect={setSelectedTs}
        onLive={() => setSelectedTs(undefined)}
      />

      <ControlBar
        running={browser.running}
        paused={!!browser.paused}
        autoApprove={browser.autoApprove}
        onPause={pauseBrowser}
        onResume={resumeBrowser}
        onTakeOver={pauseBrowser}
        onStop={stopBrowser}
        onSetAuto={setAutoApprove}
      />
    </div>
  );
}
