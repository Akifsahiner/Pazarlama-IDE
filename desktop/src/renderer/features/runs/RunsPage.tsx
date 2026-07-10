import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  History,
  Loader2,
  PenLine,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { ArchiveRunItem } from "@shared/runs";
import { Page } from "@renderer/components/ui/Page";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { EmptyState } from "@renderer/components/EmptyState";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { Segmented } from "@renderer/components/ui/Segmented";
import { Skeleton } from "@renderer/components/Skeleton";

type Filter = "all" | "edit" | "browse";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const then = new Date(d);
  then.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - then.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function groupByDay(items: ArchiveRunItem[]): { label: string; items: ArchiveRunItem[] }[] {
  const map = new Map<string, ArchiveRunItem[]>();
  for (const item of items) {
    const label = dayLabel(item.created_at);
    const list = map.get(label) ?? [];
    list.push(item);
    map.set(label, list);
  }
  return [...map.entries()].map(([label, groupItems]) => ({ label, items: groupItems }));
}

function kindIcon(kind: ArchiveRunItem["kind"]) {
  if (kind === "browse") return Globe;
  if (kind === "ask") return History;
  return PenLine;
}

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  running: "Running",
  planning: "Planning",
  created: "Starting",
  paused: "Paused",
};

const KIND_LABEL: Record<string, string> = {
  edit: "Edit project",
  browse: "Browse web",
  ask: "Ask",
};

function RunCard({
  item,
  onReplay,
  onPlanTask,
}: {
  item: ArchiveRunItem;
  onReplay: () => void;
  onPlanTask?: () => void;
}) {
  const Icon = kindIcon(item.kind);
  const summary = item.summary_json;
  const stats = [
    summary.filesChanged != null ? `${summary.filesChanged} files` : null,
    summary.findingsCount != null ? `${summary.findingsCount} findings` : null,
    summary.browserSteps != null ? `${summary.browserSteps} steps` : null,
    relativeTime(item.created_at),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card padded={false}>
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 shrink-0">
          {item.status === "completed" ? (
            <CheckCircle2 size={18} className="text-ok" />
          ) : item.status === "failed" ? (
            <XCircle size={18} className="text-danger" />
          ) : (
            <Loader2 size={18} className="animate-spin text-accent" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-body font-medium text-text">{item.goal}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge
              tone={
                item.status === "failed" ? "danger" : item.status === "completed" ? "ok" : "accent"
              }
            >
              {STATUS_LABEL[item.status] ?? item.status}
            </Badge>
            <Badge tone="neutral">
              <Icon size={11} className="mr-1 inline" />
              {KIND_LABEL[item.kind] ?? item.kind}
            </Badge>
            {item.source === "local" && <Badge tone="neutral">Local</Badge>}
            {item.plan_task_id && onPlanTask && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlanTask();
                }}
                className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-accent hover:bg-elevated"
              >
                Open plan task
              </button>
            )}
          </div>
          <div className="mt-1 text-caption text-text-3">{stats}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onReplay} iconRight={<ArrowRight size={14} />}>
          Replay
        </Button>
      </div>
    </Card>
  );
}

export function RunsPage() {
  const run = useApp((s) => s.run);
  const project = useApp((s) => s.project);
  const runsArchive = useApp((s) => s.runsArchive);
  const loading = useApp((s) => s.runsArchiveLoading);
  const error = useApp((s) => s.runsArchiveError);
  const loadRunsArchive = useApp((s) => s.loadRunsArchive);
  const openRunReplay = useApp((s) => s.openRunReplay);
  const openPlanTaskFromArchive = useApp((s) => s.openPlanTaskFromArchive);
  const navigate = useApp((s) => s.navigate);
  const openProjectPicker = useApp((s) => s.openProjectPicker);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return runsArchive;
    return runsArchive.filter((r) => r.kind === filter);
  }, [runsArchive, filter]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const hasLocalOnly =
    runsArchive.length > 0 && runsArchive.every((r) => r.source === "local");

  return (
    <Page
      title="Runs"
      eyebrow="Activity"
      actions={
        <Button variant="ghost" size="sm" onClick={() => void loadRunsArchive()} iconLeft={<RefreshCw size={14} />}>
          Refresh
        </Button>
      }
    >
      <div className="mb-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "edit", label: "Edit project" },
            { value: "browse", label: "Browse web" },
          ]}
        />
      </div>

      {run &&
        (run.status === "running" ||
          run.status === "planning" ||
          run.status === "created" ||
          run.status === "paused") && (
          <div className="mb-6">
            <h2 className="mb-2 text-caption font-semibold uppercase tracking-wider text-text-3">
              In progress
            </h2>
            <Card padded={false}>
              <button
                onClick={() => navigate("workspace")}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <Loader2 size={18} className="animate-spin text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body font-medium text-text">{run.goal}</div>
                  <Badge tone="accent" className="mt-1">
                    {run.status}
                  </Badge>
                </div>
                <ArrowRight size={16} className="text-text-3" />
              </button>
            </Card>
          </div>
        )}

      {loading && runsArchive.length === 0 && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5 p-4">
          <p className="text-body-sm text-danger">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => void loadRunsArchive()}>
            Retry
          </Button>
        </Card>
      )}

      {!project && !loading && (
        <div className="flex h-[50vh] items-center justify-center">
          <EmptyState
            icon={History}
            title="Open a project"
            description="Runs are scoped to your active project. Open one to see edit and browse history."
            primaryAction={{ label: "Open project", onClick: openProjectPicker }}
          />
        </div>
      )}

      {project && !loading && filtered.length === 0 && !error && (
        <div className="flex h-[50vh] items-center justify-center">
          <GuidedEmptyState
            icon={History}
            title="No archived runs yet"
            description="Completed agent runs appear here with replay."
            steps={[
              "Open workspace and start an Edit or Browse task",
              "Review diffs and browser findings as they complete",
              "Runs archive here automatically for replay",
            ]}
            primaryAction={{ label: "Open workspace", onClick: () => navigate("workspace") }}
          />
        </div>
      )}

      {hasLocalOnly && (
        <p className="mb-4 text-body-sm text-text-3">
          Showing local archive — enable cloud persistence in{" "}
          <button onClick={() => navigate("settings")} className="text-accent hover:underline">
            Settings
          </button>{" "}
          to sync across devices.
        </p>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="mb-2 text-caption font-semibold uppercase tracking-wider text-text-3">
              {group.label}
            </h2>
            <div className="space-y-2">
              {group.items.map((item) => (
                <RunCard
                  key={item.id}
                  item={item}
                  onReplay={() => void openRunReplay(item.id)}
                  onPlanTask={
                    item.plan_task_id
                      ? () => openPlanTaskFromArchive(item.plan_task_id!)
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Page>
  );
}
