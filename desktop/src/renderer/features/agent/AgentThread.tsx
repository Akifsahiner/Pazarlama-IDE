import { History, PanelRightClose, Sparkles } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { WORK_SURFACE_META, normalizeToWorkSurface } from "@shared/workSurfaces";
import { IconButton } from "@renderer/components/ui/IconButton";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { CampaignTimeline } from "./CampaignTimeline";
import { useStageContext } from "@renderer/features/workspace/stage/useStageContext";

function conversationSubtitle(
  surface: ReturnType<typeof normalizeToWorkSurface>,
  mode: string,
): string {
  if (surface) return WORK_SURFACE_META[surface].description;
  if (mode === "run") return "Direct the agent while it edits or validates your project.";
  if (mode === "browser") return "Steer research tasks and approve browser actions.";
  return "Steer strategy, budgets, tone, and approvals — the work happens in the stage.";
}

export function AgentThread() {
  const toggleFocusMode = useApp((s) => s.toggleFocusMode);
  const toggleHistory = useApp((s) => s.toggleHistory);
  const historyOpen = useApp((s) => s.historyOpen);
  const canvas = useApp((s) => s.canvas);
  const surface = normalizeToWorkSurface(canvas.mode);

  const { stageLabel } = useStageContext();

  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-label font-medium text-text">
            <Sparkles size={14} className="text-accent" />
            Conversation
          </div>
          <div className="flex items-center gap-0.5">
            <IconButton
              label="Session history (Ctrl+H)"
              size="sm"
              active={historyOpen}
              onClick={() => toggleHistory()}
            >
              <History size={14} />
            </IconButton>
            <IconButton
              label="Focus mode — hide this panel"
              size="sm"
              onClick={() => toggleFocusMode(true)}
            >
              <PanelRightClose size={14} />
            </IconButton>
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-micro leading-relaxed text-text-3">
          {conversationSubtitle(surface, canvas.mode)}
        </p>
        {stageLabel && (
          <p className="mt-1.5 truncate text-[10px] uppercase tracking-wide text-text-3" title={stageLabel}>
            Stage · {stageLabel}
          </p>
        )}
      </div>
      <CampaignTimeline />
      <MessageList />
      <Composer />
    </aside>
  );
}
