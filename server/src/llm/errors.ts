import type { StreamErrorCode } from "../schemas/index.js";

/** Classify any thrown LLM/network error into a stable code for the client. */
export function classifyError(err: unknown): { code: StreamErrorCode; message: string } {
  const e = err as { status?: number; code?: string; name?: string; message?: string };
  const msg = e?.message || "Something went wrong.";

  if (e?.status === 429 || /rate.?limit/i.test(msg)) {
    return { code: "rate_limited", message: "Too many requests right now — try again in a moment." };
  }
  if (/quota|quota_exceeded/i.test(msg)) {
    return { code: "quota_exceeded", message: "Monthly quota exceeded." };
  }
  if (e?.name === "AbortError" || /aborted/i.test(msg)) {
    return { code: "timeout", message: "Cancelled." };
  }
  if (/timeout|etimedout|econnreset/i.test(msg)) {
    return { code: "timeout", message: "The model took too long to respond. Try again." };
  }
  if (e?.status === 404 || /model.*not.*found|invalid.*model/i.test(msg)) {
    return { code: "model_error", message: "Model is unavailable. Try again or switch provider in Settings." };
  }
  if (e?.status && e.status >= 500) {
    return { code: "model_error", message: "The model service had a hiccup. Try again." };
  }
  return { code: "internal", message: msg };
}
