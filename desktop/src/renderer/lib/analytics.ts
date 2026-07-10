/**
 * Opt-in, privacy-first analytics sink.
 *
 * This is intentionally a no-op transport: nothing leaves the machine. When the
 * user enables telemetry it only logs locally in dev. Wire a real sink here later
 * if/when a privacy policy and consent flow exist.
 */
let enabled = false;

export function setAnalyticsEnabled(value: boolean): void {
  enabled = value;
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!enabled) return;
  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${event}`, props ?? {});
  }
  // No network call. Add a real, consented transport here in the future.
}
