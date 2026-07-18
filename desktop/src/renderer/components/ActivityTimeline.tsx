import {
  AlertTriangle,
  Check,
  CircleDot,
  FileCode2,
  Globe,
  ListTree,
  Loader2,
  ShieldQuestion,
  Wrench,
  X,
} from "lucide-react";
import type { RunEvent, RunEventType } from "@shared/types";
import { EmptyState } from "@renderer/components/EmptyState";

function iconFor(type: RunEventType) {
  if (type.startsWith("browser.")) return Globe;
  if (type.startsWith("file.")) return FileCode2;
  if (type.startsWith("tool.")) return Wrench;
  if (type === "approval.required") return ShieldQuestion;
  if (type === "issue.detected") return AlertTriangle;
  if (type === "run.completed") return Check;
  if (type === "run.failed") return X;
  return CircleDot;
}

/** Chronological strip of what happened in the run (newest at the bottom). */
export function ActivityTimeline({
  events,
  className,
}: {
  events: RunEvent[];
  className?: string;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={ListTree}
        title="No activity yet"
        description="Tool calls, file edits, and browser steps appear here as the run progresses."
        className="py-6"
      />
    );
  }

  return (
    <div className={className ?? "max-h-40 overflow-y-auto px-2 py-2"}>
      {events.map((e) => {
        const Icon = e.status === "running" ? Loader2 : iconFor(e.type);
        const tone =
          e.status === "failed"
            ? "text-danger"
            : e.status === "success"
              ? "text-ok"
              : e.type === "approval.required"
                ? "text-warn"
                : "text-text-3";
        const label = e.type === "approval.required" ? (e.summary ?? e.title) : e.title;
        const labelClass =
          e.type === "approval.required"
            ? "min-w-0 flex-1 break-all text-text-2 line-clamp-3"
            : "min-w-0 flex-1 truncate text-text-2";
        return (
          <div key={e.id} className="flex items-start gap-2 rounded px-2 py-1 text-mini">
            <Icon
              size={13}
              className={`mt-0.5 shrink-0 ${tone} ${e.status === "running" ? "animate-spin" : ""}`}
            />
            <span className={labelClass}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
