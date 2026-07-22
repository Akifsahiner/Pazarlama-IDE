/**
 * Faz 6 — KPI trend series for Day 1→3→5 sparkline (manual + proof sources).
 */
import type { DistributionOperatorWorkspace } from "./cmoDistributionOperator";
import type { CmoOpsCadence } from "./cmoOpsCadence";
import type { ManualKpi, MarketingProfile } from "./types";

export interface KpiTrendPoint {
  day_index: number;
  value: number;
  source: "manual" | "import" | "proof" | "ga4";
}

const SOURCE_PRIORITY: Record<KpiTrendPoint["source"], number> = {
  manual: 4,
  import: 4,
  proof: 3,
  ga4: 2,
};

function mergePoint(
  deduped: Map<number, KpiTrendPoint>,
  point: KpiTrendPoint,
): void {
  const existing = deduped.get(point.day_index);
  if (!existing || SOURCE_PRIORITY[point.source] >= SOURCE_PRIORITY[existing.source]) {
    deduped.set(point.day_index, point);
  }
}

export function appendKpiSnapshot(
  kpi: ManualKpi,
  snapshot: Omit<KpiTrendPoint, "value"> & { value: number },
): ManualKpi {
  const existing = kpi.snapshots ?? [];
  const filtered = existing.filter((s) => s.day_index !== snapshot.day_index);
  return {
    ...kpi,
    snapshots: [
      ...filtered,
      {
        day_index: snapshot.day_index,
        value: snapshot.value,
        recorded_at: new Date().toISOString(),
        source: snapshot.source,
      },
    ],
  };
}

export function buildKpiTrendSeries(
  cadence: CmoOpsCadence | null | undefined,
  profile: MarketingProfile | null | undefined,
  presetId: string,
  distributionOperator?: DistributionOperatorWorkspace | null,
): KpiTrendPoint[] {
  const deduped = new Map<number, KpiTrendPoint>();
  const manual = profile?.manual_kpis?.find((k) => k.id === presetId);
  if (manual?.snapshots?.length) {
    for (const s of manual.snapshots) {
      mergePoint(deduped, { day_index: s.day_index, value: s.value, source: s.source });
    }
  }

  if (cadence) {
    for (const task of cadence.tasks) {
      if (task.proof?.kpi_id === presetId && task.proof.kpi_value != null) {
        const dayIndex =
          task.proof.completed_at && cadence.started_at
            ? cadence.day_index
            : cadence.day_index;
        mergePoint(deduped, {
          day_index: dayIndex,
          value: task.proof.kpi_value,
          source: task.proof.kpi_source === "ga4" ? "ga4" : "proof",
        });
      }
    }
  }

  if (distributionOperator && presetId === "short_form_views") {
    const byDay = new Map<number, number>();
    for (const slot of distributionOperator.slots) {
      if (slot.proof?.views_24h != null) {
        const prev = byDay.get(slot.day_index) ?? 0;
        byDay.set(slot.day_index, prev + slot.proof.views_24h);
      }
    }
    for (const [day, value] of byDay) {
      mergePoint(deduped, { day_index: day, value, source: "proof" });
    }
  }

  const ga4Fetched = profile?.connector_snapshots?.ga4?.fetched_at;
  if (ga4Fetched && manual?.value != null && presetId === "targeted_visitors") {
    mergePoint(deduped, {
      day_index: cadence?.day_index ?? 7,
      value: manual.value,
      source: "ga4",
    });
  }

  return [...deduped.values()]
    .sort((a, b) => a.day_index - b.day_index)
    .filter((p) => [1, 3, 5, 7].includes(p.day_index) || p.day_index <= 7);
}

export function hasTrendData(points: KpiTrendPoint[]): boolean {
  return points.length >= 2;
}

/** Count pulse checkpoints (Day 3+) where KPI was logged but below 50% of implicit target. */
export function countFlatPulseCheckpoints(
  points: KpiTrendPoint[],
  target?: number,
  flatThresholdPct = 50,
): number {
  if (!target || target <= 0) return 0;
  let flat = 0;
  for (const point of points) {
    if (point.day_index < 3) continue;
    const pct = (point.value / target) * 100;
    if (pct < flatThresholdPct) flat += 1;
  }
  return flat;
}
