import { ChevronDown, ChevronUp, LayoutList, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { ExecutionRecordView } from "@shared/executionRecord";
import { Button } from "@renderer/components/ui/Button";
import { cardReveal } from "@renderer/design/animations";
import { ExecutionRecordProgress, ExecutionRecordStatusPill } from "./ExecutionRecordStatus";
import { useCommandSurfaceDispatch } from "./useCommandSurfaceDispatch";
import { CommandSurfaceGovernanceBanner } from "../CommandSurfaceGovernanceBanner";
import { useApp } from "@renderer/state/store";
import { parseBottleneckSentence, parseExperimentHeadline } from "./executionRecordUi";

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

export function ExecutionRecordCard({ record }: { record: ExecutionRecordView }) {
  const dispatch = useCommandSurfaceDispatch();
  const toggleWarRoomExpanded = useApp((s) => s.toggleWarRoomExpanded);
  const warRoomExpanded = useApp((s) => s.warRoomExpanded);
  const primary = record.next.action.kind !== "none" ? record.next.action : null;
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { headline, subline } = parseExperimentHeadline(record.experiment);
  const bottleneck = parseBottleneckSentence(record.bottleneckSentence);
  const realResults = record.results.filter((r) => r.id !== "results-empty");

  return (
    <motion.section
      key={record.id}
      variants={cardReveal}
      initial="hidden"
      animate="visible"
      className="mx-auto w-full max-w-3xl"
      data-testid="execution-record-card"
      aria-label="Execution Record"
    >
      {/* Hero — one focal column, Claude-clear */}
      <div className="rounded-[var(--radius-xl)] border border-line/80 bg-elevated/95 px-6 py-6 shadow-[var(--shadow-2)] md:px-8 md:py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ExecutionRecordStatusPill lifecycle={record.lifecycle} />
          <ExecutionRecordProgress lifecycle={record.lifecycle} />
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3">
          {record.goal}
        </p>

        <h1 className="mt-2 text-display text-[clamp(1.35rem,3.5vw,1.75rem)] font-semibold leading-tight text-text">
          {headline}
        </h1>

        {subline && (
          <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-text-2">{subline}</p>
        )}

        {bottleneck.constraint && (
          <p className="mt-3 text-mini text-text-3">
            <span className="text-text-2">Darboğaz:</span> {bottleneck.constraint}
            {bottleneck.move && (
              <>
                {" "}
                <span className="text-text-3">→</span>{" "}
                <span className="font-medium text-accent">{bottleneck.move}</span>
              </>
            )}
          </p>
        )}

        {primary && (
          <Button
            variant="primary"
            size="md"
            className="mt-6 w-full justify-center px-6 py-2.5 text-body-sm sm:w-auto sm:min-w-[220px]"
            data-testid={primary.testId}
            onClick={() => dispatch(primary)}
          >
            <Play size={16} className="mr-2" />
            {primary.label}
          </Button>
        )}

        {/* Scannable metrics — horizontal, not buried in grid */}
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
            <ResultChip label="Sonuç" value="Henüz ölçülmedi" tone="missing" />
          )}
        </div>

        {/* Progressive disclosure — detail lives here, not competing with hero */}
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="mt-5 flex w-full items-center justify-between rounded-[var(--radius-md)] border border-line/60 bg-surface/40 px-3 py-2 text-left text-mini text-text-2 transition-colors hover:bg-surface-2/60"
        >
          <span>
            Yapılan ({record.done.length})
            {record.learned ? " · Öğrenilen var" : ""}
            {!primary ? "" : ` · Sonraki: ${record.next.label}`}
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
                  <p className="text-body-sm text-text-3">Henüz kayıt yok — run veya kanıt sonrası dolar.</p>
                )}

                {record.learned && (
                  <blockquote className="border-l-2 border-accent/50 pl-3 text-body-sm italic leading-relaxed text-text-2">
                    {record.learned}
                  </blockquote>
                )}

                {!primary && (
                  <p className="text-body-sm text-text-2">
                    <span className="font-medium text-text">Sonraki:</span> {record.next.label}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex justify-end">
          <Button variant="subtle" size="sm" onClick={() => toggleWarRoomExpanded()}>
            <LayoutList size={14} className="mr-1" />
            {warRoomExpanded ? "Backstage kapat" : "Backstage"}
          </Button>
        </div>

        {record.governance && (
          <div className="mt-3">
            <CommandSurfaceGovernanceBanner governance={record.governance} />
          </div>
        )}
      </div>
    </motion.section>
  );
}
