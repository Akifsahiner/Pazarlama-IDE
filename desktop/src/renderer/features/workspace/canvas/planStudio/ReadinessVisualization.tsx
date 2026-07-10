import { useId, useState } from "react";
import { motion } from "framer-motion";
import { springSoft } from "@renderer/design/animations";
import type { MarketingPlanSuite, ReadinessScoreWithRationale } from "@shared/planPlaybooks";
import { playbookTitle, tacticHintForReadinessLabel } from "@shared/gtmCatalog";
import { useApp } from "@renderer/state/store";

export function ReadinessVisualization({
  readiness,
  plan,
}: {
  readiness: ReadinessScoreWithRationale[];
  plan?: MarketingPlanSuite;
}) {
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const setActivePlaybook = useApp((s) => s.setActivePlaybook);
  const resolvePlanDeepLink = useApp((s) => s.resolvePlanDeepLink);
  const [openId, setOpenId] = useState<string | null>(null);
  const groupId = useId();

  const onGapAction = (r: ReadinessScoreWithRationale) => {
    if (!plan || r.score >= 50) return;
    const hint = tacticHintForReadinessLabel(r.label);
    const playbookId = r.suggestedPlaybookId ?? hint?.playbookId;
    if (playbookId) {
      const resolved = resolvePlanDeepLink({ playbookId });
      if (resolved) {
        focusPlanTask({ playbookId: resolved.playbookId, taskId: resolved.taskId });
        return;
      }
      setActivePlaybook(playbookId);
    }
  };

  return (
    <section className="surface rounded-[var(--radius-lg)] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-mini font-semibold uppercase tracking-wider text-text-3">Launch readiness</h3>
        <span className="text-micro text-text-3">Click a gap — opens tactic + playbook</span>
      </div>
      <div className="space-y-3" role="list" aria-labelledby={groupId}>
        <span id={groupId} className="sr-only">
          Launch readiness dimensions
        </span>
        {readiness.map((r, i) => {
          const weak = r.score < 50;
          const hint = tacticHintForReadinessLabel(r.label);
          const tacticLabel = r.suggestedTactic ?? hint?.label;
          const pbId = r.suggestedPlaybookId ?? hint?.playbookId;
          const popoverId = `readiness-${r.label.replace(/\s+/g, "-")}`;
          const isOpen = openId === r.label;
          return (
            <div key={r.label} className="relative flex items-center gap-3" role="listitem">
              <button
                type="button"
                className="w-36 shrink-0 truncate text-left text-mini text-text-2 hover:text-accent"
                aria-expanded={isOpen}
                aria-controls={popoverId}
                onClick={() => {
                  setOpenId(isOpen ? null : r.label);
                  if (weak) onGapAction(r);
                }}
              >
                {r.label}
              </button>
              <div className="relative h-2 flex-1 rounded-full bg-elevated">
                <motion.div
                  className={`h-full rounded-full ${weak ? "bg-warn" : "bg-accent"}`}
                  initial={reducedMotion ? false : { width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, r.score))}%` }}
                  transition={{ ...springSoft, delay: reducedMotion ? 0 : i * 0.05 }}
                />
              </div>
              <span className="w-9 text-right text-mini tabular-nums text-text">{r.score}</span>
              {weak && tacticLabel && (
                <span className="max-w-[140px] truncate text-[9px] text-warn sm:max-w-[180px]" title={tacticLabel}>
                  {tacticLabel}
                </span>
              )}
              {weak && (
                <span className="hidden shrink-0 rounded-full bg-warn/10 px-1.5 py-0.5 text-[9px] font-medium uppercase text-warn sm:inline">
                  Gap
                </span>
              )}
              {r.rationale && isOpen && (
                <div
                  id={popoverId}
                  role="tooltip"
                  className="absolute left-0 top-full z-20 mt-2 w-full max-w-md rounded-[var(--radius-sm)] border border-line bg-surface-2 p-2.5 text-micro leading-relaxed text-text-2 shadow-lg"
                >
                  {r.rationale}
                  {weak && tacticLabel && pbId && (
                    <p className="mt-2 text-accent">
                      Try: <span className="font-medium text-text">{tacticLabel}</span>
                      {" → "}
                      {playbookTitle(pbId)}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
