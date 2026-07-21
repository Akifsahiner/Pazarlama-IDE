import type { CampaignSession } from "@shared/types";
import type { ChannelThesis } from "@shared/cmoIntake";
import type { CmoOpsCadence } from "@shared/cmoOpsCadence";
import type { CmoContinuousState } from "@shared/cmoContinuous";
import type { GrowthControlPlane } from "@shared/cmoGrowthPlane";
import type { GrowthMemoryState } from "@shared/cmoGrowthMemory";
import type { LaneAWorkspace } from "@shared/cmoLaneA";
import type { LaneBWorkspace } from "@shared/cmoLaneB";
import type { LaneDWorkspace } from "@shared/cmoLaneD";
import type { DistributionOperatorWorkspace } from "@shared/cmoDistributionOperator";
import type { InfluencerOperatorWorkspace } from "@shared/cmoInfluencerOperator";
import type { DelegateOperatorWorkspace } from "@shared/cmoDelegateOperator";
import { Badge } from "@renderer/components/ui/Badge";
import { CmoOpsBoard } from "./CmoOpsBoard";
import { LaneAPanel } from "./LaneAPanel";
import { LaneBPanel } from "./LaneBPanel";
import { DistributionOperatorPanel } from "./DistributionOperatorPanel";
import { InfluencerOperatorPanel } from "./InfluencerOperatorPanel";
import { DelegateOperatorPanel } from "./DelegateOperatorPanel";
import { GrowthMemoryPanel } from "./GrowthMemoryPanel";
import { CmoCyclePanel } from "./CmoCyclePanel";
import { BudgetPlanePanel } from "./BudgetPlanePanel";
import { RevenuePlanePanel } from "./RevenuePlanePanel";
import { LaneDPanel } from "./LaneDPanel";
import { MonetizationPanel } from "./MonetizationPanel";
import { GrowthMechanismPanel } from "./GrowthMechanismPanel";
import type { MonetizationWorkspace } from "@shared/cmoRevenuePlane";

export interface CmoBackstageProps {
  cadence: CmoOpsCadence;
  thesis?: ChannelThesis | null;
  plane: GrowthControlPlane;
  laneAWorkspace?: LaneAWorkspace | null;
  laneBWorkspace?: LaneBWorkspace | null;
  laneDWorkspace?: LaneDWorkspace | null;
  monetizationWorkspace?: MonetizationWorkspace | null;
  distributionOperator?: DistributionOperatorWorkspace | null;
  influencerOperator?: InfluencerOperatorWorkspace | null;
  delegateOperator?: DelegateOperatorWorkspace | null;
  continuous?: CmoContinuousState | null;
  campaignSession?: CampaignSession | null;
  growthMemory?: GrowthMemoryState | null;
  compact?: boolean;
}

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CmoBackstage({
  cadence,
  thesis,
  plane,
  laneAWorkspace,
  laneBWorkspace,
  laneDWorkspace,
  monetizationWorkspace,
  distributionOperator,
  influencerOperator,
  delegateOperator,
  continuous,
  campaignSession,
  growthMemory,
  compact,
}: CmoBackstageProps) {
  const marketingPaused = laneDWorkspace?.marketing_paused === true;
  const operatorActive = !marketingPaused && Boolean(distributionOperator || influencerOperator);
  const links = [
    { id: "cmo-ops-board", label: "Ops", visible: true },
    { id: "lane-a-panel", label: "Ship", visible: Boolean(laneAWorkspace) },
    { id: "lane-d-panel-wrap", label: "Product", visible: Boolean(laneDWorkspace) },
    {
      id: distributionOperator
        ? "distribution-operator-panel-wrap"
        : influencerOperator
          ? "influencer-operator-panel-wrap"
          : "delegate-panel",
      label: distributionOperator
        ? "Volume"
        : influencerOperator
          ? "Outreach"
          : "Delegate",
      visible:
        !marketingPaused &&
        Boolean(distributionOperator || influencerOperator || delegateOperator),
    },
    { id: "growth-memory-panel-wrap", label: "Memory", visible: Boolean(growthMemory && (growthMemory.experiments.length > 0 || growthMemory.messages.length > 0 || growthMemory.pending_replan)) },
    { id: "budget-plane-panel-wrap", label: "Budget", visible: true },
    { id: "revenue-plane-panel-wrap", label: "Revenue", visible: true },
    { id: "monetization-panel-wrap", label: "Monetize", visible: Boolean(monetizationWorkspace) },
    { id: "growth-mechanism-panel", label: "Mechanism", visible: Boolean(plane.mechanism_label) },
    { id: "cmo-cycle-panel", label: "Cycle", visible: Boolean(continuous) },
  ].filter((item) => item.visible);

  const wrap = compact
    ? "shrink-0 border-b border-line bg-surface-2/30 px-4 pb-4"
    : "rounded-[var(--radius-lg)] border border-line bg-surface-2/30 p-4";

  return (
    <section
      className={wrap}
      data-testid="cmo-backstage"
      aria-label="CMO war room"
    >
      <nav
        className="sticky top-0 z-10 -mx-1 mb-3 flex flex-wrap items-center gap-1 border-b border-line bg-surface/95 px-1 py-2 backdrop-blur-sm"
        aria-label="War room sections"
      >
        <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-text-3">
          War room — full week plan
        </span>
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => jumpTo(link.id)}
            className="rounded-[var(--radius-sm)] px-2 py-1 text-mini text-text-2 hover:bg-elevated hover:text-text"
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="space-y-3">
        <div id="budget-plane-panel-wrap">
          <BudgetPlanePanel />
        </div>
        <div id="revenue-plane-panel-wrap">
          <RevenuePlanePanel />
        </div>
        <div id="cmo-ops-board">
          <CmoOpsBoard cadence={cadence} thesis={thesis} compact={compact} />
        </div>
        {laneDWorkspace && (
          <div id="lane-d-panel-wrap">
            <LaneDPanel workspace={laneDWorkspace} compact={compact} />
          </div>
        )}
        {monetizationWorkspace && (
          <div id="monetization-panel-wrap">
            <MonetizationPanel workspace={monetizationWorkspace} compact={compact} />
          </div>
        )}

        <GrowthMechanismPanel />

        {plane.red_list.length > 0 && (
          <section
            className="rounded-[var(--radius-md)] border border-line bg-surface p-3"
            data-testid="command-surface-red-list"
            aria-label="Red list"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-mini font-medium text-text">Red list</span>
              <Badge tone="warn">{plane.red_list.length} rejected</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {plane.red_list.map((item) => (
                <div key={item.id} className="rounded-[var(--radius-sm)] border border-line/70 p-2">
                  <p className="text-mini font-medium text-text">{item.tactic}</p>
                  <p className="mt-1 text-micro text-text-2">{item.reason}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {laneAWorkspace && (
          <div id="lane-a-panel">
            <LaneAPanel workspace={laneAWorkspace} thesis={thesis} />
          </div>
        )}
        {distributionOperator && !marketingPaused && (
          <div id="distribution-operator-panel-wrap">
            <DistributionOperatorPanel operator={distributionOperator} compact={compact} />
          </div>
        )}
        {influencerOperator && !marketingPaused && (
          <div id="influencer-operator-panel-wrap">
            <InfluencerOperatorPanel operator={influencerOperator} compact={compact} />
          </div>
        )}
        {laneBWorkspace && !operatorActive && !marketingPaused && (
          <div id="lane-b-panel">
            <LaneBPanel workspace={laneBWorkspace} thesis={thesis} compact={compact} />
          </div>
        )}
        {delegateOperator && !marketingPaused && (
          <div id="delegate-panel">
            <DelegateOperatorPanel workspace={delegateOperator} thesis={thesis} compact={compact} />
          </div>
        )}
        {growthMemory &&
          (growthMemory.experiments.length > 0 ||
            growthMemory.messages.length > 0 ||
            growthMemory.pending_replan) && (
          <div id="growth-memory-panel-wrap">
            <GrowthMemoryPanel memory={growthMemory} compact={compact} />
          </div>
        )}
        {continuous && (
          <div id="cmo-cycle-panel">
            <CmoCyclePanel
              continuous={continuous}
              cadence={cadence}
              thesis={thesis}
              session={campaignSession}
              growthMemory={growthMemory}
              compact={compact}
            />
          </div>
        )}
      </div>
    </section>
  );
}
