import { useApp } from "@renderer/state/store";
import { Card } from "@renderer/components/ui/Card";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { buildRevenueCloseout, rollupRevenueFunnel } from "@shared/cmoRevenuePlane";
import { rollupBudgetActuals } from "@shared/cmoBudgetPlane";

export function RevenuePlanePanel() {
  const profile = useApp((state) => state.revenueProfile ?? state.marketingProfile?.revenue_profile);
  const marketingProfile = useApp((state) => state.marketingProfile);
  const budgetPlan = useApp((state) => state.budgetPlan ?? state.marketingProfile?.budget_plan);
  const laneB = useApp((state) => state.laneBWorkspace);
  const distribution = useApp((state) => state.distributionOperator);
  const influencer = useApp((state) => state.influencerOperator);
  const delegate = useApp((state) => state.delegateOperator);
  const cadence = useApp((state) => state.opsCadence);
  const openAttribution = useApp((state) => state.openRevenueAttributionModal);

  if (!profile) return null;

  const budgetCloseout = budgetPlan
    ? rollupBudgetActuals(budgetPlan, marketingProfile, {
        laneB,
        laneC: marketingProfile?.lane_c_workspace,
        distribution,
        influencer,
        delegate,
        cadence,
      })
    : undefined;
  const closeout = buildRevenueCloseout(profile, marketingProfile?.manual_kpis, budgetCloseout);
  const funnel = rollupRevenueFunnel(profile, marketingProfile?.manual_kpis);
  const target = closeout.target;

  return (
    <Card data-testid="revenue-plane-panel" className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-body-sm font-semibold text-text">Revenue plane</h3>
          <p className="text-mini text-text-2">{profile.pricing_thesis.headline}</p>
          <p className="mt-1 text-[10px] uppercase text-text-3">
            {profile.pricing_thesis.model.replace(/_/g, " ")} · {profile.pricing_thesis.confidence}
          </p>
        </div>
        <Badge tone="neutral">{profile.payment_provider.replace(/_/g, " ")}</Badge>
      </div>

      <div className="mt-3 rounded bg-surface-2 p-2 text-[10px]">
        <div className="flex items-center justify-between text-text-2">
          <span>{target.label}</span>
          <span className="font-mono text-text">
            {target.current ?? "—"}/{target.target} · {target.confidence}
          </span>
        </div>
        {profile.mrr_usd != null && (
          <div className="mt-1 text-text-3">MRR ${profile.mrr_usd} · measured</div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {funnel.stages.map((stage) => (
          <div
            key={stage.id}
            className="grid grid-cols-[1fr_auto_auto] gap-2 rounded bg-surface-2 px-2 py-1.5 text-[10px]"
          >
            <span className="text-text">{stage.label}</span>
            <span className="text-text-2">
              {stage.count ?? "—"} · {stage.count_confidence}
            </span>
            <span className="text-text-3">
              {stage.conversion_confidence === "measured"
                ? `${stage.conversion_to_next_pct}% →`
                : "conv —"}
            </span>
          </div>
        ))}
      </div>

      {closeout.funnel.leak_label && (
        <p className="mt-2 text-[10px] text-warn">Leak: {closeout.funnel.leak_label}</p>
      )}

      <div className="mt-3 space-y-1">
        <p className="text-[10px] font-semibold uppercase text-text-3">Attribution</p>
        {closeout.attributions.slice(0, 6).map((row) => (
          <div
            key={row.source_id}
            className="flex items-center justify-between gap-2 rounded bg-surface-2 px-2 py-1.5 text-[10px]"
          >
            <span className="text-text">{row.source_label}</span>
            <span className="text-text-2">
              {row.paid_customers ?? "—"} paid
              {row.cac_confidence === "measured" ? ` · CAC $${row.cac_usd}` : " · CAC —"}
            </span>
            <Button size="sm" variant="ghost" onClick={() => openAttribution(row.source_id)}>
              Log
            </Button>
          </div>
        ))}
      </div>

      {closeout.ltv_cac_confidence === "measured" && (
        <p className="mt-2 text-[10px] text-text-2">
          LTV:CAC {closeout.ltv_cac_ratio}:1 · measured inputs only
        </p>
      )}

      <p className="mt-2 text-[10px] text-text-3">
        CAC and ROI require logged spend plus attributed paid customers. No invented revenue.
      </p>
    </Card>
  );
}
