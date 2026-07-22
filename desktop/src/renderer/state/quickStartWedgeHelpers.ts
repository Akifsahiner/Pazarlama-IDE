import type { FirstShipLedger, ProjectProfile } from "@shared/types";
import type { ShipReceipt } from "@shared/shipReceipt";
import type { FirstShipSnapshot } from "@shared/firstShipSnapshot";
import { parseShipSnapshotFromSource } from "@shared/firstShipSnapshot";
import type { ExecutionMetricsRollup } from "@shared/executionMetrics";
import type { OnboardingTrack } from "@shared/quickStartWedge";
import { inferIntegrateRoute } from "@shared/assetTarget";

export const ONBOARDING_TRACK_LS = "onboarding_track.v1";
export const FIRST_SHIP_LEDGER_LS = "first_ship_ledger.v1";
export const SHIP_RECEIPT_LS = "ship_receipt.v1";
export const EXECUTION_METRICS_LS = "execution_metrics.v1";
export const SESSION_OUTCOMES_LS = "session_outcomes.v1";

export function loadOnboardingTrack(projectId: string): OnboardingTrack {
  try {
    const raw = localStorage.getItem(`${ONBOARDING_TRACK_LS}.${projectId}`);
    return raw === "full_cmo" ? "full_cmo" : "quick_start";
  } catch {
    return "quick_start";
  }
}

export function persistOnboardingTrack(projectId: string, track: OnboardingTrack): void {
  try {
    localStorage.setItem(`${ONBOARDING_TRACK_LS}.${projectId}`, track);
  } catch {
    /* quota */
  }
}

export function loadFirstShipLedger(projectId: string): FirstShipLedger | undefined {
  try {
    const raw = localStorage.getItem(`${FIRST_SHIP_LEDGER_LS}.${projectId}`);
    return raw ? (JSON.parse(raw) as FirstShipLedger) : undefined;
  } catch {
    return undefined;
  }
}

export function persistFirstShipLedgerLocal(projectId: string, ledger: FirstShipLedger): void {
  try {
    localStorage.setItem(`${FIRST_SHIP_LEDGER_LS}.${projectId}`, JSON.stringify(ledger));
  } catch {
    /* quota */
  }
}

export function loadShipReceipt(projectId: string): ShipReceipt | undefined {
  try {
    const raw = localStorage.getItem(`${SHIP_RECEIPT_LS}.${projectId}`);
    return raw ? (JSON.parse(raw) as ShipReceipt) : undefined;
  } catch {
    return undefined;
  }
}

export function persistShipReceiptLocal(projectId: string, receipt: ShipReceipt): void {
  try {
    localStorage.setItem(`${SHIP_RECEIPT_LS}.${projectId}`, JSON.stringify(receipt));
  } catch {
    /* quota */
  }
}

export function loadExecutionMetrics(projectId: string): ExecutionMetricsRollup | undefined {
  try {
    const raw = localStorage.getItem(`${EXECUTION_METRICS_LS}.${projectId}`);
    return raw ? (JSON.parse(raw) as ExecutionMetricsRollup) : undefined;
  } catch {
    return undefined;
  }
}

export function persistExecutionMetricsLocal(
  projectId: string,
  rollup: ExecutionMetricsRollup,
): void {
  try {
    localStorage.setItem(`${EXECUTION_METRICS_LS}.${projectId}`, JSON.stringify(rollup));
  } catch {
    /* quota */
  }
}

export function loadSessionOutcomesLocal(projectId: string): import("@shared/types").SessionOutcome[] {
  try {
    const raw = localStorage.getItem(`${SESSION_OUTCOMES_LS}.${projectId}`);
    return raw ? (JSON.parse(raw) as import("@shared/types").SessionOutcome[]) : [];
  } catch {
    return [];
  }
}

export function persistSessionOutcomesLocal(
  projectId: string,
  outcomes: import("@shared/types").SessionOutcome[],
): void {
  try {
    localStorage.setItem(`${SESSION_OUTCOMES_LS}.${projectId}`, JSON.stringify(outcomes.slice(-24)));
  } catch {
    /* quota */
  }
}

export async function captureFirstShipSnapshotFromProject(
  project: ProjectProfile,
  readFile: (relPath: string) => Promise<string>,
): Promise<FirstShipSnapshot> {
  const routes = (project.routes ?? []).map((r) => r.replace(/\\/g, "/"));
  const heroPath = inferIntegrateRoute(routes);
  const capturedAt = Date.now();
  if (!heroPath) {
    return { capturedAt, heroPath: undefined };
  }
  try {
    const source = await readFile(heroPath);
    return { ...parseShipSnapshotFromSource(source, heroPath), capturedAt };
  } catch {
    return { heroPath, capturedAt };
  }
}
