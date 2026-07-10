import type { WorkSurface } from "@shared/workSurfaces";
import type {
  ContentItem,
  ExperimentRun,
  Finding,
  MarketingAsset,
  MarketingPlan,
  MarketingProfile,
  PlanTask,
  ServerAsset,
} from "@shared/types";
import type { PlanProgressSnapshot } from "@shared/planProgress";
import { taskStatusFromSnapshot } from "@shared/planProgress";

export interface SurfaceAvailabilityInput {
  plan: MarketingPlan | null;
  planLoading: boolean;
  marketingProfile: MarketingProfile | null;
  browserFindings: Finding[];
  threadAssets: MarketingAsset[];
  serverAssets: ServerAsset[];
}

export function computeSurfaceAvailability(
  input: SurfaceAvailabilityInput,
): Record<WorkSurface, boolean> {
  const calendar = input.plan?.contentCalendar ?? [];
  const hasAssets =
    input.threadAssets.length > 0 ||
    input.serverAssets.length > 0 ||
    calendar.length > 0;
  const adAssets = input.threadAssets.filter((a) => a.type === "ad" || a.type === "tweet");
  const experiments = input.marketingProfile?.previous_experiments ?? [];
  const manualKpis = input.marketingProfile?.manual_kpis ?? [];
  const hasMetrics =
    experiments.length > 0 ||
    manualKpis.length > 0 ||
    (input.plan?.taskGraph.some((t) => !!t.metric) ?? false);

  return {
    "research-map":
      (input.marketingProfile?.competitors.length ?? 0) > 0 ||
      input.browserFindings.length > 0,
    "campaign-plan": !!input.plan || input.planLoading,
    funnel: (input.plan?.taskGraph.length ?? 0) >= 1,
    "content-set": hasAssets,
    "ad-preview": adAssets.length > 0,
    performance: hasMetrics,
    experiment: experiments.length > 0,
    "marketing-diff": input.threadAssets.length > 0,
  };
}

export const RESEARCH_THEMES = [
  { id: "pricing", label: "Pricing", keywords: ["price", "pricing", "cost", "plan", "tier"] },
  { id: "positioning", label: "Positioning", keywords: ["position", "value", "different", "versus", "vs"] },
  { id: "social", label: "Social proof", keywords: ["review", "testimonial", "customer", "trust", "logo"] },
  { id: "ux", label: "UX & product", keywords: ["ux", "ui", "flow", "onboard", "feature", "demo"] },
  { id: "competition", label: "Competition", keywords: ["competitor", "alternative", "compare", "market"] },
] as const;

export function themeForFinding(f: Finding): string {
  const text = `${f.title} ${f.evidence} ${f.suggestion}`.toLowerCase();
  for (const theme of RESEARCH_THEMES) {
    if (theme.keywords.some((k) => text.includes(k))) return theme.id;
  }
  return "general";
}

export const FUNNEL_STAGES = [
  { id: "awareness", label: "Awareness", hint: "Reach & discovery" },
  { id: "interest", label: "Interest", hint: "Problem fit" },
  { id: "consideration", label: "Consideration", hint: "Compare & evaluate" },
  { id: "conversion", label: "Conversion", hint: "Sign up & buy" },
  { id: "retention", label: "Retention", hint: "Activate & expand" },
] as const;

export type FunnelStageId = (typeof FUNNEL_STAGES)[number]["id"];

export function stageForTask(task: PlanTask): FunnelStageId {
  switch (task.action_type) {
    case "browser_research":
      return "awareness";
    case "draft_copy":
      return "interest";
    case "analyze":
      return "consideration";
    case "edit_files":
      return "conversion";
    default:
      if (/email|outreach|sales/i.test(task.title)) return "conversion";
      if (/content|post|social/i.test(task.title)) return "interest";
      return "awareness";
  }
}

export function stageForContent(item: ContentItem): FunnelStageId {
  if (item.type === "ad") return "conversion";
  if (item.type === "email") return "consideration";
  if (item.channel.toLowerCase().includes("blog")) return "interest";
  return "awareness";
}

export interface PerformanceRow {
  id: string;
  name: string;
  metric: string;
  target: string;
  actual: string;
  status: "on_track" | "behind" | "pending" | "won" | "lost";
  owner: string;
}

export interface ConnectorMetricRow {
  id: string;
  source: "GA4" | "Meta Ads";
  name: string;
  metric: string;
  target: string;
  actual: string;
  status: PerformanceRow["status"];
  readOnly: true;
}

/**
 * Read-only connector metrics from profile snapshots — honest-data rule.
 */
export function buildConnectorMetricRows(profile: MarketingProfile | null): ConnectorMetricRow[] {
  const ga4 = profile?.connector_snapshots?.ga4;
  if (!ga4?.metrics.length) return [];
  return ga4.metrics.map((m, i) => ({
    id: `ga4-${i}`,
    source: "GA4" as const,
    name: m.name,
    metric: m.name,
    target: "—",
    actual: String(m.value),
    status: "on_track" as const,
    readOnly: true as const,
  }));
}

export function buildPerformanceRows(
  plan: MarketingPlan | null,
  profile: MarketingProfile | null,
  planProgress: PlanProgressSnapshot | null,
): PerformanceRow[] {
  const rows: PerformanceRow[] = [];

  for (const exp of profile?.previous_experiments ?? []) {
    rows.push(experimentToRow(exp));
  }

  for (const kpi of profile?.manual_kpis ?? []) {
    rows.push({
      id: `kpi-${kpi.id}`,
      name: kpi.name,
      metric: kpi.unit ?? "count",
      target: kpi.target != null ? String(kpi.target) : "—",
      actual: String(kpi.value),
      status:
        kpi.target != null && kpi.value >= kpi.target
          ? "won"
          : kpi.target != null && kpi.value < kpi.target * 0.5
            ? "behind"
            : "on_track",
      owner: "You",
    });
  }

  for (const task of plan?.taskGraph ?? []) {
    const metricName = task.kpi?.name ?? task.metric;
    if (!metricName) continue;
    const target = task.kpi?.target ?? task.metric ?? "—";
    const st = taskStatusFromSnapshot(planProgress, task.id);
    rows.push({
      id: `task-${task.id}`,
      name: task.title,
      metric: metricName,
      target,
      actual: st === "done" ? "Complete" : st === "skipped" ? "Skipped" : "—",
      status:
        st === "done"
          ? "won"
          : st === "failed"
            ? "lost"
            : st === "running"
              ? "on_track"
              : "pending",
      owner: "Agent",
    });
  }

  return rows;
}

function experimentToRow(exp: ExperimentRun): PerformanceRow {
  const status: PerformanceRow["status"] =
    exp.outcome === "success"
      ? "won"
      : exp.outcome === "failure"
        ? "lost"
        : exp.outcome === "inconclusive"
          ? "behind"
          : "pending";
  return {
    id: exp.id,
    name: exp.hypothesis.slice(0, 60),
    metric: exp.metric?.name ?? exp.discipline,
    target: "—",
    actual: exp.metric?.value != null ? String(exp.metric.value) : "—",
    status,
    owner: "Experiment",
  };
}

export interface ContentSetItem {
  id: string;
  title: string;
  type: string;
  channel: string;
  snippet: string;
  source: "calendar" | "thread" | "server";
  asset?: MarketingAsset;
}

export function buildContentSetItems(
  plan: MarketingPlan | null,
  threadAssets: MarketingAsset[],
  serverAssets: ServerAsset[],
): ContentSetItem[] {
  const items: ContentSetItem[] = [];

  for (const c of plan?.contentCalendar ?? []) {
    items.push({
      id: `cal-${c.day}-${c.title}`,
      title: c.title,
      type: c.type,
      channel: c.channel,
      snippet: c.title,
      source: "calendar",
    });
  }

  for (const a of threadAssets) {
    items.push({
      id: a.id,
      title: a.targetFile ?? a.type,
      type: a.type,
      channel: "Generated",
      snippet: a.after.slice(0, 160),
      source: "thread",
      asset: a,
    });
  }

  for (const s of serverAssets) {
    if (threadAssets.some((t) => t.id === s.id)) continue;
    items.push({
      id: s.id,
      title: s.target_file ?? s.type ?? "Asset",
      type: String(s.type),
      channel: "Cloud",
      snippet: s.after_text.slice(0, 160),
      source: "server",
    });
  }

  return items;
}

export function pickAdAsset(assets: MarketingAsset[], preferredId?: string): MarketingAsset | null {
  if (preferredId) {
    const hit = assets.find((a) => a.id === preferredId);
    if (hit) return hit;
  }
  return (
    [...assets].reverse().find((a) => a.type === "ad" || a.type === "tweet") ??
    assets[assets.length - 1] ??
    null
  );
}
