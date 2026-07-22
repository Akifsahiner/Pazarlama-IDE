import { ArrowRight } from "lucide-react";
import type { ResolvedFirstRunAction } from "@shared/northStarFunnel";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";

/** Single primary CTA — north star "one next action" rule. */
export function OneNextActionCard({
  action,
  onPrimary,
  onTertiary,
  testId = "one-next-action",
}: {
  action: ResolvedFirstRunAction;
  onPrimary: () => void;
  onTertiary?: () => void;
  testId?: string;
}) {
  return (
    <Card
      className="border-accent/30 bg-gradient-to-br from-accent-soft/20 to-surface p-5"
      data-testid={testId}
      role="region"
      aria-label="Your next action"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <Badge tone="accent">{action.eyebrow}</Badge>
          <h2 className="mt-2 text-h3 text-text">{action.title}</h2>
          <p className="mt-1 max-w-[52ch] text-body-sm text-text-2">{action.reason}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Button
            variant="primary"
            size="md"
            iconRight={<ArrowRight size={15} />}
            onClick={onPrimary}
            data-testid={`${testId}-primary`}
          >
            {action.primaryLabel}
          </Button>
          {action.tertiaryLabel && onTertiary && (
            <button
              type="button"
              onClick={onTertiary}
              className="text-mini text-text-3 underline-offset-2 hover:text-text-2 hover:underline"
              data-testid={`${testId}-tertiary`}
            >
              {action.tertiaryLabel}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
