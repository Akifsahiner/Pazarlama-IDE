import { HUMAN_EXECUTION_CONTRACT, humanTaskHint } from "@shared/humanExecutionContract";
import { Card } from "@renderer/components/ui/Card";

/** Surfaces Lane B contract — we prepare, founder publishes. */
export function HumanExecutionContractBanner({
  owner,
  compact,
}: {
  owner?: string;
  compact?: boolean;
}) {
  const hint = humanTaskHint(owner);
  return (
    <Card
      className={`border-line bg-surface-2 ${compact ? "p-3" : "p-4"}`}
      data-testid="human-execution-contract"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
        {HUMAN_EXECUTION_CONTRACT.headline}
      </p>
      <p className={`mt-1 text-text-2 ${compact ? "text-mini" : "text-body-sm"}`}>
        {hint ?? HUMAN_EXECUTION_CONTRACT.body}
      </p>
    </Card>
  );
}
