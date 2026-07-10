import { ChevronRight } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { segmentTargetSurface, type StageSegment } from "./stageContext";
import { useStageContext } from "./useStageContext";

function SegmentButton({
  segment,
  isLast,
  onNavigate,
}: {
  segment: StageSegment;
  isLast: boolean;
  onNavigate: (segment: StageSegment) => void;
}) {
  const Icon = segment.icon;
  if (isLast) {
    return (
      <span className="flex min-w-0 items-center gap-1 truncate text-micro font-medium text-text">
        {Icon && <Icon size={12} className="shrink-0 text-text-3" />}
        <span className="truncate">{segment.label}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate(segment)}
      className="flex min-w-0 max-w-[140px] shrink-0 items-center gap-1 truncate text-micro text-text-2 transition-colors hover:text-accent"
    >
      {Icon && <Icon size={12} className="shrink-0 opacity-70" />}
      <span className="truncate">{segment.shortLabel ?? segment.label}</span>
    </button>
  );
}

export function StageBreadcrumb({ className = "" }: { className?: string }) {
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const resolvePlanDeepLink = useApp((s) => s.resolvePlanDeepLink);
  const navigate = useApp((s) => s.navigate);
  const activePlaybookId = useApp((s) => s.activePlaybookId);
  const setActivePlaybook = useApp((s) => s.setActivePlaybook);
  const { segments } = useStageContext();

  const onNavigate = (segment: StageSegment) => {
    if (segment.id === "project") {
      navigate("workspace");
      setActiveCanvas("empty");
      return;
    }
    if (segment.id.startsWith("playbook-")) {
      const playbookId = segment.id.replace("playbook-", "");
      const resolved = resolvePlanDeepLink({ playbookId });
      if (resolved) {
        focusPlanTask({ playbookId, taskId: resolved.taskId });
      } else {
        setActivePlaybook(playbookId);
        setWorkSurface("campaign-plan");
      }
      return;
    }
    if (segment.id.startsWith("task-")) {
      const taskId = segment.id.replace("task-", "");
      focusPlanTask({ taskId, playbookId: activePlaybookId ?? undefined });
      return;
    }
    const surface = segmentTargetSurface(segment.id);
    if (surface) {
      setWorkSurface(surface);
      return;
    }
    if (segment.id === "browser") {
      setActiveCanvas("browser");
    }
  };

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Stage location"
      className={`flex min-w-0 flex-wrap items-center gap-1 ${className}`}
    >
      {segments.map((segment, i) => (
        <span key={segment.id} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight size={11} className="shrink-0 text-text-3" />}
          <SegmentButton segment={segment} isLast={i === segments.length - 1} onNavigate={onNavigate} />
        </span>
      ))}
    </nav>
  );
}

export { resolveStageSegments, currentStageLabel } from "./stageContext";
