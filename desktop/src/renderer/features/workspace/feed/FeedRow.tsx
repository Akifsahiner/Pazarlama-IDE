import {
  AlertTriangle,
  Check,
  CircleDot,
  ExternalLink,
  FileCode2,
  FlaskConical,
  Globe,
  Loader2,
  ShieldQuestion,
  Wrench,
  X,
} from "lucide-react";
import type { FeedItem } from "@shared/feed";
import { Badge } from "@renderer/components/ui/Badge";

function iconFor(item: FeedItem) {
  if (item.isDemo) return FlaskConical;
  if (item.category === "gate") return ShieldQuestion;
  if (item.category === "analyze" || item.category === "verify") return AlertTriangle;
  if (item.category === "write") return FileCode2;
  if (item.category === "external") return ExternalLink;
  if (item.source === "browser" || item.source === "connector") return Globe;
  if (item.source === "agent-tool") return Wrench;
  if (item.status === "success") return Check;
  if (item.status === "failed") return X;
  return CircleDot;
}

function toneClass(item: FeedItem): string {
  if (item.status === "failed") return "text-danger";
  if (item.category === "gate" || item.status === "waiting") return "text-warn";
  if (item.status === "success") return "text-ok";
  if (item.status === "running") return "text-accent";
  return "text-text-3";
}

export function FeedRow({
  item,
  active,
  onClick,
}: {
  item: FeedItem;
  active?: boolean;
  onClick?: () => void;
}) {
  const Icon = item.status === "running" ? Loader2 : iconFor(item);
  const pulse = item.category === "gate" && item.status === "waiting";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-mini transition-colors ${
        active
          ? "bg-accent-soft/50 ring-1 ring-accent/30"
          : pulse
            ? "bg-warn/[0.06] hover:bg-warn/[0.1]"
            : "hover:bg-surface-2"
      }`}
    >
      <Icon
        size={13}
        className={`mt-0.5 shrink-0 ${toneClass(item)} ${item.status === "running" ? "animate-spin" : ""} ${pulse ? "animate-pulse" : ""}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-medium text-text-2">
          {item.title}
          {item.isDemo && (
            <Badge className="!px-1.5 !py-0 text-[9px] uppercase tracking-wide">Demo</Badge>
          )}
        </div>
        {item.summary && (
          <div className="mt-0.5 line-clamp-2 text-micro text-text-3">{item.summary}</div>
        )}
      </div>
      <time className="shrink-0 text-[10px] tabular-nums text-text-3">
        {new Date(item.ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </time>
    </button>
  );
}
