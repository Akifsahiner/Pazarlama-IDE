import { PanelRightOpen } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { ResizablePanel } from "@renderer/components/ResizablePanel";
import { ResizableVerticalPanel } from "@renderer/components/ResizableVerticalPanel";
import { ContextSidebar } from "@renderer/features/workspace/ContextSidebar";
import { SessionHistory } from "@renderer/features/history/SessionHistory";
import { Canvas } from "@renderer/features/workspace/Canvas";
import { AgentThread } from "@renderer/features/agent/AgentThread";
import { ExecutionFeed } from "@renderer/features/workspace/ExecutionFeed";
import { StageBreadcrumb } from "@renderer/features/workspace/stage/StageBreadcrumb";
import { Composer } from "@renderer/features/agent/Composer";
import { SalesExportBar } from "@renderer/features/workspace/SalesExportBar";
import { ExecutionQueuePanel } from "@renderer/features/workspace/ExecutionQueuePanel";
import { NextActionBar } from "@renderer/components/NextActionBar";
import { WorkspaceHandoffBanner } from "@renderer/components/WorkspaceHandoffBanner";
import { HandoffConfirmModal } from "@renderer/components/HandoffConfirmModal";

export function Workspace() {
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed);
  const historyOpen = useApp((s) => s.historyOpen);
  const toggleHistory = useApp((s) => s.toggleHistory);
  const focusMode = useApp((s) => s.focusMode);
  const toggleFocusMode = useApp((s) => s.toggleFocusMode);
  const feedCollapsed = useApp((s) => s.feedCollapsed);

  return (
    <div className="relative flex h-full min-h-0 flex-1">
      <HandoffConfirmModal />
      {/* History overlays the left rail instead of replacing it — workspace
          context stays where it was when the panel closes. */}
      {historyOpen && (
        <div className="absolute left-0 top-0 z-[var(--z-overlay)] h-full w-64 border-r border-line shadow-[var(--shadow-3)]">
          <SessionHistory onClose={() => toggleHistory(false)} />
        </div>
      )}

      {!sidebarCollapsed && !focusMode && (
        <ResizablePanel
          side="left"
          storageKey="panel.project-rail"
          defaultWidth={280}
          min={240}
          max={360}
        >
          <ContextSidebar />
        </ResizablePanel>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHandoffBanner />
        <NextActionBar scope="workspace" />
        <SalesExportBar />
        <ExecutionQueuePanel />
        <div className="relative flex min-h-0 flex-1">
          <div className="relative flex h-full min-h-0 min-w-0 flex-1">
            <Canvas />
            {focusMode && (
              <button
                onClick={() => toggleFocusMode(false)}
                title="Exit focus mode"
                className="app-no-drag absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line bg-surface/90 px-2.5 py-1 text-label text-text-2 backdrop-blur-sm transition-colors hover:bg-elevated hover:text-text"
              >
                <PanelRightOpen size={13} /> Show conversation
              </button>
            )}
          </div>

          {!focusMode && (
            <ResizablePanel
              side="right"
              storageKey="panel.agent"
              defaultWidth={380}
              min={320}
              max={560}
            >
              <AgentThread />
            </ResizablePanel>
          )}
        </div>

        {focusMode && (
          <div className="shrink-0 border-t border-line bg-surface">
            <div className="px-4 pt-2">
              <StageBreadcrumb />
            </div>
            <Composer />
          </div>
        )}

        {focusMode || feedCollapsed ? (
          <ExecutionFeed mini={focusMode} />
        ) : (
          <ResizableVerticalPanel
            storageKey="panel.execution-feed"
            defaultHeight={200}
            min={120}
            max={320}
          >
            <ExecutionFeed />
          </ResizableVerticalPanel>
        )}
      </div>
    </div>
  );
}
