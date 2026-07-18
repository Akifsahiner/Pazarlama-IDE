import { useMemo } from "react";
import {
  computeRailSectionStatus,
  isProfileIncomplete,
  PROFILE_GAP_PROMPT,
  RAIL_SECTION_META,
  type RailSection,
} from "@shared/projectRail";
import { computePlaybookRollupStats, formatPlaybookRollupLabel } from "@shared/playbookStats";
import { normalizePlan } from "@shared/planPlaybooks";
import {
  AlertCircle,
  ChevronRight,
  Globe,
  Link2,
  Megaphone,
  Package,
  Target,
  TestTube2,
  Users,
  Palette,
} from "lucide-react";
import { useApp } from "@renderer/state/store";

const SECTION_ICONS: Record<RailSection, typeof Package> = {
  product: Package,
  goals: Target,
  audiences: Users,
  campaigns: Megaphone,
  experiments: TestTube2,
  connections: Link2,
  brand: Palette,
};

function StatusDot({ status }: { status: "empty" | "partial" | "ready" }) {
  const cls =
    status === "ready"
      ? "bg-ok"
      : status === "partial"
        ? "bg-warn"
        : "bg-text-3/40";
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cls}`} />;
}

function SectionBlock({
  section,
  children,
  onOpen,
  status,
  selected,
}: {
  section: RailSection;
  children: React.ReactNode;
  onOpen: () => void;
  status: "empty" | "partial" | "ready";
  selected: boolean;
}) {
  const meta = RAIL_SECTION_META[section];
  const Icon = SECTION_ICONS[section];
  return (
    <div className="px-3 py-2">
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors ${
          selected ? "bg-accent-soft text-accent" : "hover:bg-surface-2"
        }`}
      >
        <Icon size={14} className="shrink-0 opacity-80" />
        <span className="flex-1 text-mini font-medium">{meta.label}</span>
        <StatusDot status={status} />
        <ChevronRight size={12} className="shrink-0 opacity-50" />
      </button>
      <div className="mt-1.5 pl-2">{children}</div>
    </div>
  );
}

export function ProjectRail() {
  const project = useApp((s) => s.project);
  const plan = useApp((s) => s.plan);
  const planLoading = useApp((s) => s.planLoading);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const selectedRailSection = useApp((s) => s.selectedRailSection);
  const selectRailSection = useApp((s) => s.selectRailSection);
  const planProgress = useApp((s) => s.planProgress);
  const launchComposerAction = useApp((s) => s.launchComposerAction);
  const generatePlan = useApp((s) => s.generatePlan);
  const connected = useApp((s) => s.runtime === "connected");

  const profileIncomplete = isProfileIncomplete(marketingProfile);

  const playbookStats = useMemo(() => {
    if (!plan || !planProgress) return null;
    const suite = normalizePlan(plan);
    if (!suite) return null;
    return formatPlaybookRollupLabel(
      computePlaybookRollupStats(suite, planProgress.byTaskId),
    );
  }, [plan, planProgress]);

  return (
    <div className="space-y-1 pb-4">
      {profileIncomplete && (
        <div className="mx-3 mt-3 rounded-[var(--radius-md)] border border-warn/30 bg-warn/[0.06] p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-warn" />
            <div>
              <p className="text-mini font-medium text-text">Profile incomplete</p>
              <p className="mt-1 text-micro leading-relaxed text-text-3">
                Add market and competitor context so recommendations stay on target.
              </p>
              <button
                type="button"
                onClick={() => launchComposerAction({ mode: "ask", draft: PROFILE_GAP_PROMPT })}
                className="mt-2 text-micro font-medium text-accent hover:underline"
              >
                Tell the agent →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-3 border-t border-line" />

      <SectionBlock
        section="product"
        status={computeRailSectionStatus("product", marketingProfile, plan)}
        selected={selectedRailSection === "product"}
        onOpen={() => selectRailSection("product")}
      >
        {marketingProfile ? (
          <dl className="space-y-1 text-micro">
            <div>
              <dt className="text-text-3">Name</dt>
              <dd className="text-text-2">{marketingProfile.product_name || project?.name || "—"}</dd>
            </div>
            {marketingProfile.category && (
              <div>
                <dt className="text-text-3">Category</dt>
                <dd className="text-text-2">{marketingProfile.category}</dd>
              </div>
            )}
            {marketingProfile.company_stage && (
              <div>
                <dt className="text-text-3">Stage</dt>
                <dd className="capitalize text-text-2">{marketingProfile.company_stage}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-micro text-text-3">Product context fills in as you chat.</p>
        )}
      </SectionBlock>

      <SectionBlock
        section="goals"
        status={computeRailSectionStatus("goals", marketingProfile, plan)}
        selected={selectedRailSection === "goals"}
        onOpen={() => selectRailSection("goals")}
      >
        {marketingProfile?.marketing_goals.length ? (
          <ul className="space-y-1">
            {marketingProfile.marketing_goals.slice(0, 4).map((g) => (
              <li key={g} className="text-micro text-text-2">
                · {g}
              </li>
            ))}
          </ul>
        ) : plan?.readiness.length ? (
          <ul className="space-y-1">
            {plan.readiness.slice(0, 3).map((r) => (
              <li key={r.label} className="flex items-center gap-2 text-[10.5px]">
                <span className="w-16 truncate text-text-3">{r.label}</span>
                <div className="h-1 flex-1 rounded-full bg-elevated">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${r.score}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-1.5">
            <p className="text-micro text-text-3">No goals captured yet.</p>
            <button
              type="button"
              onClick={() =>
                launchComposerAction({
                  mode: "ask",
                  draft: "What marketing goals should we prioritize for this product?",
                })
              }
              className="text-micro font-medium text-accent hover:underline"
            >
              Set goals →
            </button>
          </div>
        )}
      </SectionBlock>

      <SectionBlock
        section="audiences"
        status={computeRailSectionStatus("audiences", marketingProfile, plan)}
        selected={selectedRailSection === "audiences"}
        onOpen={() => selectRailSection("audiences")}
      >
        {marketingProfile?.target_audience.length ? (
          <ul className="space-y-2">
            {marketingProfile.target_audience.slice(0, 3).map((a) => (
              <li key={a.persona} className="rounded-[var(--radius-sm)] border border-line/60 bg-surface-2/50 p-2">
                <div className="text-micro font-medium text-text">{a.persona}</div>
                {a.pains[0] && (
                  <div className="mt-0.5 line-clamp-2 text-[10.5px] text-text-3">{a.pains[0]}</div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-micro text-text-3">Personas appear after onboarding.</p>
        )}
      </SectionBlock>

      <SectionBlock
        section="campaigns"
        status={computeRailSectionStatus("campaigns", marketingProfile, plan)}
        selected={selectedRailSection === "campaigns"}
        onOpen={() => selectRailSection("campaigns")}
      >
        {plan ? (
          <div className="space-y-2">
            <p className="line-clamp-2 text-micro text-text-2">{plan.positioning}</p>
            {playbookStats ? (
              <span className="block text-[10.5px] text-text-3">{playbookStats}</span>
            ) : (
              <span className="text-[10.5px] text-text-3">
                {planProgress?.computed.done ?? 0}/{planProgress?.computed.total ?? plan.taskGraph.length}{" "}
                tasks complete
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void generatePlan()}
            disabled={!project || planLoading || !connected}
            className="text-micro text-accent disabled:opacity-40"
          >
            {planLoading ? "Generating plan…" : "Generate campaign plan →"}
          </button>
        )}
      </SectionBlock>

      <SectionBlock
        section="experiments"
        status={computeRailSectionStatus("experiments", marketingProfile, plan)}
        selected={selectedRailSection === "experiments"}
        onOpen={() => selectRailSection("experiments")}
      >
        {marketingProfile?.previous_experiments.length ? (
          <ul className="space-y-1">
            {marketingProfile.previous_experiments.slice(0, 3).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-micro">
                <span className="truncate text-text-2">{e.hypothesis}</span>
                <span className="shrink-0 capitalize text-text-3">{e.outcome}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-micro text-text-3">Past experiments will show here.</p>
        )}
      </SectionBlock>

      <SectionBlock
        section="connections"
        status={computeRailSectionStatus("connections", marketingProfile, plan)}
        selected={selectedRailSection === "connections"}
        onOpen={() => selectRailSection("connections")}
      >
        {marketingProfile?.available_channels.length ? (
          <ul className="flex flex-wrap gap-1">
            {marketingProfile.available_channels.map((ch) => (
              <li
                key={ch}
                className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] text-text-2"
              >
                {ch}
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-1 text-micro text-text-3">
            <Globe size={11} /> Connect GA4 for read-only metrics (Meta v2)
          </p>
        )}
      </SectionBlock>

      <SectionBlock
        section="brand"
        status={computeRailSectionStatus("brand", marketingProfile, plan)}
        selected={selectedRailSection === "brand"}
        onOpen={() => selectRailSection("brand")}
      >
        {marketingProfile?.brand_voice ? (
          <div className="space-y-1.5">
            <p className="line-clamp-3 text-micro italic text-text-2">{marketingProfile.brand_voice}</p>
            {marketingProfile.differentiators[0] && (
              <p className="text-[10.5px] text-text-3">↳ {marketingProfile.differentiators[0]}</p>
            )}
          </div>
        ) : (
          <p className="text-micro text-text-3">Brand voice fills in from your project.</p>
        )}
      </SectionBlock>
    </div>
  );
}
