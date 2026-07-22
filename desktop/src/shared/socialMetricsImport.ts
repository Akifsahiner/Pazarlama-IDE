/**
 * Faz 6 — parse TikTok/Reels/generic analytics paste → manual_kpis.
 */
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
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

function deriveRetentionProxy(
  avgWatchSec?: number,
  videoDurationSec?: number,
  explicitRetention?: number,
): number | undefined {
  if (explicitRetention != null && explicitRetention > 0) return explicitRetention;
  if (avgWatchSec != null && avgWatchSec >= 3) return Math.min(100, Math.round((avgWatchSec / 3) * 20));
  if (avgWatchSec != null && videoDurationSec != null && videoDurationSec > 0) {
    const ratio = avgWatchSec / videoDurationSec;
    if (ratio >= 0.05) return Math.min(100, Math.round(ratio * 100));
  }
  return undefined;
}

function parseGenericCsv(raw: string): SocialImportResult {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  const errors: string[] = [];
  if (lines.length < 2) {
    return { kpis: [], errors: ["Need header + at least one data row"], importNote: "" };
  }
  const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const viewsIdx = header.findIndex((h) => h.includes("view"));
  const retIdx = header.findIndex(
    (h) => h.includes("retention") || h.includes("3s") || h.includes("3 s"),
  );
  const watchIdx = header.findIndex(
    (h) => h.includes("watch") && (h.includes("time") || h.includes("avg")),
  );
  const durationIdx = header.findIndex(
    (h) => h.includes("duration") || h.includes("length") || h.includes("video length"),
  );
  let totalViews = 0;
  let bestRetention = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const views = viewsIdx >= 0 ? parseNumber(cols[viewsIdx]) : undefined;
    const explicitRet = retIdx >= 0 ? parseNumber(cols[retIdx]) : undefined;
    const watch = watchIdx >= 0 ? parseNumber(cols[watchIdx]) : undefined;
    const duration = durationIdx >= 0 ? parseNumber(cols[durationIdx]) : undefined;
    const ret = deriveRetentionProxy(watch, duration, explicitRet);
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
  const header = lines[0] ? parseCsvLine(lines[0]).map((h) => h.toLowerCase()) : [];
  const viewsIdx = header.findIndex((h) => h.includes("view"));
  const watchIdx = header.findIndex((h) => h.includes("watch"));
  const durationIdx = header.findIndex((h) => h.includes("duration") || h.includes("length"));
  let views = 0;
  let bestRetention = 0;
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const v =
      viewsIdx >= 0
        ? parseNumber(cols[viewsIdx])
        : parseNumber(cols.find((_, i) => i > 0) ?? cols[cols.length - 1]);
    const watch = watchIdx >= 0 ? parseNumber(cols[watchIdx]) : undefined;
    const duration = durationIdx >= 0 ? parseNumber(cols[durationIdx]) : undefined;
    const ret = deriveRetentionProxy(watch, duration);
    if (v != null) views += v;
    if (ret != null && ret > bestRetention) bestRetention = ret;
  }
  const importNote = `Imported from platform analytics — ${new Date().toISOString().slice(0, 10)}`;
  if (views <= 0) {
    return { kpis: [], errors: ["Could not parse TikTok CSV views"], importNote };
  }
  const base = kpiFromPreset("short_form_views", views);
  const kpis: ManualKpi[] = base ? [{ ...base, import_note: importNote }] : [];
  if (bestRetention > 0) {
    const retKpi = kpiFromPreset("hook_retention_3s_pct", bestRetention);
    if (retKpi) kpis.push({ ...retKpi, import_note: importNote });
  }
  return {
    kpis,
    distributionHints: [{ views_24h: views, retention_3s_pct: bestRetention || undefined }],
    errors: kpis.length ? [] : ["Failed to build KPI"],
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

/** Backfill distribution slot metrics from import hints (does not fabricate post URLs). */
export function mergeDistributionImportHints(
  workspace: DistributionOperatorWorkspace,
  hints: SocialImportResult["distributionHints"],
  dayIndex: number,
): DistributionOperatorWorkspace {
  const hint = hints?.[0];
  if (!hint || (hint.views_24h == null && hint.retention_3s_pct == null)) return workspace;

  let applied = false;
  const slots = workspace.slots.map((slot) => {
    if (slot.slot_kind !== "post" || slot.day_index > dayIndex) return slot;
    if (slot.proof?.views_24h != null && slot.proof?.retention_3s_pct != null) return slot;
    applied = true;
    return {
      ...slot,
      status: slot.proof?.post_url ? ("measured" as const) : slot.status,
      proof: {
        completed_at: slot.proof?.completed_at ?? new Date().toISOString(),
        post_url: slot.proof?.post_url ?? "",
        note: slot.proof?.note ?? "Metrics backfilled from platform analytics import",
        views_24h: hint.views_24h ?? slot.proof?.views_24h,
        retention_3s_pct: hint.retention_3s_pct ?? slot.proof?.retention_3s_pct,
      },
    };
  });

  return applied ? { ...workspace, slots } : workspace;
}
