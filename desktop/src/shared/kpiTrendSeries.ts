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
  const points: KpiTrendPoint[] = [];
  const manual = profile?.manual_kpis?.find((k) => k.id === presetId);
  if (manual?.snapshots?.length) {
    for (const s of manual.snapshots) {
      points.push({ day_index: s.day_index, value: s.value, source: s.source });
    }
  }

  if (cadence) {
    for (const task of cadence.tasks) {
      if (task.proof?.kpi_id === presetId && task.proof.kpi_value != null) {
        points.push({
          day_index: task.day_slot === "now" ? cadence.day_index : cadence.day_index,
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
      points.push({ day_index: day, value, source: "proof" });
    }
  }

  const ga4Fetched = profile?.connector_snapshots?.ga4?.fetched_at;
  if (ga4Fetched && manual?.value != null && presetId === "targeted_visitors") {
    points.push({
      day_index: cadence?.day_index ?? 7,
      value: manual.value,
      source: "ga4",
    });
  }

  const deduped = new Map<number, KpiTrendPoint>();
  for (const p of points.sort((a, b) => a.day_index - b.day_index)) {
    deduped.set(p.day_index, p);
  }
  return [...deduped.values()].filter((p) => [1, 3, 5, 7].includes(p.day_index) || p.day_index <= 7);
}

export function hasTrendData(points: KpiTrendPoint[]): boolean {
  return points.length >= 2;
}
