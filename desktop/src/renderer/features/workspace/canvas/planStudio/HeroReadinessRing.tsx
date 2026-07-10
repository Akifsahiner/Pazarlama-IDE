import { motion } from "framer-motion";
import type { MarketingPlanSuite, ReadinessScoreWithRationale } from "@shared/planPlaybooks";
import { playbookTitle, tacticHintForReadinessLabel } from "@shared/gtmCatalog";
import { crystallize } from "@renderer/design/animations";
import { useApp } from "@renderer/state/store";

function ReadinessRing({ score, justGenerated }: { score: number; justGenerated?: boolean }) {
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const r = 28;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const weak = score < 50;

  return (
    <motion.div
      variants={justGenerated && !reducedMotion ? crystallize : undefined}
      initial={justGenerated && !reducedMotion ? "hidden" : false}
      animate={justGenerated && !reducedMotion ? "visible" : undefined}
      className="relative shrink-0"
      aria-hidden
    >
      <svg width={72} height={72} className="-rotate-90">
        <circle cx={36} cy={36} r={r} fill="none" stroke="var(--line)" strokeWidth={5} />
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke={weak ? "var(--warn)" : "var(--accent)"}
          strokeWidth={5}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[17px] font-semibold tabular-nums text-text">{Math.round(score)}</span>
        <span className="text-[9px] uppercase tracking-wide text-text-3">Ready</span>
      </span>
    </motion.div>
  );
}

export function HeroReadinessRing({
  plan,
  crystallizeBeat,
  onOpenStrategy,
}: {
  plan: MarketingPlanSuite;
  crystallizeBeat?: boolean;
  onOpenStrategy?: () => void;
}) {
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const setActivePlaybook = useApp((s) => s.setActivePlaybook);
  const resolvePlanDeepLink = useApp((s) => s.resolvePlanDeepLink);

  if (!plan.readiness.length) return null;

  const avg =
    plan.readiness.reduce((sum, r) => sum + r.score, 0) / Math.max(1, plan.readiness.length);
  const gaps = plan.readiness.filter((r) => r.score < 50);

  const onGap = (r: ReadinessScoreWithRationale) => {
    onOpenStrategy?.();
    const hint = tacticHintForReadinessLabel(r.label);
    const playbookId = r.suggestedPlaybookId ?? hint?.playbookId;
    if (!playbookId) return;
    const resolved = resolvePlanDeepLink({ playbookId });
    if (resolved?.taskId) {
      focusPlanTask({ playbookId: resolved.playbookId, taskId: resolved.taskId });
    } else {
      setActivePlaybook(playbookId);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-[var(--radius-md)] border border-line/60 bg-surface/40 p-4">
      <ReadinessRing score={avg} justGenerated={crystallizeBeat} />
      <div className="min-w-0 flex-1">
        <div className="text-micro font-semibold uppercase tracking-wider text-text-3">
          Launch readiness
        </div>
        <p className="mt-1 text-mini text-text-2">
          {gaps.length > 0
            ? `${gaps.length} gap${gaps.length === 1 ? "" : "s"} to close before launch`
            : "All dimensions above threshold"}
        </p>
        {gaps.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {gaps.slice(0, 4).map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => onGap(r)}
                title={r.rationale}
                className="inline-flex items-center gap-1 rounded-full border border-warn-border bg-warn-soft px-2 py-0.5 text-micro text-warn transition-colors hover:brightness-110"
              >
                {r.label}
                <span className="font-medium tabular-nums">{r.score}</span>
                {r.suggestedPlaybookId && (
                  <span className="text-[9px] opacity-80">
                    · {playbookTitle(r.suggestedPlaybookId).split(" ")[0]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
