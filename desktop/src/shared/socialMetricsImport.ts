/**
 * Faz 6 — parse TikTok/Reels/generic analytics paste → manual_kpis.
 */
import { kpiFromPreset } from "./kpiPresets";
import type { ManualKpi } from "./types";
import { appendKpiSnapshot } from "./kpiTrendSeries";

export type SocialImportPlatform = "tiktok" | "reels" | "generic";

export interface SocialImportResult {
  kpis: ManualKpi[];
  distributionHints?: Array<{ retention_3s_pct?: number; views_24h?: number }>;
  errors: string[];
  importNote: string;
}

function parseCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseGenericCsv(raw: string): SocialImportResult {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  const errors: string[] = [];
  if (lines.length < 2) {
    return { kpis: [], errors: ["Need header + at least one data row"], importNote: "" };
  }
  const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const viewsIdx = header.findIndex((h) => h.includes("view"));
  const retIdx = header.findIndex((h) => h.includes("retention") || h.includes("3s"));
  let totalViews = 0;
  let bestRetention = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const views = viewsIdx >= 0 ? parseNumber(cols[viewsIdx]) : undefined;
    const ret = retIdx >= 0 ? parseNumber(cols[retIdx]) : undefined;
    if (views != null) totalViews += views;
    if (ret != null && ret > bestRetention) bestRetention = ret;
  }
  const importNote = `Imported from platform analytics — ${new Date().toISOString().slice(0, 10)}`;
  const kpis: ManualKpi[] = [];
  if (totalViews > 0) {
    const base = kpiFromPreset("short_form_views", totalViews);
    if (base) kpis.push({ ...base, import_note: importNote });
  }
  if (bestRetention > 0) {
    const base = kpiFromPreset("hook_retention_3s_pct", bestRetention);
    if (base) kpis.push({ ...base, import_note: importNote });
  }
  if (kpis.length === 0) errors.push("No views or retention columns found in CSV");
  return {
    kpis,
    distributionHints: [{ views_24h: totalViews || undefined, retention_3s_pct: bestRetention || undefined }],
    errors,
    importNote,
  };
}

function parseTikTokCsv(raw: string): SocialImportResult {
  const generic = parseGenericCsv(raw);
  if (generic.kpis.length > 0) return generic;
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  let views = 0;
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const v = parseNumber(cols.find((_, i) => i > 0) ?? cols[cols.length - 1]);
    if (v != null) views += v;
  }
  const importNote = `Imported from platform analytics — ${new Date().toISOString().slice(0, 10)}`;
  if (views <= 0) {
    return { kpis: [], errors: ["Could not parse TikTok CSV views"], importNote };
  }
  const base = kpiFromPreset("short_form_views", views);
  return {
    kpis: base ? [{ ...base, import_note: importNote }] : [],
    errors: base ? [] : ["Failed to build KPI"],
    importNote,
  };
}

function parseReelsJson(raw: string): SocialImportResult {
  const importNote = `Imported from platform analytics — ${new Date().toISOString().slice(0, 10)}`;
  try {
    const data = JSON.parse(raw) as { views?: number; reach?: number; impressions?: number };
    const views = data.views ?? data.reach ?? data.impressions;
    if (views == null || !Number.isFinite(views)) {
      return { kpis: [], errors: ["JSON missing views/reach/impressions"], importNote };
    }
    const base = kpiFromPreset("short_form_views", views);
    return {
      kpis: base ? [{ ...base, import_note: importNote }] : [],
      errors: base ? [] : ["Failed to build KPI"],
      importNote,
    };
  } catch {
    return { kpis: [], errors: ["Invalid JSON"], importNote };
  }
}

export function parseSocialMetricsImport(
  raw: string,
  platform: SocialImportPlatform,
  dayIndex = 3,
): SocialImportResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { kpis: [], errors: ["Paste analytics CSV or JSON"], importNote: "" };
  }
  let result: SocialImportResult;
  if (platform === "reels") {
    result = trimmed.startsWith("{") ? parseReelsJson(trimmed) : parseGenericCsv(trimmed);
  } else if (platform === "tiktok") {
    result = parseTikTokCsv(trimmed);
  } else {
    result = trimmed.startsWith("{") ? parseReelsJson(trimmed) : parseGenericCsv(trimmed);
  }
  result.kpis = result.kpis.map((k) =>
    appendKpiSnapshot(k, { day_index: dayIndex, value: k.value, source: "import" }),
  );
  return result;
}
