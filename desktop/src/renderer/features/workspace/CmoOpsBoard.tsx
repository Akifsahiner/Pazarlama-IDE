import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  User,
  Bot,
  Users,
} from "lucide-react";
import type { CmoOpsCadence, CmoOpsTask } from "@shared/cmoOpsCadence";
import {
  getFocusTasks,
  getNowTask,
  isWeekReviewDue,
  needsOpsProof,
  opsCadenceProgress,
} from "@shared/cmoOpsCadence";
import { allOpsTasksTerminal, isWeekCloseReady } from "@shared/cmoProofLoop";
import type { ChannelThesis } from "@shared/cmoIntake";
import { taskContractEffortMinutes } from "@shared/marketingTaskContract";
import { CmoPivotCard, DelegateVerdictCard, DistributionVerdictCard, InfluencerVerdictCard } from "@renderer/features/workspace/CmoPivotCard";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { useMemo, useState } from "react";
import { useApp } from "@renderer/state/store";
import { resolveDelegateOperator } from "@shared/cmoDelegateOperator";
import type { BrowserEvidenceProof } from "@shared/browserVerify";

function ValidationBadge({ label, passed, detail }: { label: string; passed: boolean; detail?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${
        passed ? "border-ok/35 bg-ok/10 text-ok" : "border-warn/35 bg-warn-soft/20 text-warn"
      }`}
      title={detail ?? label}
    >
      {passed ? "✓" : "✗"} {label}
    </span>
  );
}

function BrowserEvidenceProofChip({ evidence }: { evidence: BrowserEvidenceProof }) {
  const passCount = evidence.validations.filter((v) => v.passed).length;
  const total = evidence.validations.length;

  return (
    <div
      className="mt-1 flex flex-col gap-1"
      data-testid="ops-browser-evidence-chip"
    >
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-medium text-ok">
          Verified {passCount}/{total || "?"}
        </span>
        {evidence.url && (
          <a
            href={evidence.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-[10px] text-accent hover:underline"
          >
            Live URL <ExternalLink size={9} />
          </a>
        )}
        {evidence.screenshot_path && (
          <button
            type="button"
            className="text-[10px] text-text-3 hover:text-accent hover:underline"
            onClick={() => void window.api.shell.revealInFolder(evidence.screenshot_path!)}
          >
            Screenshot
          </button>
        )}
      </div>
      {evidence.validations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {evidence.validations.map((v) => (
            <ValidationBadge key={v.label} label={v.label} passed={v.passed} detail={v.detail} />
          ))}
        </div>
      )}
    </div>
  );
}

const OWNER_META = {
  system: { label: "IDE ships", icon: Bot, tone: "accent" as const },
  user: { label: "You execute", icon: User, tone: "marketing" as const },
  delegate: { label: "Delegate", icon: Users, tone: "warn" as const },
};

const SLOT_LABEL: Record<CmoOpsTask["day_slot"], string> = {
  now: "Now",
  today: "Today",
  up_next: "Up next",
  later: "Queued",
};

function StatusBadge({ task }: { task: CmoOpsTask }) {
  if (task.status === "done") {
    return (
      <Badge tone="ok">
        <CheckCircle2 size={10} className="mr-1 inline" />
        Done
      </Badge>
    );
  }
  if (task.status === "skipped") return <Badge tone="neutral">Skipped</Badge>;
  if (task.status === "in_progress") {
    return (
      <Badge tone={task.day_slot === "now" ? "accent" : "neutral"}>
        {task.day_slot === "now" ? (
          <>
            <Loader2 size={10} className="mr-1 inline animate-spin" />
            In progress
          </>
        ) : (
          SLOT_LABEL[task.day_slot]
        )}
      </Badge>
    );
  }
  return <Badge tone="neutral">{SLOT_LABEL[task.day_slot]}</Badge>;
}

function TaskActions({ task, cadence }: { task: CmoOpsTask; cadence: CmoOpsCadence }) {
  const openOpsProofModal = useApp((s) => s.openOpsProofModal);
  const startOpsSystemTask = useApp((s) => s.startOpsSystemTask);
  const skipOpsTask = useApp((s) => s.skipOpsTask);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const run = useApp((s) => s.run);

  if (task.status === "done" || task.status === "skipped") {
    if (task.proof?.browser_evidence) {
      return <BrowserEvidenceProofChip evidence={task.proof.browser_evidence} />;
    }
    if (task.proof?.urls?.length) {
      return (
        <div className="flex flex-wrap gap-1">
          {task.proof.urls.map((url, index) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              data-testid={index === 0 ? "ops-proof-asset-link" : undefined}
              className="inline-flex items-center gap-0.5 text-[10px] text-accent hover:underline"
            >
              {index === 0 ? "Live asset" : "Proof"} <ExternalLink size={9} />
            </a>
          ))}
        </div>
      );
    }
    if (task.proof?.kpi_value != null) {
      return (
        <span className="text-[10px] text-ok">
          KPI: {task.proof.kpi_value}
          {task.proof.kpi_unit ? ` ${task.proof.kpi_unit}` : ""}
        </span>
      );
    }
    if (task.proof?.commit_sha) {
      return <span className="text-[10px] text-text-3">commit {task.proof.commit_sha.slice(0, 7)}</span>;
    }
    return null;
  }

  const isNow = getNowTask(cadence)?.id === task.id;

  if (task.owner === "system") {
    const linked = task.linked_run_id && run?.runId === task.linked_run_id;
    return (
      <div className="flex flex-wrap gap-1.5">
        {linked || run?.status === "running" ? (
          <Button variant="subtle" size="sm" onClick={() => setActiveCanvas("run")}>
            View run
          </Button>
        ) : isNow ? (
          <Button
            variant="primary"
            size="sm"
            data-testid="ops-task-start-ide"
            onClick={() => startOpsSystemTask(task.id)}
          >
            Start in IDE
          </Button>
        ) : null}
        {isNow && (
          <Button
            variant="ghost"
            size="sm"
            data-testid="ops-task-skip"
            onClick={() => skipOpsTask(task.id, "Deferred")}
          >
            Skip
          </Button>
        )}
      </div>
    );
  }

  if (needsOpsProof(task.owner) && isNow) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="primary"
          size="sm"
          data-testid="ops-task-mark-done"
          onClick={() => openOpsProofModal(task.id)}
        >
          Mark done
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-testid="ops-task-skip"
          onClick={() => skipOpsTask(task.id, "Deferred")}
        >
          Skip
        </Button>
      </div>
    );
  }

  return <span className="text-[10px] text-text-3">Blocked</span>;
}

function TaskContractDetails({ task }: { task: CmoOpsTask }) {
  const [copied, setCopied] = useState<string | null>(null);
  const effort =
    task.estimated_effort_minutes ??
    (task.execution_mode ? taskContractEffortMinutes(task.execution_mode) : undefined);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mt-2 space-y-2 border-t border-line/60 pt-2" data-testid="ops-task-contract">
      {task.deliverable && (
        <p className="text-[10px] font-semibold text-text">
          Deliverable: <span className="font-normal text-text-2">{task.deliverable}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {effort != null && <Badge tone="neutral">~{effort}m</Badge>}
        {task.execution_mode && (
          <Badge tone="neutral">{task.execution_mode.replace(/_/g, " ")}</Badge>
        )}
        {task.metric?.measurable && (
          <Badge tone="accent">
            KPI: {task.metric.name}
            {task.metric.target != null ? ` ≥ ${task.metric.target}` : ""}
          </Badge>
        )}
      </div>
      {task.inputs && task.inputs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.inputs.map((input) => (
            <span
              key={`${input.label}-${input.ref ?? input.value}`}
              className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[9px] text-text-3"
            >
              {input.label}
              {input.ref ? `: ${input.ref}` : input.value ? `: ${input.value}` : ""}
            </span>
          ))}
        </div>
      )}
      {task.human_execution_asset?.copy_blocks.map((block) => (
        <div key={block.id} className="rounded border border-line bg-surface-2 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-text-2">{block.label}</span>
            <Button
              variant="ghost"
              size="sm"
              data-testid={`ops-copy-${block.id}`}
              onClick={() => void copyText(block.id, block.body)}
            >
              {copied === block.id ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[10px] text-text-3">{block.body}</p>
        </div>
      ))}
      {task.if_failed && (
        <p className="text-[10px] text-warn">If failed: {task.if_failed}</p>
      )}
    </div>
  );
}

function OpsTaskRow({
  task,
  index,
  cadence,
}: {
  task: CmoOpsTask;
  index: number;
  cadence: CmoOpsCadence;
}) {
  const meta = OWNER_META[task.owner];
  const OwnerIcon = meta.icon;
  const isNow = getNowTask(cadence)?.id === task.id;

  return (
    <tr
      className={
        isNow && task.status !== "done"
          ? "bg-accent-soft/15"
          : task.status === "done"
            ? "opacity-70"
            : undefined
      }
      data-testid={`ops-task-${task.id}`}
    >
      <td className="px-3 py-2.5 text-[10px] tabular-nums text-text-3">#{index + 1}</td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-2">
          <OwnerIcon size={11} className="text-text-3" />
          {meta.label}
        </span>
      </td>
      <td className="min-w-[200px] px-3 py-2.5">
        <p className="text-body-sm font-medium text-text">{task.what}</p>
        <p className="mt-0.5 text-[10px] text-text-3">{task.why}</p>
        <TaskContractDetails task={task} />
      </td>
      <td className="hidden px-3 py-2.5 text-[10px] text-text-3 lg:table-cell">
        {task.done_when}
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge task={task} />
      </td>
      <td className="px-3 py-2.5 text-right">
        <TaskActions task={task} cadence={cadence} />
      </td>
    </tr>
  );
}

export function CmoOpsBoard({
  cadence,
  thesis,
  compact = false,
}: {
  cadence: CmoOpsCadence;
  thesis?: ChannelThesis | null;
  compact?: boolean;
}) {
  const openWeekReviewModal = useApp((s) => s.openWeekReviewModal);
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const appendEvent = useApp((s) => s.appendEvent);
  const distributionOperator = useApp(
    (s) => s.distributionOperator ?? s.marketingProfile?.distribution_operator,
  );
  const influencerOperator = useApp(
    (s) => s.influencerOperator ?? s.marketingProfile?.influencer_operator,
  );
  const delegateRaw = useApp(
    (s) =>
      s.delegateOperator ??
      s.delegateWorkspace ??
      s.marketingProfile?.delegate_operator ??
      s.marketingProfile?.lane_c_workspace,
  );
  const delegateOperator = useMemo(
    () => resolveDelegateOperator(delegateRaw, thesis),
    [delegateRaw, thesis],
  );
  const progress = opsCadenceProgress(cadence);
  const focus = getFocusTasks(cadence, 3);
  const reviewDue =
    cadence.week_review.status === "due" ||
    isWeekReviewDue(cadence) ||
    (allOpsTasksTerminal(cadence) && cadence.week_review.status === "pending");
  const weekCloseReady = isWeekCloseReady(cadence);
  const nextWeek = cadence.week_index + 1;

  return (
    <Card
      className="border-accent/20"
      data-testid="cmo-ops-board"
      role="region"
      aria-label={`CMO Week ${cadence.week_index} operations`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            War room · Week {cadence.week_index} · Day {cadence.day_index}
          </div>
          <h2 className={`font-semibold text-text ${compact ? "text-body" : "text-h3"}`}>
            {thesis?.title ?? "Operating cadence"}
          </h2>
          {thesis && <p className="mt-0.5 text-mini text-text-2">{thesis.headline}</p>}
        </div>
        <div className="text-right">
          <div className="text-h3 font-semibold tabular-nums text-text">
            {progress.done}/{progress.total}
          </div>
          <div className="text-[10px] text-text-3">tasks done</div>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {!compact && focus.length > 0 && (
        <p className="mt-3 text-mini text-text-2">
          <span className="font-semibold text-text">Today&apos;s focus</span> — {focus.length} task
          {focus.length === 1 ? "" : "s"} unlocked. Complete in order; user tasks need proof.
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-line">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[10px] font-semibold uppercase tracking-wide text-text-3">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Task</th>
              <th className="hidden px-3 py-2 lg:table-cell">Done when</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cadence.tasks.map((task, i) => (
              <OpsTaskRow key={task.id} task={task} index={i} cadence={cadence} />
            ))}
          </tbody>
        </table>
      </div>

      {reviewDue && cadence.week_review.status !== "completed" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-warn/30 bg-warn-soft/15 px-3 py-2.5">
          <div>
            <p className="text-body-sm font-medium text-text">
              Week {cadence.week_index} ops complete — start Week {nextWeek} or adjust thesis
            </p>
            <p className="text-mini text-text-2">
              {weekCloseReady
                ? "KPI logged — memory saved automatically when you start the next week."
                : "Finish remaining ops tasks or log KPI proof before starting the next week."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {weekCloseReady && (
              <Button
                variant="primary"
                size="sm"
                data-testid="ops-start-next-cycle"
                onClick={() => {
                  const pivot = cadence.pivot_suggestion;
                  const suggested = pivot?.suggested_thesis_ids[0];
                  const err = startNextCmoCycle({
                    thesisId: suggested,
                    mode:
                      suggested && pivot && !pivot.dismissed_at && pivot.verdict === "flat"
                        ? "pivot"
                        : "double_down",
                  });
                  if (err) appendEvent({ role: "system", kind: "error", text: err });
                }}
              >
                Start Week {nextWeek}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              data-testid="ops-week-review-open"
              onClick={() => openWeekReviewModal()}
            >
              {weekCloseReady ? "Add notes (optional)" : "Log KPI / notes"}
            </Button>
          </div>
        </div>
      )}

      {cadence.pivot_suggestion && <CmoPivotCard pivot={cadence.pivot_suggestion} />}

      {!cadence.pivot_suggestion &&
        distributionOperator?.verdict &&
        (distributionOperator.verdict.kind === "scale" ||
          distributionOperator.verdict.kind === "double_down") && (
          <DistributionVerdictCard verdict={distributionOperator.verdict} />
        )}

      {!cadence.pivot_suggestion &&
        !distributionOperator?.verdict &&
        influencerOperator?.verdict &&
        (influencerOperator.verdict.kind === "scale" ||
          influencerOperator.verdict.kind === "double_down") && (
          <InfluencerVerdictCard verdict={influencerOperator.verdict} />
        )}

      {!cadence.pivot_suggestion &&
        !distributionOperator?.verdict &&
        !influencerOperator?.verdict &&
        delegateOperator?.verdict &&
        (delegateOperator.verdict.kind === "promote" ||
          delegateOperator.verdict.kind === "extend") && (
          <DelegateVerdictCard verdict={delegateOperator.verdict} />
        )}

      {cadence.week_review.status === "completed" && cadence.week_review.summary && (
        <p className="mt-3 text-mini text-text-2">
          <span className="font-semibold text-ok">Week archive:</span> {cadence.week_review.summary}
        </p>
      )}
    </Card>
  );
}
