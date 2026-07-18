/**
 * Faz 5 — measurement baseline readiness before Week 1 / pivot.
 * See CMO_MEASUREMENT_COMPULSION_SPEC.md
 */
import { hasGa4Connected } from "./cmoProofLoop";
import type { MarketingProfile, ProjectProfile } from "./types";

export type BaselineSource =
  | "ga4_connected"
  | "manual_kpi"
  | "activation_event_logged"
  | "snippet_detected"
  | "measurement_ack";

export interface MeasurementBaselineAssessment {
  ready: boolean;
  sources: BaselineSource[];
  missing: string[];
}

export function isMeasurementGateHard(): boolean {
  if (typeof process !== "undefined" && process.env?.MEASUREMENT_GATE_HARD === "1") {
    return true;
  }
  if (
    typeof import.meta !== "undefined" &&
    (import.meta.env as unknown as Record<string, string | undefined>)
      ?.VITE_MEASUREMENT_GATE_HARD === "1"
  ) {
    return true;
  }
  return false;
}

export function assessMeasurementBaseline(
  profile: MarketingProfile | null | undefined,
  project?: ProjectProfile | null,
): MeasurementBaselineAssessment {
  const sources: BaselineSource[] = [];
  const missing: string[] = [];

  if (hasGa4Connected(profile)) {
    sources.push("ga4_connected");
  } else {
    missing.push("Connect GA4 in Settings for automatic Week 1 metrics.");
  }

  const manualWithValue = (profile?.manual_kpis ?? []).filter(
    (k) => k.value != null && !Number.isNaN(k.value),
  );
  if (manualWithValue.length >= 1) {
    sources.push("manual_kpi");
  } else {
    missing.push("Log at least one manual baseline KPI for your primary thesis.");
  }

  const activation = profile?.product_activation;
  if (activation?.activation_event_label?.trim()) {
    sources.push("activation_event_logged");
    if (!project?.hasAnalytics && !profile?.measurement_ack?.acknowledged_at) {
      missing.push(
        "Analytics snippet not detected — connect GA4 or acknowledge manual logging this week.",
      );
    }
  } else {
    missing.push("Define your activation event in product intake.");
  }

  if (project?.hasAnalytics) {
    sources.push("snippet_detected");
  }

  if (profile?.measurement_ack?.acknowledged_at) {
    sources.push("measurement_ack");
  }

  const ready = sources.some((s) =>
    s === "ga4_connected" ||
    s === "manual_kpi" ||
    s === "measurement_ack" ||
    (s === "activation_event_logged" &&
      (Boolean(project?.hasAnalytics) || Boolean(profile?.measurement_ack?.acknowledged_at))),
  );

  return { ready, sources, missing: ready ? [] : missing };
}

export function measurementBaselineCopy(assessment: MeasurementBaselineAssessment): string {
  if (assessment.ready) return "Measurement baseline ready — Week 1 can measure outcomes.";
  return assessment.missing[0] ?? "Set up measurement before scaling or pivoting.";
}
