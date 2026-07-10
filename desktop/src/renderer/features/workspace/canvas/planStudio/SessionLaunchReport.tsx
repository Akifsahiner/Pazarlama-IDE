import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCopy,
  Download,
  FileText,
  FlaskConical,
  Globe,
  Link2,
  PenLine,
  Printer,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { SessionOutcome } from "@shared/types";
import { normalizePlan } from "@shared/planPlaybooks";
import { nextActionableTask } from "@shared/planProgress";
import { tierHasFeature } from "@shared/tierFeatures";
import {
  buildSessionReportMarkdown,
} from "@shared/sessionReport";
import {
  downloadSessionReportMarkdown,
  downloadSessionReportPdf,
  printSessionReportPdf,
} from "@renderer/lib/exportDownload";
import { apiShareReport } from "@renderer/lib/api";
import { AgentMarkdown } from "@renderer/features/agent/AgentMarkdown";
import { useApp } from "@renderer/state/store";

const KIND_ICON: Record<SessionOutcome["kind"], typeof FileText> = {
  run: Check,
  research: Globe,
  asset: FileText,
  copy: PenLine,
  plan: FlaskConical,
};

const KIND_LABEL: Record<SessionOutcome["kind"], string> = {
  run: "Tasks",
  research: "Research",
  asset: "Assets",
  copy: "Copy",
  plan: "Plan",
};

const KIND_ORDER: SessionOutcome["kind"][] = ["plan", "run", "research", "asset", "copy"];

/** Designed session report — grouped outcomes + browser findings + next-step CTA. */
export function SessionLaunchReport() {
  const outcomes = useApp((s) => s.sessionOutcomes);
  const findings = useApp((s) => s.browser.findings);
  const project = useApp((s) => s.project);
  const planRaw = useApp((s) => s.plan);
  const planProgress = useApp((s) => s.planProgress);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const settings = useApp((s) => s.settings);
  const authEnabled = useApp((s) => s.auth.authEnabled);
  const serverProjectId = useApp((s) => s.activeProjectId);
  const tierFeatures = useApp((s) => s.tierFeatures);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const canShare = tierHasFeature(tierFeatures, "client_reports") && !!serverProjectId;

  const nextStep = useMemo(() => {
    const plan = planRaw ? normalizePlan(planRaw) : null;
    if (!plan || !planProgress) return null;
    const task = nextActionableTask(plan, planProgress.byTaskId);
    if (!task) return null;
    const pb = plan.playbooks.find((p) => p.id === task.playbookId);
    return {
      label: `${pb?.title ?? task.playbookId ?? "Plan"} · Day ${task.day} — ${task.title}`,
      playbookId: task.playbookId,
      taskId: task.id,
    };
  }, [planRaw, planProgress]);

  const grouped = useMemo(() => {
    const map = new Map<SessionOutcome["kind"], SessionOutcome[]>();
    for (const o of outcomes) {
      const list = map.get(o.kind) ?? [];
      list.push(o);
      map.set(o.kind, list);
    }
    return KIND_ORDER.filter((k) => (map.get(k)?.length ?? 0) > 0).map((kind) => ({
      kind,
      items: [...(map.get(kind) ?? [])].reverse(),
    }));
  }, [outcomes]);

  const reportInput = useMemo(
    () => ({
      projectName: project?.name,
      session: marketingProfile?.campaign_session ?? null,
      planProgress,
      outcomes,
      findings,
      experiments: marketingProfile?.previous_experiments ?? [],
      nextStepLabel: nextStep?.label,
    }),
    [
      project?.name,
      marketingProfile?.campaign_session,
      marketingProfile?.previous_experiments,
      planProgress,
      outcomes,
      findings,
      nextStep,
    ],
  );

  const reportMarkdown = useMemo(
    () => buildSessionReportMarkdown(reportInput),
    [reportInput],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const downloadReport = () => {
    downloadSessionReportMarkdown(reportInput);
  };

  const downloadReportPdf = () => {
    void downloadSessionReportPdf(reportInput);
  };

  const printReportPdf = () => {
    printSessionReportPdf(reportInput);
  };

  const copySlack = async () => {
    const slack = reportMarkdown.replace(/^# /, "*").replace(/\*\*Next up:\*\*/g, "*Next up:*");
    try {
      await navigator.clipboard.writeText(slack);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const shareWithClient = async () => {
    if (!serverProjectId || shareBusy) return;
    setShareBusy(true);
    try {
      const title = project?.name ? `${project.name} — session report` : "Session launch report";
      const { share } = await apiShareReport(settings, authEnabled, {
        projectId: serverProjectId,
        title,
        reportMd: reportMarkdown,
        ttlDays: 14,
      });
      const base = settings.serverUrl.replace(/\/$/, "");
      const url = `${base}${share.urlPath}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* tier gate or offline */
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <section className="surface rounded-[var(--radius-lg)] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider">
          <Sparkles size={14} className="text-accent" /> Session launch report
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            {copied ? <Check size={11} className="text-ok" /> : <ClipboardCopy size={11} />}
            {copied ? "Copied" : "Copy report"}
          </button>
          <button
            type="button"
            onClick={downloadReport}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            <Download size={11} /> Download .md
          </button>
          <button
            type="button"
            onClick={downloadReportPdf}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            <Download size={11} /> Download PDF
          </button>
          <button
            type="button"
            onClick={printReportPdf}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            <Printer size={11} /> Print
          </button>
          <button
            type="button"
            onClick={() => void copySlack()}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            <ClipboardCopy size={11} /> Copy for Slack
          </button>
          {canShare && (
            <button
              type="button"
              disabled={shareBusy}
              onClick={() => void shareWithClient()}
              className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
              data-testid="share-client-report"
            >
              <Link2 size={11} /> {shareBusy ? "Sharing…" : "Share with client"}
            </button>
          )}
        </div>
      </div>
      {shareUrl && (
        <p className="mb-2 text-micro text-ok">
          Client link copied — expires in 14 days.{" "}
          <span className="font-mono text-text-3">{shareUrl}</span>
        </p>
      )}

      {grouped.length === 0 && findings.length === 0 ? (
        <p className="text-body-sm text-text-2">
          Complete a plan task, browser teardown, or copy draft — your GTM progress summary builds here.
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ kind, items }) => {
            const Icon = KIND_ICON[kind] ?? FileText;
            return (
              <section key={kind}>
                <div className="mb-2 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-text-3">
                  <Icon size={12} className="text-accent" />
                  {KIND_LABEL[kind]}
                  <span className="font-normal normal-case text-text-2">({items.length})</span>
                </div>
                <ul className="space-y-1.5">
                  {items.slice(0, 6).map((o) => (
                    <li key={o.id} className="text-body-sm text-text-2">
                      <div className="flex items-start gap-2">
                        <span className="text-text">{o.label}</span>
                        {o.channel && <span className="text-micro text-text-3">· {o.channel}</span>}
                      </div>
                      {o.detail && (
                        <p className="mt-0.5 text-caption text-text-3 line-clamp-2">{o.detail}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {findings.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-text-3">
                <Globe size={12} className="text-accent" />
                Browser findings
                <span className="font-normal normal-case text-text-2">({findings.length})</span>
              </div>
              <ul className="space-y-2">
                {findings.slice(0, 8).map((f) => (
                  <li key={f.id} className="rounded-[var(--radius-sm)] border border-line bg-surface-2/60 px-3 py-2">
                    <div className="text-body-sm text-text">
                      {f.title}{" "}
                      <span className="text-micro text-text-3">({f.severity})</span>
                    </div>
                    {f.evidence && (
                      <p className="mt-1 text-caption text-text-2 line-clamp-2">{f.evidence}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {nextStep && (
        <button
          type="button"
          onClick={() =>
            focusPlanTask({
              playbookId: nextStep.playbookId,
              taskId: nextStep.taskId,
              startRun: false,
            })
          }
          className="mt-4 flex w-full items-center justify-between gap-1.5 rounded-[var(--radius-md)] border border-accent-border bg-accent-soft/30 px-3 py-2 text-left text-label text-text transition-colors hover:bg-accent-soft/50"
        >
          <span>
            <span className="text-caption uppercase tracking-wide">Next up</span>
            <span className="mt-0.5 block">{nextStep.label}</span>
          </span>
          <ArrowRight size={14} className="shrink-0 text-accent" />
        </button>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          aria-expanded={previewOpen}
          className="flex w-full items-center justify-between text-left text-micro text-text-2 hover:text-text"
        >
          Copy formatted report
          <ChevronDown
            size={14}
            className={`text-text-3 transition-transform ${previewOpen ? "rotate-180" : ""}`}
          />
        </button>
        {previewOpen && (
          <div className="agent-prose mt-2 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3 text-body-sm">
            <AgentMarkdown content={reportMarkdown} />
          </div>
        )}
      </div>
    </section>
  );
}
