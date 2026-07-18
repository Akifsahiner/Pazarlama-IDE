import { useApp } from "@renderer/state/store";
import { Card } from "@renderer/components/ui/Card";
import { rollupBudgetActuals } from "@shared/cmoBudgetPlane";

export function BudgetPlanePanel() {
  const plan = useApp((s) => s.budgetPlan ?? s.marketingProfile?.budget_plan);
  const profile = useApp((s) => s.marketingProfile);
  const laneB = useApp((s) => s.laneBWorkspace);
  const distribution = useApp((s) => s.distributionOperator);
  const influencer = useApp((s) => s.influencerOperator);
  const delegate = useApp((s) => s.delegateOperator);
  const cadence = useApp((s) => s.opsCadence);
  if (!plan) return null;

  const closeout = rollupBudgetActuals(plan, profile, {
    laneB,
    laneC: profile?.lane_c_workspace,
    distribution,
    influencer,
    delegate,
    cadence,
  });
  const spent = closeout.reduce((sum, row) => sum + row.actual_spend_usd, 0);

  return (
    <Card data-testid="budget-plane-panel">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-body-sm font-semibold text-text">Budget plane</h3>
          <p className="text-mini text-text-2">
            ${plan.monthly_amount_usd}/mo · {plan.amount_confidence} · ${spent} actual logged
          </p>
        </div>
        <span className="rounded bg-surface-2 px-2 py-1 text-[10px] uppercase text-text-3">USD</span>
      </div>
      <div className="mt-3 space-y-1">
        {closeout.filter((row) => row.allocated_usd > 0).map((row) => {
          const allocation = plan.allocations.find((item) => item.bucket_id === row.bucket_id)!;
          return (
            <div key={row.bucket_id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 rounded bg-surface-2 px-2 py-1.5 text-[10px]">
              <span className="text-text">{row.bucket_id.replace(/_/g, " ")}</span>
              <span className="text-text-2">${row.actual_spend_usd}/${row.allocated_usd}</span>
              <span className="text-text-3">cap ${allocation.weekly_cap_usd}/wk</span>
              <span className="text-text-2">
                {row.cpa_confidence === "measured" ? `CPA $${row.cpa_usd} measured` : "CPA —"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-text-3">
        Estimate and actual are separate. No revenue or ROI is inferred.
      </p>
    </Card>
  );
}
