/**
 * Part 11 — hard validation gate before Lane A apply.
 * Typecheck/lint must pass (or user explicitly overrides) before files ship to repo.
 */
import type { RunEvent, RunEventStatus } from "./types";

export interface ApplyGateCheck {
  label: string;
  status: RunEventStatus;
}

export interface ApplyGateResult {
  blocked: boolean;
  reason?: string;
  validationRequired: boolean;
  validationPassed: boolean;
  validationFailed: boolean;
  checks: ApplyGateCheck[];
}

export interface LatestValidation {
  completed: boolean;
  passed: boolean;
  failed: boolean;
  checks: ApplyGateCheck[];
}

/** Latest completed validation snapshot from run events. */
export function latestValidationFromEvents(events: RunEvent[]): LatestValidation | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type !== "file.validation_completed") continue;
    const checks = (event.payload as { checks?: ApplyGateCheck[] } | undefined)?.checks ?? [];
    const failed =
      event.status === "failed" || checks.some((check) => check.status === "failed");
    const passed = !failed && (event.status === "success" || checks.length === 0);
    return { completed: true, passed, failed, checks };
  }
  return null;
}

export function validationRunning(events: RunEvent[]): boolean {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type === "file.validation_completed") return false;
    if (event.type === "file.validation_started" && event.status === "running") return true;
  }
  return false;
}

/**
 * Evaluate whether apply is allowed.
 * Hard block until validation passes unless {@link validationOverride} is true.
 */
export function evaluateApplyGate(input: {
  events: RunEvent[];
  validationOverride?: boolean;
  /** Test harness — skip gate for mock-agent e2e that does not run real validation. */
  skipForE2eMock?: boolean;
}): ApplyGateResult {
  if (input.skipForE2eMock) {
    return {
      blocked: false,
      validationRequired: false,
      validationPassed: true,
      validationFailed: false,
      checks: [],
    };
  }

  if (input.validationOverride) {
    return {
      blocked: false,
      validationRequired: true,
      validationPassed: false,
      validationFailed: false,
      checks: latestValidationFromEvents(input.events)?.checks ?? [],
    };
  }

  if (validationRunning(input.events)) {
    return {
      blocked: true,
      reason: "Validation is still running — wait for typecheck/lint to finish.",
      validationRequired: true,
      validationPassed: false,
      validationFailed: false,
      checks: [],
    };
  }

  const latest = latestValidationFromEvents(input.events);
  if (!latest) {
    return {
      blocked: true,
      reason: "Run validation (typecheck/lint) before applying changes to your repo.",
      validationRequired: true,
      validationPassed: false,
      validationFailed: false,
      checks: [],
    };
  }

  if (latest.failed) {
    const failedLabels = latest.checks
      .filter((check) => check.status === "failed")
      .map((check) => check.label)
      .join(", ");
    return {
      blocked: true,
      reason: failedLabels
        ? `Validation failed: ${failedLabels}. Fix issues or use explicit override.`
        : "Validation failed — fix issues or use explicit override.",
      validationRequired: true,
      validationPassed: false,
      validationFailed: true,
      checks: latest.checks,
    };
  }

  return {
    blocked: false,
    validationRequired: true,
    validationPassed: latest.passed,
    validationFailed: false,
    checks: latest.checks,
  };
}
