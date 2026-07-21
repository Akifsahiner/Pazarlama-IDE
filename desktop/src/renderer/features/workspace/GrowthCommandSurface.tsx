import { LayoutList, Play } from "lucide-react";
import { useId } from "react";
import {
  buildCommandSurfaceModel,
  resolveCommandSurfaceAction,
  type BuildCommandSurfaceModelInput,
  type CommandSurfaceAction,
} from "@shared/cmoCommandSurface";
import type { CmoContinuousState } from "@shared/cmoContinuous";
import type { DelegateOperatorWorkspace } from "@shared/cmoDelegateOperator";
import type { DistributionOperatorWorkspace } from "@shared/cmoDistributionOperator";
import type { GrowthControlPlane } from "@shared/cmoGrowthPlane";
import type { GrowthMemoryState } from "@shared/cmoGrowthMemory";
import type { InfluencerOperatorWorkspace } from "@shared/cmoInfluencerOperator";
import type { LaneBWorkspace } from "@shared/cmoLaneB";
import type { LaneDWorkspace } from "@shared/cmoLaneD";
import type { MonetizationWorkspace, RevenueProfile } from "@shared/cmoRevenuePlane";
import type { CmoOpsCadence } from "@shared/cmoOpsCadence";
import type { CampaignSession } from "@shared/types";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { CommandSurfaceGovernanceBanner } from "./CommandSurfaceGovernanceBanner";
import { ReplanPreviewStrip } from "./ReplanPreviewStrip";
import { rollupBudgetActuals } from "@shared/cmoBudgetPlane";

export interface GrowthCommandSurfaceProps {
  plane: GrowthControlPlane;
  cadence: CmoOpsCadence;
  laneBWorkspace?: LaneBWorkspace | null;
  laneDWorkspace?: LaneDWorkspace | null;
  monetizationWorkspace?: MonetizationWorkspace | null;
  revenueProfile?: RevenueProfile | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
  continuous?: CmoContinuousState | null;
  campaignSession?: CampaignSession | null;
  growthMemory?: GrowthMemoryState | null;
  compact?: boolean;
}

function CommandField({
  label,
  value,
  labelId,
  emphasis,
}: {
  label: string;
  value: string;
  labelId: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className="min-w-0 rounded-[var(--radius-md)] border border-line/70 bg-surface/55 p-3"
      aria-labelledby={labelId}
    >
      <div
        id={labelId}
        className="text-[10px] font-semibold uppercase tracking-wider text-text-3"
      >
        {label}
      </div>
      <p className={`mt-1 text-body-sm ${emphasis ? "font-medium text-text" : "text-text-2"}`}>
        {value}
      </p>
    </div>
  );
}

export function GrowthCommandSurface({
  plane,
  cadence,
  laneBWorkspace,
  laneDWorkspace,
  monetizationWorkspace,
  revenueProfile,
  distributionOperator,
  influencerOperator,
  delegateOperator,
  continuous,
  campaignSession,
  growthMemory,
  compact,
}: GrowthCommandSurfaceProps) {
  const id = useId();
  const startOpsSystemTask = useApp((s) => s.startOpsSystemTask);
  const openOpsProofModal = useApp((s) => s.openOpsProofModal);
  const openDistributionProofModal = useApp((s) => s.openDistributionProofModal);
  const openInfluencerProofModal = useApp((s) => s.openInfluencerProofModal);
  const openInfluencerDealModal = useApp((s) => s.openInfluencerDealModal);
  const openDelegateRubricModal = useApp((s) => s.openDelegateRubricModal);
  const openProductRequestModal = useApp((s) => s.openProductRequestModal);
  const openProductIssueModal = useApp((s) => s.openProductIssueModal);
  const openMonetizationTaskModal = useApp((s) => s.openMonetizationTaskModal);
  const openMonetizationIssueModal = useApp((s) => s.openMonetizationIssueModal);
  const toggleWarRoomExpanded = useApp((s) => s.toggleWarRoomExpanded);
  const warRoomExpanded = useApp((s) => s.warRoomExpanded);
  const narrativeOneLiner = useApp((s) => s.marketingProfile?.growth_narrative?.one_liner);
  const profile = useApp((s) => s.marketingProfile);
  const budgetPlan = useApp((s) => s.budgetPlan ?? s.marketingProfile?.budget_plan);
  const budgetCloseout = budgetPlan
    ? rollupBudgetActuals(budgetPlan, profile, {
        laneB: laneBWorkspace,
        laneC: profile?.lane_c_workspace,
        distribution: distributionOperator,
        influencer: influencerOperator,
        delegate: delegateOperator,
        cadence,
      })
    : [];
  const budgetSpent = budgetCloseout.reduce((sum, row) => sum + row.actual_spend_usd, 0);
  const firstShipAt = useApp((s) => s.firstShipAt);
  const wedgePhase = useApp((s) => s.wedgePhase);
  const run = useApp((s) => s.run);
  const executionKernel = useApp((s) => s.executionKernel ?? s.marketingProfile?.execution_kernel);
  const beginQuickStartShip = useApp((s) => s.beginQuickStartShip);
  const promptApplyFirstChange = useApp((s) => s.promptApplyFirstChange);
  const openWeekReviewModal = useApp((s) => s.openWeekReviewModal);
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const openLaneBProofModal = useApp((s) => s.openLaneBProofModal);
  const focusBackstageAnchor = useApp((s) => s.focusBackstageAnchor);

  const modelInput: BuildCommandSurfaceModelInput = {
    plane,
    cadence,
    laneBWorkspace,
    laneDWorkspace,
    monetizationWorkspace,
    distributionOperator,
    influencerOperator,
    delegateOperator,
    continuous,
    campaignPhase: campaignSession?.phase,
    growthMemory,
    narrativeOneLiner,
    executionKernel,
  };
  const model = buildCommandSurfaceModel(modelInput);
  if (!model) return null;

  const action = resolveCommandSurfaceAction({
    ...modelInput,
    firstShipAt,
    wedgePhase,
    hasActiveRun: Boolean(run?.runId && run.status === "completed"),
  });

  const executeAction = (resolved: CommandSurfaceAction) => {
    switch (resolved.kind) {
      case "ship_first":
        if (resolved.label.includes("Apply")) promptApplyFirstChange();
        else beginQuickStartShip();
        break;
      case "run_system":
        startOpsSystemTask(resolved.taskId);
        break;
      case "submit_proof":
        openOpsProofModal(resolved.taskId);
        break;
      case "lane_b_proof":
        openLaneBProofModal(resolved.itemId);
        break;
      case "start_next_cycle": {
        const err = startNextCmoCycle({
          mode: resolved.mode,
          thesisId: resolved.thesisId,
        });
        if (err) {
          useApp.getState().appendEvent({ role: "system", kind: "error", text: err });
          if (/review|close|archive/i.test(err)) openWeekReviewModal();
        }
        break;
      }
      case "focus_backstage":
        focusBackstageAnchor(resolved.anchor);
        break;
      case "export":
        if (resolved.exportKind === "outreach") focusBackstageAnchor("lane-b-panel-wrap");
        break;
      case "week_review":
        openWeekReviewModal();
        break;
      case "product_loop":
        if (resolved.siteLevel) {
          const req = laneDWorkspace?.requests.find((r) => r.id === resolved.requestId);
          if (req?.linked_ops_task_id) startOpsSystemTask(req.linked_ops_task_id);
        } else {
          const req = laneDWorkspace?.requests.find((r) => r.id === resolved.requestId);
          if (req?.fix_scope === "core_product") openProductIssueModal(resolved.requestId);
          else openProductRequestModal(resolved.requestId);
        }
        break;
      case "monetization":
        if (resolved.billingIssue) openMonetizationIssueModal(resolved.taskId);
        else openMonetizationTaskModal(resolved.taskId);
        break;
      case "operator_proof":
        if (resolved.operator === "distribution") openDistributionProofModal(resolved.touchId);
        else if (resolved.operator === "influencer") {
          if (resolved.deal) openInfluencerDealModal(resolved.touchId);
          else openInfluencerProofModal(resolved.touchId);
        } else openDelegateRubricModal(resolved.touchId);
        break;
      default:
        break;
    }
  };

  const revenueTarget = revenueProfile?.revenue_target;
  const primaryAction = action.kind !== "none" ? action : null;

  return (
    <section
      data-testid="growth-command-surface"
      className={`rounded-[var(--radius-lg)] border border-accent/30 bg-accent-soft/10 ${
        compact ? "p-3" : "p-4"
      }`}
      aria-label="Growth command surface"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <CommandField
          label="Darboğaz"
          value={model.bottleneck}
          labelId={`${id}-bottleneck`}
          emphasis
        />
        <CommandField label="Bugün" value={model.today} labelId={`${id}-today`} emphasis />
        <CommandField label="Neden" value={model.why} labelId={`${id}-why`} />
        <CommandField label="Done when" value={model.doneWhen} labelId={`${id}-done`} />
      </div>

      {!plane.thesis_aligned && plane.alignment_note && (
        <p className="mt-2 text-mini text-warn">{plane.alignment_note}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{model.pendingOps} ops</Badge>
          {model.pendingLaneB > 0 && <Badge tone="neutral">{model.pendingLaneB} prepared</Badge>}
          {model.pendingLaneD > 0 && <Badge tone="warn">{model.pendingLaneD} product P0</Badge>}
          {model.operatorSummary && <Badge tone="accent">{model.operatorSummary}</Badge>}
          {model.mechanismLabel && (
            <span title={model.mechanismAntiPattern}>
              <Badge tone="accent">{model.mechanismLabel}</Badge>
            </span>
          )}
          {budgetPlan && (
            <Badge tone="neutral">
              Budget ${budgetPlan.monthly_amount_usd}/mo · spent ${budgetSpent}
            </Badge>
          )}
          {revenueTarget && (
            <Badge tone="neutral">
              {revenueTarget.current ?? 0}/{revenueTarget.target} paid · {revenueTarget.confidence}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {primaryAction && (
            <Button
              variant="primary"
              size="sm"
              data-testid={primaryAction.testId}
              onClick={() => executeAction(primaryAction)}
            >
              <Play size={14} className="mr-1" />
              {primaryAction.label}
            </Button>
          )}
          <Button variant="subtle" size="sm" onClick={toggleWarRoomExpanded}>
            <LayoutList size={14} className="mr-1" />
            {warRoomExpanded ? "Close backstage" : "Open backstage"}
          </Button>
        </div>
      </div>

      {model.governance && (
        <CommandSurfaceGovernanceBanner governance={model.governance} />
      )}

      {(continuous?.phase === "measuring" || model.governance?.kind === "replan") && (
        <ReplanPreviewStrip
          delta={continuous?.pending_delta ?? null}
          preview={growthMemory?.pending_replan}
        />
      )}
    </section>
  );
}
