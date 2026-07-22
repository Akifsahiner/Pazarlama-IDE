/** Non-fatal background failures — log always; toast when user-visible. */

import { track } from "@renderer/lib/analytics";

export type BackgroundErrorSeverity = "debug" | "warn" | "user";

let toastHandler: ((message: string) => void) | null = null;

/** Register from Shell so background errors can surface as toasts. */
export function registerBackgroundErrorToast(handler: (message: string) => void): void {
  toastHandler = handler;
}

export function reportBackgroundError(
  context: string,
  err: unknown,
  severity: BackgroundErrorSeverity = "warn",
): void {
  const detail = err instanceof Error ? err.message : String(err);
  const line = `[${context}] ${detail}`;
  if (severity === "debug") {
    console.debug(line);
    return;
  }
  console.warn(line, err);
  track("background_error", { context, message: detail, severity });
  if (severity === "user" && toastHandler) {
    toastHandler(`${context}: ${detail}`);
  }
}

/** Wrap a promise; log failures without throwing. */
export function swallowBackground(
  context: string,
  promise: Promise<unknown>,
  severity: BackgroundErrorSeverity = "warn",
): void {
  void promise.catch((err) => reportBackgroundError(context, err, severity));
}
