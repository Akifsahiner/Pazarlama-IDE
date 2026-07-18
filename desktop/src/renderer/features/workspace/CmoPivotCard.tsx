import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRight, RefreshCw, RotateCcw, TrendingUp, X, Loader2 } from "lucide-react";
import type { CmoPivotSuggestion } from "@shared/cmoOpsCadence";
import type { DistributionVerdict } from "@shared/cmoDistributionOperator";
import type { InfluencerVerdict } from "@shared/cmoInfluencerOperator";
import type { DelegateVerdict } from "@shared/cmoDelegateOperator";
import { channelThesisTitle } from "@shared/cmoIntake";
import { weekLabel } from "@shared/cmoContinuous";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { useApp } from "@renderer/state/store";
import { rollupBudgetActuals } from "@shared/cmoBudgetPlane";
import { buildRevenueCloseout } from "@shared/cmoRevenuePlane";
import { buildRevenueWeekReviewNudge, evaluateWeek1MetricsWithGa4Priority, hasGa4Connected } from "@shared/cmoProofLoop";

export function DistributionVerdictCard({ verdict }: { verdict: DistributionVerdict }) {
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const navigate = useApp((s) => s.navigate);
  const cadence = useApp((s) => s.opsCadence);
  const nextWeek = weekLabel((cadence?.week_index ?? 1) + 1);

  const tone =
    verdict.kind === "kill" ? "warn" : verdict.kind === "double_down" ? "ok" : "accent";

  return (
    <Card
      className="mt-4 border-accent/30 bg-accent-soft/10"
      data-testid="distribution-verdict-card"
      role="region"
      aria-label="Distribution hook verdict"
    >
      <div className="flex items-center gap-2">
        <TrendingUp size={14} className="text-accent" />
        <Badge tone={tone}>
          {verdict.kind === "double_down"
            ? "Double down"
            : verdict.kind === "scale"
              ? "Scale hook"
              : verdict.kind === "kill"
                ? "Kill hook"
                : "Hook test"}
        </Badge>
      </div>
      <h3 className="mt-2 text-body-sm font-semibold text-text">{verdict.headline}</h3>
      <ul className="mt-2 space-y-1">
        {verdict.rationale.map((r) => (
          <li key={r} className="text-mini text-text-2">
            · {r}
          </li>
        ))}
      </ul>
      {(verdict.kind === "double_down" || verdict.kind === "scale") && (
        <div className="mt-3">
          <Button
            variant="primary"
            size="sm"
            iconLeft={<RefreshCw size={12} />}
            onClick={() => {
              startNextCmoCycle({ mode: "double_down" });
              navigate("workspace");
            }}
          >
            {nextWeek} — double down on winning hook
          </Button>
        </div>
      )}
    </Card>
  );
}

export function InfluencerVerdictCard({ verdict }: { verdict: InfluencerVerdict }) {
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const navigate = useApp((s) => s.navigate);
  const cadence = useApp((s) => s.opsCadence);
  const nextWeek = weekLabel((cadence?.week_index ?? 1) + 1);

  const tone =
    verdict.kind === "kill" ? "warn" : verdict.kind === "double_down" ? "ok" : "accent";

  return (
    <Card
      className="mt-4 border-accent/30 bg-accent-soft/10"
      data-testid="influencer-verdict-card"
      role="region"
      aria-label="Influencer pitch verdict"
    >
      <div className="flex items-center gap-2">
        <TrendingUp size={14} className="text-accent" />
        <Badge tone={tone}>
          {verdict.kind === "double_down"
            ? "Double down"
            : verdict.kind === "scale"
              ? "Scale pitch"
              : verdict.kind === "kill"
                ? "Kill pitch"
                : "Pitch test"}
        </Badge>
      </div>
      <h3 className="mt-2 text-body-sm font-semibold text-text">{verdict.headline}</h3>
      <ul className="mt-2 space-y-1">
        {verdict.rationale.map((r) => (
          <li key={r} className="text-mini text-text-2">
            · {r}
          </li>
        ))}
      </ul>
      {(verdict.kind === "double_down" || verdict.kind === "scale") && (
        <div className="mt-3">
          <Button
            variant="primary"
            size="sm"
            iconLeft={<RefreshCw size={12} />}
            onClick={() => {
              startNextCmoCycle({ mode: "double_down" });
              navigate("workspace");
            }}
          >
            {nextWeek} — double down on winning pitch
          </Button>
        </div>
      )}
    </Card>
  );
}

export function DelegateVerdictCard({ verdict }: { verdict: DelegateVerdict }) {
  const tone =
    verdict.kind === "release"
      ? "warn"
      : verdict.kind === "promote"
        ? "ok"
        : verdict.kind === "extend"
          ? "accent"
          : "neutral";

  return (
    <Card
      className="mt-4 border-warn/30 bg-warn-soft/10"
      data-testid="delegate-verdict-card"
      role="region"
      aria-label="Delegate performance verdict"
    >
      <div className="flex items-center gap-2">
        <TrendingUp size={14} className="text-warn" />
        <Badge tone={tone}>
          {verdict.kind === "promote"
            ? "Promote contractor"
            : verdict.kind === "extend"
              ? "Extend trial"
              : verdict.kind === "release"
                ? "Release contractor"
                : "Delegate on track"}
        </Badge>
      </div>
      <h3 className="mt-2 text-body-sm font-semibold text-text">{verdict.headline}</h3>
      <ul className="mt-2 space-y-1">
        {verdict.rationale.map((r) => (
          <li key={r} className="text-mini text-text-2">
            · {r}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function CmoPivotCard({ pivot }: { pivot: CmoPivotSuggestion }) {
  const dismissPivot = useApp((s) => s.dismissPivotSuggestion);
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const cadence = useApp((s) => s.opsCadence);
  const navigate = useApp((s) => s.navigate);

  if (pivot.dismissed_at) return null;

  const tone =
    pivot.verdict === "flat" ? "warn" : pivot.verdict === "promising" ? "ok" : "neutral";
  const nextWeek = weekLabel((cadence?.week_index ?? 1) + 1);
  const primaryThesis = pivot.suggested_thesis_ids[0];

  return (
    <Card
      className="mt-4 border-warn/30 bg-warn-soft/10"
      data-testid="cmo-pivot-card"
      role="region"
      aria-label="CMO pivot suggestion"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-warn" />
          <Badge tone={tone}>{pivot.verdict === "flat" ? "Pivot signal" : "Measure gap"}</Badge>
        </div>
        <button
          type="button"
          className="text-text-3 hover:text-text"
          onClick={dismissPivot}
          aria-label="Dismiss pivot"
        >
          <X size={14} />
        </button>
      </div>
      <h3 className="mt-2 text-body-sm font-semibold text-text">{pivot.headline}</h3>
      <ul className="mt-2 space-y-1">
        {pivot.rationale.map((r) => (
          <li key={r} className="text-mini text-text-2">
            · {r}
          </li>
        ))}
      </ul>
      {pivot.suggested_thesis_ids.length > 0 && (
        <p className="mt-2 text-[10px] text-text-3">
          <span className="font-semibold">Consider:</span>{" "}
          {pivot.suggested_thesis_ids.map((id) => channelThesisTitle(id)).join(" · ")}
        </p>
      )}
      <ul className="mt-2 space-y-0.5">
        {pivot.suggested_actions.map((a) => (
          <li key={a} className="text-[10px] text-accent">
            → {a}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {primaryThesis && pivot.verdict === "flat" && (
          <Button
            variant="primary"
            size="sm"
            iconLeft={<ArrowRight size={12} />}
            data-testid="cmo-pivot-start"
            onClick={() => {
              startNextCmoCycle({ thesisId: primaryThesis, mode: "pivot" });
              navigate("workspace");
            }}
          >
            Start {nextWeek} — {channelThesisTitle(primaryThesis)}
          </Button>
        )}
        {pivot.verdict !== "insufficient_data" && (
        <Button
          variant={primaryThesis && pivot.verdict === "flat" ? "secondary" : "primary"}
          size="sm"
          iconLeft={<RefreshCw size={12} />}
          data-testid="cmo-pivot-double-down"
          onClick={() => {
            startNextCmoCycle({ mode: "double_down" });
            navigate("workspace");
          }}
        >
          Double down — same channel
        </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<RotateCcw size={12} />}
          onClick={dismissPivot}
        >
          Dismiss
        </Button>
      </div>
    </Card>
  );
}

export function CmoWeekReviewModal() {
  const open = useApp((s) => s.pendingWeekReviewOpen);
  const cadence = useApp((s) => s.opsCadence);
  const profile = useApp((s) => s.marketingProfile);
  const channelThesis = useApp((s) => s.channelThesis ?? profile?.channel_thesis);
  const budgetPlan = useApp((s) => s.budgetPlan ?? profile?.budget_plan);
  const revenueProfile = useApp((s) => s.revenueProfile ?? profile?.revenue_profile);
  const laneB = useApp((s) => s.laneBWorkspace);
  const distribution = useApp((s) => s.distributionOperator);
  const influencer = useApp((s) => s.influencerOperator);
  const delegate = useApp((s) => s.delegateOperator);
  const dismiss = useApp((s) => s.dismissWeekReviewModal);
  const complete = useApp((s) => s.completeOpsWeekReview);
  const syncGa4Metrics = useApp((s) => s.syncGa4Metrics);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ga4Syncing, setGa4Syncing] = useState(false);

  useEffect(() => {
    if (!open || !cadence) return;
    if (!hasGa4Connected(profile)) return;
    setGa4Syncing(true);
    void syncGa4Metrics().finally(() => setGa4Syncing(false));
  }, [open, cadence?.id, profile?.ga4_oauth?.connected_at]);

  if (!open || !cadence) return null;

  const assessment = evaluateWeek1MetricsWithGa4Priority(
    cadence,
    profile,
    channelThesis,
    distribution ?? profile?.distribution_operator,
    influencer ?? profile?.influencer_operator,
    delegate ?? profile?.delegate_operator,
  );

  const wl = weekLabel(cadence.week_index);
  const budgetCloseout = budgetPlan
    ? rollupBudgetActuals(budgetPlan, profile, {
        laneB,
        laneC: profile?.lane_c_workspace,
        distribution,
        influencer,
        delegate,
        cadence,
      })
    : [];
  const revenueCloseout = revenueProfile
    ? buildRevenueCloseout(revenueProfile, profile?.manual_kpis, budgetCloseout)
    : null;
  const revenueNudge = buildRevenueWeekReviewNudge(profile, revenueProfile);

  const handleSubmit = () => {
    const err = complete(summary);
    if (err) {
      setError(err);
      return;
    }
    setSummary("");
    setError(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="cmo-week-review-modal"
    >
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <h2 className="text-body-sm font-semibold text-text">{wl} review</h2>
        <p className="mt-1 text-mini text-text-2">
          {channelThesis?.title ?? wl} — what moved, what flat, what to pivot.
        </p>
        <div
          className="mt-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5"
          data-testid="week-review-kpi-panel"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase text-text-3">Week KPI</span>
            {hasGa4Connected(profile) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={ga4Syncing}
                onClick={() => {
                  setGa4Syncing(true);
                  void syncGa4Metrics().finally(() => setGa4Syncing(false));
                }}
              >
                {ga4Syncing ? (
                  <>
                    <Loader2 size={11} className="mr-1 inline animate-spin" /> Syncing GA4
                  </>
                ) : (
                  "Re-sync GA4"
                )}
              </Button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={assessment.verdict === "promising" ? "ok" : assessment.verdict === "flat" ? "warn" : "neutral"}>
              {assessment.verdict.replace(/_/g, " ")}
            </Badge>
            {assessment.primaryValue != null && (
              <span className="text-mini text-text">
                Primary: {assessment.primaryValue}
                {assessment.pctOfTarget != null ? ` (${assessment.pctOfTarget}% of target)` : ""}
              </span>
            )}
          </div>
          {(assessment.ga4Value != null || assessment.manualValue != null) && (
            <p className="mt-1 text-[10px] text-text-3">
              {assessment.ga4Value != null && <>GA4: {assessment.ga4Value}</>}
              {assessment.ga4Value != null && assessment.manualValue != null && " · "}
              {assessment.manualValue != null && <>Manual: {assessment.manualValue}</>}
              {assessment.kpiSourceUsed && <> · Using: {assessment.kpiSourceUsed.toUpperCase()}</>}
              {assessment.ga4SyncedAt && <> · synced {new Date(assessment.ga4SyncedAt).toLocaleString()}</>}
            </p>
          )}
        </div>
        <textarea
          className="mt-3 w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-2 text-body-sm text-text"
          rows={5}
          placeholder="Wins, misses, KPI truth, next channel bet…"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        {revenueNudge && (
          <p className="mt-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-2 text-[10px] text-text-2">
            <span className="font-semibold text-text">Revenue:</span> {revenueNudge}
            {revenueCloseout?.funnel.leak_label && (
              <> · Funnel leak at {revenueCloseout.funnel.leak_label}</>
            )}
          </p>
        )}
        {budgetCloseout.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-line">
            <div className="grid grid-cols-5 bg-surface-2 px-2 py-1 text-[10px] uppercase text-text-3">
              <span>Channel</span><span>Allocated</span><span>Spent</span><span>Outcomes</span><span>CPA</span>
            </div>
            {budgetCloseout.filter((row) => row.allocated_usd > 0).map((row) => (
              <div key={row.bucket_id} className="grid grid-cols-5 border-t border-line px-2 py-1.5 text-[10px] text-text-2">
                <span>{row.bucket_id.replace(/_/g, " ")}</span>
                <span>${row.allocated_usd}</span>
                <span>${row.actual_spend_usd}</span>
                <span>{row.outcomes ?? "—"}</span>
                <span>{row.cpa_confidence === "measured" ? `$${row.cpa_usd} measured` : "—"}</span>
              </div>
            ))}
            {budgetCloseout.some(
              (row) =>
                ["paid_ads", "influencer", "delegate_labor", "tools"].includes(row.bucket_id) &&
                row.allocated_usd > 0 &&
                row.actual_spend_usd === 0,
            ) && (
              <p className="border-t border-line px-2 py-1.5 text-[10px] text-warn">
                Paid buckets with no actual logged remain unmeasured; week close is not blocked.
              </p>
            )}
          </div>
        )}
        {error && <p className="mt-2 text-mini text-warn" data-testid="cmo-week-review-error">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" data-testid="cmo-week-review-submit" onClick={handleSubmit}>
            Close {wl}
          </Button>
        </div>
      </div>
    </div>
  );
}
