import type { Finding, MarketingAsset } from "./types";

export interface ThreadLineForExport {
  role: string;
  kind?: string;
  text?: string;
}

export interface LeadRow {
  name: string;
  company: string;
  fit_evidence: string;
  why_now: string;
  source_url: string;
  draft_status: string;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function leadsToCsv(leads: LeadRow[]): string {
  const header = "name,company,fit_evidence,why_now,source_url,draft_status";
  const rows = leads.map((l) =>
    [l.name, l.company, l.fit_evidence, l.why_now, l.source_url, l.draft_status]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export function extractLeadsFromFindings(findings: Finding[]): LeadRow[] {
  return findings
    .filter((f) => /lead|icp|prospect|company|contact/i.test(`${f.title} ${f.evidence}`))
    .map((f, i) => ({
      name: f.title.slice(0, 80) || `Lead ${i + 1}`,
      company: guessCompany(f.title, f.evidence),
      fit_evidence: f.evidence.slice(0, 500),
      why_now: f.suggestion.slice(0, 300),
      source_url: f.url ?? "",
      draft_status: "researched",
    }));
}

function guessCompany(title: string, evidence: string): string {
  const m = evidence.match(/(?:company|at|@)\s*[:—-]?\s*([A-Za-z0-9][A-Za-z0-9 .&'-]{1,60})/i);
  if (m) return m[1].trim();
  const t = title.split(/[—–-]/)[0]?.trim();
  return t && t.length < 60 ? t : "";
}

/** Parse bullet lines from agent thread that look like lead candidates. */
export function extractLeadsFromThread(thread: ThreadLineForExport[]): LeadRow[] {
  const rows: LeadRow[] = [];
  for (const ev of thread) {
    if (ev.role !== "agent" || !ev.text) continue;
    if (!/lead|icp|prospect|candidate/i.test(ev.text)) continue;
    const lines = ev.text.split("\n");
    for (const line of lines) {
      const bullet = line.match(/^[-*•]\s+\*?\*?([^:*]+)\*?\*?\s*[—–-]?\s*(.*)$/);
      if (!bullet) continue;
      const name = bullet[1].trim();
      if (name.length < 2 || name.length > 120) continue;
      rows.push({
        name,
        company: name,
        fit_evidence: bullet[2]?.trim() ?? "",
        why_now: "",
        source_url: line.match(/https?:\/\/[^\s)]+/)?.[0] ?? "",
        draft_status: "researched",
      });
    }
  }
  return rows.slice(0, 50);
}

export function mergeLeadRows(...groups: LeadRow[][]): LeadRow[] {
  const seen = new Set<string>();
  const out: LeadRow[] = [];
  for (const group of groups) {
    for (const row of group) {
      const key = `${row.name}|${row.source_url}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
  }
  return out;
}

export function extractLeads(input: {
  findings: Finding[];
  thread: ThreadLineForExport[];
}): LeadRow[] {
  return mergeLeadRows(
    extractLeadsFromFindings(input.findings),
    extractLeadsFromThread(input.thread),
  );
}

export function draftStatusForAssets(assets: MarketingAsset[], leadName: string): string {
  const hit = assets.find(
    (a) =>
      a.type === "email" &&
      (a.after?.toLowerCase().includes(leadName.toLowerCase()) ||
        a.targetFile?.toLowerCase().includes(leadName.toLowerCase().slice(0, 12))),
  );
  return hit ? "draft_ready" : "no_draft";
}
