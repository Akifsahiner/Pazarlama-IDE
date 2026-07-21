import { ChevronDown, ChevronUp, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { ExecutionRecordView } from "@shared/executionRecord";
import { Button } from "@renderer/components/ui/Button";
import { cardReveal, spring } from "@renderer/design/animations";
import { ExecutionRecordProgress, ExecutionRecordStatusPill } from "./ExecutionRecordStatus";
import { useCommandSurfaceDispatch } from "./useCommandSurfaceDispatch";
import { useApp } from "@renderer/state/store";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";
import { OurContractStrip } from "./OurContractStrip";
import { MorningBriefHero } from "./MorningBriefHero";

function ResultChip({
  label,
  value,
  tone,
}: {
  label: string;
  value?: string;
  tone: "ok" | "warn" | "neutral" | "missing";
}) {
  const missing = tone === "missing";
  return (
    <div
      className={`flex min-w-[88px] flex-col rounded-[var(--radius-md)] border px-3 py-2 ${
        tone === "ok"
          ? "border-ok/30 bg-ok/8"
          : missing
            ? "border-line/80 bg-surface-2/50"
            : "border-line bg-surface-2/30"
      }`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-text-3">{label}</span>
      <span
        className={`mt-0.5 text-body-sm font-semibold tabular-nums ${
          tone === "ok" ? "text-ok" : missing ? "text-text-3" : "text-text"
        }`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

export function ExecutionRecordCard({
  record,
  compact = false,
}: {
  record: ExecutionRecordView;
  compact?: boolean;
}) {
  const dispatch = useCommandSurfaceDispatch();
  const toggleExecutionHeroExpanded = useApp((s) => s.toggleExecutionHeroExpanded);
  const run = useApp((s) => s.run);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const showContract = isStrategicDecisionSealed(marketingProfile);
  const runActive =
    run?.status === "running" || run?.status === "planning" || run?.status === "created";
  const primary = record.next.action.kind !== "none" ? record.next.action : null;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const brief = record.morningBrief;
  const realResults = record.results.filter((r) => r.id !== "results-empty");

  const handlePrimary = () => {
    if (!primary) return;
    dispatch(primary, record.governance);
  };

  if (compact) {
    return (
      <motion.section
        layout
        transition={spring}
        className="mx-auto w-full max-w-4xl shrink-0"
        data-testid="execution-record-card"
        data-compact="true"
        aria-label="Execution Record"
      >
        <div className="rounded-[var(--radius-lg)] border border-line/70 bg-elevated/90 px-4 py-2.5 shadow-[var(--shadow-1)] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <ExecutionRecordStatusPill
              lifecycle={record.lifecycle}
              labelOverride={
                record.lifecycle === "queued" ? record.lifecycleLabel : undefined
              }
            />
            <div className="min-w-0 flex-1">
              {brief ? (
                <MorningBriefHero
                  brief={brief}
                  primaryAction={primary}
                  onPrimaryAction={handlePrimary}
                  compact
                />
              ) : (
                <>
                  <p className="truncate text-body-sm font-semibold text-text">{record.experiment}</p>
                  <p className="truncate text-micro text-text-3">{record.goal}</p>
                </>
              )}
            </div>
            <ExecutionRecordProgress lifecycle={record.lifecycle} />
            {primary && (
              <Button
                variant="primary"
                size="sm"
                className="hidden shrink-0 sm:inline-flex"
                data-testid={primary.testId}
                onClick={handlePrimary}
              >
                <Play size={13} className="mr-1" />
                {primary.label}
              </Button>
            )}
            <button
              type="button"
              onClick={() => toggleExecutionHeroExpanded()}
              className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-micro text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="Expand record details"
            >
              <ChevronDown size={14} />
              <span className="hidden sm:inline">Details</span>
            </button>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      key={record.id}
      layout
      variants={cardReveal}
      initial="hidden"
      animate="visible"
      transition={spring}
      className="mx-auto w-full max-w-3xl shrink-0"
      data-testid="execution-record-card"
      aria-label="Execution Record"
    >
      <div className="rounded-[var(--radius-xl)] border border-line/80 bg-elevated/95 px-6 py-6 shadow-[var(--shadow-2)] md:px-8 md:py-7">
        {showContract && (
          <div className="mb-4">
            <OurContractStrip profile={marketingProfile} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ExecutionRecordStatusPill
            lifecycle={record.lifecycle}
            labelOverride={
              record.lifecycle === "queued" ? record.lifecycleLabel : undefined
            }
          />
          <div className="flex items-center gap-2">
            <ExecutionRecordProgress lifecycle={record.lifecycle} />
            {runActive && (
              <button
                type="button"
                onClick={() => toggleExecutionHeroExpanded()}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-micro text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
              >
                <ChevronUp size={14} />
                Collapse
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3">
          {record.goal}
        </p>

        {brief ? (
          <div className="mt-4">
            <MorningBriefHero
              brief={brief}
              primaryAction={primary}
              onPrimaryAction={handlePrimary}
            />
          </div>
        ) : (
          <>
            <h1 className="mt-2 text-display text-[clamp(1.35rem,3.5vw,1.75rem)] font-semibold leading-tight text-text">
              {record.experiment}
            </h1>
            {primary && (
              <Button
                variant="primary"
                size="md"
                className="mt-6 w-full justify-center px-6 py-2.5 text-body-sm sm:w-auto sm:min-w-[220px]"
                data-testid={primary.testId}
                onClick={handlePrimary}
              >
                <Play size={16} className="mr-2" />
                {primary.label}
              </Button>
            )}
          </>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {realResults.length > 0 ? (
            realResults.map((chip) => (
              <ResultChip
                key={chip.id}
                label={chip.label}
                value={chip.value}
                tone={chip.tone === "ok" ? "ok" : chip.tone === "missing" ? "missing" : "neutral"}
              />
            ))
          ) : (
            <ResultChip label="Result" value="Not measured yet" tone="missing" />
          )}
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="mt-5 flex w-full items-center justify-between rounded-[var(--radius-md)] border border-line/60 bg-surface/40 px-3 py-2 text-left text-mini text-text-2 transition-colors hover:bg-surface-2/60"
        >
          <span>
            Done ({record.done.length})
            {record.learned ? " · Learnings captured" : ""}
            {!primary ? "" : ` · Next: ${record.next.label}`}
          </span>
          {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence initial={false}>
          {detailsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 border-t border-line/50 pt-4">
                {record.done.length > 0 ? (
                  <ul className="space-y-2">
                    {record.done.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-[var(--radius-sm)] border border-line/50 bg-surface/30 px-3 py-2 text-body-sm"
                      >
                        <span className="font-medium text-text">{item.label}</span>
                        {item.detail && (
                          <p className="mt-0.5 truncate text-mini text-text-3" title={item.detail}>
                            {item.detail}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-text-3">No entries yet — fills after a run or proof.</p>
                )}

                {record.learned && (
                  <blockquote className="border-l-2 border-accent/50 pl-3 text-body-sm italic leading-relaxed text-text-2">
                    {record.learned}
                  </blockquote>
                )}

                {!primary && (
                  <p className="text-body-sm text-text-2">
                    <span className="font-medium text-text">Next:</span> {record.next.label}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
