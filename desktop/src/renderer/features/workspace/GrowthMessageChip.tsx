import type { GrowthMessageRecord } from "@shared/cmoGrowthMemory";
import { Badge } from "@renderer/components/ui/Badge";

export function GrowthMessageChip({
  message,
}: {
  message: Pick<GrowthMessageRecord, "label" | "verdict">;
}) {
  const tone =
    message.verdict === "winner"
      ? "ok"
      : message.verdict === "loser"
        ? "danger"
        : message.verdict === "neutral"
          ? "neutral"
          : "warn";
  return (
    <span data-testid="growth-message-chip">
      <Badge tone={tone}>
        {message.verdict} · {message.label}
      </Badge>
    </span>
  );
}
