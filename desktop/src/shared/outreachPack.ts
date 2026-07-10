import type { Finding, MarketingAsset } from "./types";
import { extractLeads, type LeadRow, type ThreadLineForExport } from "./leadExport";

export interface OutreachMessage {
  lead: string;
  kind: "first_touch" | "follow_up_1" | "follow_up_2" | "other";
  subject?: string;
  body: string;
}

export interface OutreachPack {
  projectName: string;
  generatedAt: string;
  leads: LeadRow[];
  messages: OutreachMessage[];
  markdown: string;
}

export function parseEmailAsset(asset: MarketingAsset): OutreachMessage | null {
  if (asset.type !== "email" && !asset.after.includes("@")) return null;
  const text = asset.after;
  const subjectMatch = text.match(/^Subject:\s*(.+)$/im);
  const subject = subjectMatch?.[1]?.trim();
  const body = subjectMatch ? text.replace(/^Subject:.*$/im, "").trim() : text.trim();
  const lead = asset.targetFile?.split("/").pop()?.replace(/\.md$/, "") ?? "Lead";
  return { lead, kind: "other", subject, body };
}

export function buildOutreachPack(input: {
  projectName: string;
  thread: ThreadLineForExport[];
  findings: Finding[];
  emailAssets: MarketingAsset[];
}): OutreachPack {
  const leads = extractLeads({ findings: input.findings, thread: input.thread });
  const messages: OutreachMessage[] = [];

  for (const asset of input.emailAssets) {
    const msg = parseEmailAsset(asset);
    if (msg) messages.push(msg);
  }

  for (const ev of input.thread) {
    if (ev.role !== "agent" || !ev.text) continue;
    if (!/first touch|follow-up|follow up|outreach/i.test(ev.text)) continue;
    messages.push({ lead: "From chat", kind: "other", body: ev.text.slice(0, 4000) });
  }

  const generatedAt = new Date().toISOString();
  const markdown = renderOutreachMarkdown(input.projectName, generatedAt, leads, messages);

  return { projectName: input.projectName, generatedAt, leads, messages, markdown };
}

function renderOutreachMarkdown(
  projectName: string,
  generatedAt: string,
  leads: LeadRow[],
  messages: OutreachMessage[],
): string {
  const date = generatedAt.slice(0, 10);
  const lines: string[] = [
    `# Outreach pack — ${projectName} — ${date}`,
    "",
    "## Leads",
    "",
  ];

  if (leads.length === 0) {
    lines.push("_No structured leads yet — run lead research first._", "");
  } else {
    for (const l of leads) {
      lines.push(
        `### ${l.name}`,
        `- Company: ${l.company || "—"}`,
        `- Fit: ${l.fit_evidence || "—"}`,
        `- Why now: ${l.why_now || "—"}`,
        `- Source: ${l.source_url || "—"}`,
        "",
      );
    }
  }

  lines.push("## Messages", "");
  if (messages.length === 0) {
    lines.push("_No outreach drafts yet — run Draft outreach._", "");
  } else {
    for (const m of messages) {
      lines.push(`### ${m.lead} (${m.kind.replace(/_/g, " ")})`);
      if (m.subject) lines.push(`**Subject:** ${m.subject}`, "");
      lines.push(m.body, "", "---", "");
    }
  }

  lines.push("_Drafts only — you send from your email client or outreach tool._");
  return lines.join("\n");
}

export function emailAssetMailtoUrl(asset: MarketingAsset): string | null {
  const msg = parseEmailAsset(asset);
  if (!msg?.body) return null;
  return buildMailtoUrl(msg.subject ?? "Outreach", msg.body);
}

export function buildMailtoUrl(subject: string, body: string, maxLen = 1800): string {
  const full = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (full.length <= maxLen) return full;
  const truncated = body.slice(0, Math.max(0, body.length - (full.length - maxLen) - 20));
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${truncated}\n\n[Truncated for mail client limit]`)}`;
}

export function packToWebhookPayload(pack: OutreachPack, provider?: string): Record<string, unknown> {
  const base = {
    provider: provider ?? "generic",
    project: pack.projectName,
    generated_at: pack.generatedAt,
    leads: pack.leads,
    messages: pack.messages.map((m) => ({
      lead: m.lead,
      kind: m.kind,
      subject: m.subject,
      body: m.body,
    })),
    markdown: pack.markdown,
  };
  return { ...base, provider_payload: shapeProviderPayload(pack, provider) };
}

/** Lemlist / Instantly-friendly shapes — still user-triggered, no auto-send. */
export function shapeProviderPayload(
  pack: OutreachPack,
  provider?: string,
): Record<string, unknown> | undefined {
  if (provider === "lemlist") {
    return {
      provider: "lemlist",
      leads: pack.leads.map((l) => ({
        firstName: l.name.split(" ")[0] ?? l.name,
        lastName: l.name.split(" ").slice(1).join(" ") || undefined,
        companyName: l.company || undefined,
        notes: [l.fit_evidence, l.why_now].filter(Boolean).join(" · "),
        sourceUrl: l.source_url || undefined,
        draftStatus: l.draft_status,
      })),
      emails: pack.messages
        .filter((m) => m.subject || m.body)
        .map((m) => ({
          lead: m.lead,
          subject: m.subject ?? `Intro — ${pack.projectName}`,
          body: m.body,
          kind: m.kind,
        })),
    };
  }
  if (provider === "instantly") {
    return {
      provider: "instantly",
      campaign_name: `${pack.projectName} — ${pack.generatedAt.slice(0, 10)}`,
      leads: pack.leads.map((l) => ({
        email: "",
        first_name: l.name.split(" ")[0] ?? l.name,
        last_name: l.name.split(" ").slice(1).join(" ") || "",
        company_name: l.company,
        custom_variables: {
          fit_evidence: l.fit_evidence,
          why_now: l.why_now,
          source_url: l.source_url,
        },
      })),
      sequences: pack.messages.map((m, i) => ({
        step: i + 1,
        subject: m.subject ?? `Intro — ${pack.projectName}`,
        body: m.body,
      })),
    };
  }
  return undefined;
}
