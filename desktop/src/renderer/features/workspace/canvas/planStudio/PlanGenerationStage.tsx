import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, Loader2, Sparkles, Target } from "lucide-react";
import type { PlanPlaybook, PlaybookStub, ReadinessScoreWithRationale } from "@shared/planPlaybooks";
import type { PlanStatusLine } from "@shared/planGeneration";
import { springSoft, staggerItem, staggerList } from "@renderer/design/animations";
import { PlaybookCard } from "./PlaybookCard";
import { useApp } from "@renderer/state/store";

const PHASES = [
  { id: "outline", label: "Outline" },
  { id: "playbooks", label: "Playbooks" },
  { id: "finalizing", label: "Readiness" },
] as const;

const KIND_ICON: Record<PlanStatusLine["kind"], typeof Check> = {
  connect: Sparkles,
  outline: BookOpen,
  playbook: Target,
  readiness: Sparkles,
  status: Loader2,
};

/**
 * Generation theater — the ~45s wait staged as three phases with live
 * artifacts: thesis card, materializing playbook cards (per-playbook loading),
 * and readiness bars filling during the finalizing phase.
 */
export function PlanGenerationStage({
  status,
  phase,
  thesis,
  narrativeHook,
  stubs,
  streamingPlaybooks,
  streamingReadiness,
  statusLog = [],
  loadingPlaybookIds = [],
}: {
  status: string;
  phase?: "idle" | "outline" | "playbooks" | "finalizing";
  thesis?: string;
  narrativeHook?: string;
  stubs: PlaybookStub[];
  streamingPlaybooks: PlanPlaybook[];
  streamingReadiness?: ReadinessScoreWithRationale[];
  statusLog?: PlanStatusLine[];
  loadingPlaybookIds?: string[];
}) {
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const activePhase = phase === "idle" ? "outline" : phase ?? "outline";
  const [visibleReadiness, setVisibleReadiness] = useState(0);

  useEffect(() => {
    const n = streamingReadiness?.length ?? 0;
    if (n === 0) {
      setVisibleReadiness(0);
      return;
    }
    if (reducedMotion) {
      setVisibleReadiness(n);
      return;
    }
    setVisibleReadiness(0);
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setVisibleReadiness(i);
      if (i >= n) window.clearInterval(t);
    }, 120);
    return () => window.clearInterval(t);
  }, [streamingReadiness, reducedMotion]);

  const loadingSet = new Set(loadingPlaybookIds);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
        {PHASES.map((p, i) => {
          const done =
            (p.id === "outline" && (thesis || stubs.length > 0)) ||
            (p.id === "playbooks" && streamingPlaybooks.length >= stubs.length && stubs.length > 0) ||
            (p.id === "finalizing" && (streamingReadiness?.length ?? 0) > 0);
          const active = activePhase === p.id;
          return (
            <div key={p.id} className="flex items-center gap-2">
              {i > 0 && <span className="text-text-3">→</span>}
              <span
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-micro ${
                  active ? "bg-accent-soft/40 text-accent" : done ? "text-ok" : "text-text-3"
                }`}
              >
                {done && !active ? <Check size={11} /> : null}
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="rounded-[var(--radius-md)] border border-line/70 bg-surface/40 px-4 py-3"
        role="log"
        aria-live="polite"
        aria-label="Plan generation status"
      >
        <div className="mb-2 text-micro font-semibold uppercase tracking-wider text-text-3">
          Status feed
        </div>
        <ul className="max-h-36 space-y-1 overflow-y-auto text-mini text-text-2">
          {statusLog.map((line, i) => {
            const Icon = KIND_ICON[line.kind];
            const isLast = i === statusLog.length - 1;
            return (
              <li key={line.id} className="flex items-start gap-2">
                {isLast && line.kind === "status" ? (
                  <Loader2 size={11} className="mt-0.5 shrink-0 animate-spin text-accent" />
                ) : (
                  <Icon size={11} className="mt-0.5 shrink-0 text-ok" />
                )}
                <span className={isLast ? "text-text" : "text-text-2"}>{line.message}</span>
              </li>
            );
          })}
          {statusLog.length === 0 && (
            <li className="flex items-center gap-2 text-text-3">
              <Loader2 size={11} className="animate-spin" /> {status || "Building your plan studio…"}
            </li>
          )}
        </ul>
      </div>

      {(thesis || narrativeHook) && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[var(--radius-lg)] border border-line bg-surface p-5"
        >
          {thesis && (
            <motion.p layoutId="plan-thesis" className="text-h3 font-semibold text-text">
              {thesis}
            </motion.p>
          )}
          {narrativeHook && thesis !== narrativeHook && (
            <p className="mt-2 text-body-sm leading-relaxed text-text-2">{narrativeHook}</p>
          )}
        </motion.div>
      )}

      {stubs.length > 0 && (
        <div>
          <div className="mb-3 text-micro font-semibold uppercase tracking-wider text-text-3">
            Playbook structure
          </div>
          <motion.div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            variants={reducedMotion ? undefined : staggerList}
            initial={reducedMotion ? false : "hidden"}
            animate={reducedMotion ? undefined : "visible"}
          >
            {stubs.map((stub) => {
              const full = streamingPlaybooks.find((p) => p.id === stub.id);
              const loading = !full && loadingSet.has(stub.id);
              return (
                <motion.div key={stub.id} variants={reducedMotion ? undefined : staggerItem}>
                  <PlaybookCard
                    playbook={full ?? stub}
                    done={0}
                    total={full?.tasks.length ?? 0}
                    loading={loading}
                    onSelect={() => {}}
                  />
                  {(stub.whyIncluded || full) && (
                    <p className="mt-1.5 px-1 text-micro leading-relaxed text-text-3">
                      Why · {stub.whyIncluded ?? "Supports your launch thesis"}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {activePhase === "finalizing" && (streamingReadiness?.length ?? 0) > 0 && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[var(--radius-lg)] border border-line bg-surface p-5"
        >
          <div className="mb-3 text-micro font-semibold uppercase tracking-wider text-text-3">
            Launch readiness
          </div>
          <div className="space-y-2.5">
            {streamingReadiness!.slice(0, visibleReadiness).map((r, i) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-mini text-text-2">{r.label}</span>
                <div className="h-2 flex-1 rounded-full bg-elevated">
                  <motion.div
                    className={`h-full rounded-full ${r.score < 50 ? "bg-warn" : "bg-accent"}`}
                    initial={reducedMotion ? false : { width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, r.score))}%` }}
                    transition={{ ...springSoft, delay: reducedMotion ? 0 : i * 0.08 }}
                  />
                </div>
                <span className="w-8 text-right text-mini tabular-nums text-text">{r.score}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
