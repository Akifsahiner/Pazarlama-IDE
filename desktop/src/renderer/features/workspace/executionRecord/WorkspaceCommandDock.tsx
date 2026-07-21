import { ChevronUp, Maximize2, MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useApp } from "@renderer/state/store";
import { ResizableVerticalPanel } from "@renderer/components/ResizableVerticalPanel";
import { AgentThread } from "@renderer/features/agent/AgentThread";
import { Composer } from "@renderer/features/agent/Composer";
import { spring } from "@renderer/design/animations";

function isRunActive(run: ReturnType<typeof useApp.getState>["run"]): boolean {
  return (
    run?.status === "running" ||
    run?.status === "planning" ||
    run?.status === "created"
  );
}

/**
 * Cursor-style bottom command dock — resizable when expanded, composer strip when collapsed.
 * Auto-collapses when a run starts so the artifact workspace breathes.
 */
export function WorkspaceCommandDock() {
  const run = useApp((s) => s.run);
  const focusMode = useApp((s) => s.focusMode);
  const collapsed = useApp((s) => s.commandDockCollapsed);
  const setCommandDockCollapsed = useApp((s) => s.setCommandDockCollapsed);
  const setExecutionHeroExpanded = useApp((s) => s.setExecutionHeroExpanded);
  const toggleFocusMode = useApp((s) => s.toggleFocusMode);
  const agentStreaming = useApp((s) => s.agentStreaming);

  const runActive = isRunActive(run);
  const wasRunActive = useRef(false);
  const autoCollapsedForRun = useRef(false);

  useEffect(() => {
    if (runActive && !wasRunActive.current) {
      setCommandDockCollapsed(true);
      setExecutionHeroExpanded(false);
      autoCollapsedForRun.current = true;
    } else if (!runActive && wasRunActive.current) {
      setExecutionHeroExpanded(true);
      if (autoCollapsedForRun.current) {
        setCommandDockCollapsed(false);
        autoCollapsedForRun.current = false;
      }
    }
    wasRunActive.current = runActive;
  }, [runActive, setCommandDockCollapsed, setExecutionHeroExpanded]);

  const showMessages = !collapsed && !focusMode;
  const expandDock = () => setCommandDockCollapsed(false);

  if (!showMessages) {
    return (
      <motion.div
        layout
        transition={spring}
        className="shrink-0 border-t border-line bg-surface/95 backdrop-blur-md"
        data-testid="workspace-command-dock"
        data-collapsed="true"
      >
        <div className="flex items-center justify-between gap-2 border-b border-line/40 px-3 py-1.5">
          <button
            type="button"
            onClick={expandDock}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-micro font-medium text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            <ChevronUp size={13} className="text-accent" />
            Expand command
            <kbd className="ml-1 hidden rounded border border-line/80 bg-surface px-1 py-px text-[9px] font-medium text-text-3 sm:inline">
              ⌘J
            </kbd>
            {agentStreaming && (
              <span className="ml-1 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            )}
          </button>
          <div className="flex items-center gap-2">
            {runActive && (
              <span className="hidden items-center gap-1.5 text-micro text-text-3 sm:inline-flex">
                <MessageSquare size={12} />
                Run active — workspace has priority
              </span>
            )}
            {focusMode && (
              <button
                type="button"
                onClick={() => toggleFocusMode(false)}
                className="inline-flex items-center gap-1 text-micro text-accent hover:underline"
              >
                <Maximize2 size={12} /> Show chat
              </button>
            )}
          </div>
        </div>
        <Composer variant="dock" onExpandRequest={expandDock} />
      </motion.div>
    );
  }

  return (
    <div className="shrink-0" data-testid="workspace-command-dock" data-collapsed="false">
      <ResizableVerticalPanel
        storageKey="panel.command-dock"
        defaultHeight={300}
        min={160}
        max={520}
      >
        <AgentThread
          layout="bottom"
          onCollapse={() => setCommandDockCollapsed(true)}
          onFocusArtifact={() => toggleFocusMode(true)}
        />
      </ResizableVerticalPanel>
    </div>
  );
}
