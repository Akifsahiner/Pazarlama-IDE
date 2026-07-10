import { useEffect, useMemo, useState } from "react";
import { ChevronDown, GitBranch, History, ListPlus, ListX } from "lucide-react";
import { normalizePlan } from "@shared/planPlaybooks";
import { diffPlanVersions, formatPlanRevisionMarkdown } from "@shared/planDiff";
import { AgentMarkdown } from "@renderer/features/agent/AgentMarkdown";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { useApp } from "@renderer/state/store";
import type { ServerPlanRow } from "@renderer/lib/api";

function formatVersionDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function versionLabel(row: ServerPlanRow, index: number): string {
  const suite = normalizePlan(row.plan_json);
  const tasks = suite?.taskGraph.length ?? 0;
  const playbooks = suite?.playbooks.length ?? 0;
  return `v${index + 1} · ${tasks} tasks · ${playbooks} playbooks`;
}

export function PlanVersionsPanel() {
  const [open, setOpen] = useState(false);
  const plan = useApp((s) => s.plan);
  const planHistory = useApp((s) => s.planHistory);
  const activePlanRowId = useApp((s) => s.activePlanRowId);
  const compareBaseline = useApp((s) => s.planCompareBaseline);
  const loadPlanHistory = useApp((s) => s.loadPlanHistory);
  const openPlanVersion = useApp((s) => s.openPlanVersion);
  const setPlanCompareBaseline = useApp((s) => s.setPlanCompareBaseline);
  const clearPlanCompareBaseline = useApp((s) => s.clearPlanCompareBaseline);
  const setWorkSurface = useApp((s) => s.setWorkSurface);

  useEffect(() => {
    if (open && planHistory.length === 0) void loadPlanHistory();
  }, [open, planHistory.length, loadPlanHistory]);

  const currentSuite = useMemo(() => (plan ? normalizePlan(plan) : null), [plan]);

  const compareDiff = useMemo(() => {
    if (!compareBaseline || !currentSuite) return null;
    const baseline = normalizePlan(compareBaseline.plan);
    if (!baseline) return null;
    return diffPlanVersions(baseline, currentSuite, "Comparing plan versions");
  }, [compareBaseline, currentSuite]);

  if (!plan) return null;

  const showHistory = planHistory.length > 1 || compareBaseline;

  return (
    <section
      className="rounded-[var(--radius-lg)] border border-line bg-surface"
      data-testid="plan-versions-panel"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-mini font-semibold uppercase tracking-wider text-text-3">
          <History size={13} />
          Plan versions
          {planHistory.length > 0 && (
            <Badge tone="neutral">{planHistory.length}</Badge>
          )}
        </span>
        <ChevronDown
          size={14}
          className={`text-text-3 transition-transform duration-[var(--dur-fast)] ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line p-5">
          {compareBaseline && compareDiff && (
            <div className="rounded-[var(--radius-md)] border border-accent-border bg-accent-soft/20 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GitBranch size={14} className="text-accent" />
                  <span className="text-body-sm font-semibold text-text">Compare mode</span>
                  <Badge tone="accent">Baseline vs current</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={clearPlanCompareBaseline}>
                  Exit compare
                </Button>
              </div>
              <div className="mb-3 flex flex-wrap gap-3 text-mini text-text-2">
                {compareDiff.addedTasks.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <ListPlus size={12} className="text-ok" /> +{compareDiff.addedTasks.length} tasks
                  </span>
                )}
                {compareDiff.removedTasks.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <ListX size={12} className="text-warn" /> −{compareDiff.removedTasks.length} tasks
                  </span>
                )}
                {compareDiff.modifiedTasks.length > 0 && (
                  <span>{compareDiff.modifiedTasks.length} modified</span>
                )}
              </div>
              <div className="agent-prose max-h-56 overflow-y-auto rounded-[var(--radius-md)] border border-line bg-surface p-3 text-body-sm">
                <AgentMarkdown content={formatPlanRevisionMarkdown(compareDiff)} />
              </div>
            </div>
          )}

          {!showHistory ? (
            <p className="text-body-sm text-text-3">
              Only one saved version so far. Revise the plan in chat to create a new version.
            </p>
          ) : (
            <ul className="space-y-2">
              {planHistory.map((row, index) => {
                const isActive = row.id === activePlanRowId || (!activePlanRowId && index === 0);
                const isBaseline = compareBaseline?.rowId === row.id;
                return (
                  <li
                    key={row.id}
                    className={`rounded-[var(--radius-md)] border px-3 py-2.5 ${
                      isActive ? "border-accent/40 bg-accent-soft/15" : "border-line bg-surface-2/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-body-sm font-medium text-text">
                            {versionLabel(row, planHistory.length - 1 - index)}
                          </span>
                          {isActive && <Badge tone="accent">Current</Badge>}
                          {isBaseline && <Badge tone="warn">Baseline</Badge>}
                        </div>
                        <p className="mt-0.5 text-micro text-text-3">
                          {formatVersionDate(row.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {!isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setWorkSurface("campaign-plan");
                              openPlanVersion(row.plan_json, row.id);
                            }}
                          >
                            Open
                          </Button>
                        )}
                        {!isActive && !isBaseline && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPlanCompareBaseline(row);
                              setWorkSurface("campaign-plan");
                            }}
                          >
                            Compare
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-micro text-text-3">
            Each chat revision saves a new version. Progress carries over when task titles match; removed
            tasks are cleared from your tracker.
          </p>
        </div>
      )}
    </section>
  );
}
