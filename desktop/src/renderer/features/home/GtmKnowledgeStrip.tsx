import { ArrowRight, Sparkles } from "lucide-react";
import { TESTIMONIAL_PLAYBOOKS, TACTIC_TEACHING, playbookTitle } from "@shared/gtmCatalog";
import { shouldBlockPlanStudio } from "@shared/northStarFunnel";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";

/** Home strip — testimonial playbooks with one-line tactics. */
export function GtmKnowledgeStrip() {
  const plan = useApp((s) => s.plan);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const generatePlan = useApp((s) => s.generatePlan);
  const previewPlanOutline = useApp((s) => s.previewPlanOutline);
  const connected = useApp((s) => s.runtime === "connected");
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const setActivePlaybook = useApp((s) => s.setActivePlaybook);
  const navigate = useApp((s) => s.navigate);

  if (shouldBlockPlanStudio({ opsCadence })) return null;

  const openPlaybook = (playbookId: string) => {
    navigate("workspace");
    setWorkSurface("campaign-plan");
    setActivePlaybook(playbookId);
  };

  const startPlan = () => {
    navigate("workspace");
    setWorkSurface("campaign-plan");
    if (connected) void generatePlan();
    else previewPlanOutline();
  };

  return (
    <section className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-accent">
          <Sparkles size={13} /> GTM tactics you may not know
        </div>
        {!plan && (
          <Button variant="secondary" className="h-7 text-micro" onClick={startPlan}>
            {connected ? "Full 30-day plan (backstage)" : "Preview plan outline"}
          </Button>
        )}
      </div>
      <p className="mb-3 text-mini text-text-2">
        Built in Cursor — market from the same folder. Professional playbooks with step-by-step execution.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIAL_PLAYBOOKS.map(({ id, tacticId, oneLiner }) => {
          const teach = TACTIC_TEACHING[tacticId];
          return (
            <button
              key={id}
              type="button"
              onClick={() => (plan ? openPlaybook(id) : startPlan())}
              className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-[var(--dur)] hover:border-accent/40 hover:bg-elevated/50 hover:shadow-[var(--shadow-1)]"
            >
              <div className="text-mini font-medium text-text">{playbookTitle(id)}</div>
              <div className="mt-0.5 text-micro text-text-2">{oneLiner}</div>
              {teach && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-accent">
                  {teach.headline}
                  <ArrowRight size={10} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
