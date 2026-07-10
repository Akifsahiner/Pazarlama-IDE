import {
  CAMPAIGN_PHASE_LABELS,
  CAMPAIGN_TIMELINE_STEPS,
  type CampaignSession,
} from "./campaignSession";
import type { PlanProgressSnapshot } from "./planProgress";
import type { ExperimentRun, Finding, SessionOutcome } from "./types";

export interface SessionReportInput {
  projectName?: string;
  session: CampaignSession | null | undefined;
  planProgress?: PlanProgressSnapshot | null;
  outcomes: SessionOutcome[];
  findings: Finding[];
  experiments?: ExperimentRun[];
  nextStepLabel?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/** Campaign session + outcomes → weekly markdown report (Faz 10). */
export function buildSessionReportMarkdown(input: SessionReportInput): string {
  const {
    projectName,
    session,
    planProgress,
    outcomes,
    findings,
    experiments = [],
    nextStepLabel,
  } = input;
  const lines: string[] = [
    `# Weekly session report${projectName ? ` — ${projectName}` : ""}`,
    "",
    `_Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC_`,
    "",
  ];

  if (session) {
    lines.push(
      "## Campaign",
      "",
      `- **Goal:** ${session.goal}`,
      `- **Phase:** ${CAMPAIGN_PHASE_LABELS[session.phase]}`,
      `- **Started:** ${formatDate(session.startedAt)}`,
      `- **Runs:** ${session.runIds.length} · **Assets:** ${session.assetIds.length}`,
      "",
    );
    if (planProgress?.computed.total) {
      const { done, total } = planProgress.computed;
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      lines.push(`- **Plan progress:** ${done}/${total} tasks (${percent}%)`, "");
    }
    const stepIdx = CAMPAIGN_TIMELINE_STEPS.findIndex((s) => s.phases.includes(session.phase));
    lines.push("### Timeline", "");
    for (let i = 0; i < CAMPAIGN_TIMELINE_STEPS.length; i++) {
      const step = CAMPAIGN_TIMELINE_STEPS[i]!;
      const mark = i < stepIdx ? "✓" : i === stepIdx ? "→" : "○";
      lines.push(`- ${mark} ${step.label}`);
    }
    lines.push("");
    if (session.milestones.length > 0) {
      lines.push("### Milestones", "");
      for (const m of session.milestones.slice(-12)) {
        lines.push(`- ${formatDate(m.at)} — ${m.label} (${m.kind})`);
      }
      lines.push("");
    }
  }

  lines.push("## Session outcomes", "");
  if (outcomes.length === 0) {
    lines.push("_No outcomes recorded yet._", "");
  } else {
    for (const o of outcomes) {
      const base = `- **${o.label}**${o.channel ? ` (${o.channel})` : ""}`;
      lines.push(o.detail ? `${base}\n  ${o.detail}` : base);
    }
    lines.push("");
  }

  if (findings.length > 0) {
    lines.push("## Browser findings", "");
    for (const f of findings.slice(0, 15)) {
      lines.push(`- **${f.title}** (${f.severity})`);
      if (f.evidence) lines.push(`  - Evidence: ${f.evidence.slice(0, 280)}`);
      if (f.suggestion) lines.push(`  - Suggestion: ${f.suggestion.slice(0, 200)}`);
    }
    lines.push("");
  }

  if (experiments.length > 0) {
    lines.push("## Experiments", "");
    for (const e of experiments.slice(0, 10)) {
      lines.push(
        `- **${e.hypothesis.slice(0, 100)}** — ${e.outcome}${e.metric ? ` (${e.metric.name}: ${e.metric.value})` : ""}`,
      );
    }
    lines.push("");
  }

  if (nextStepLabel) {
    lines.push(`## Next up`, "", nextStepLabel, "");
  }

  lines.push("— Marketing IDE · Draft & measure — you publish and send.");
  return lines.join("\n");
}

/** Styled HTML for print-to-PDF from browser. */
export function buildSessionReportHtml(markdown: string, title: string): string {
  const body = markdown
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #18181b; line-height: 1.5; }
    h1 { font-size: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px; }
    h2 { font-size: 18px; margin-top: 24px; }
    h3 { font-size: 14px; color: #52525b; }
    li { margin: 4px 0; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body><p>${body}</p></body>
</html>`;
}
