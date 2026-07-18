import { Badge } from "@renderer/components/ui/Badge";

export function ThesisChip({
  title,
  headline,
  compact,
}: {
  title: string;
  headline: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-accent/25 bg-accent-soft/10 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
      data-testid="quick-start-thesis-line"
    >
      <Badge tone="accent">{title}</Badge>
      <p className={`${compact ? "text-mini" : "text-body-sm"} text-text-2`}>{headline}</p>
    </div>
  );
}
