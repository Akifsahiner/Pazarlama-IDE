/** Minimal exponential-backoff retry for transient LLM failures (no external dep). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  // Marketing Brain: 1 retry max — we'd rather fail fast and surface a useful
  // error than stack 2-3 long timeouts. Override per-call if needed.
  const retries = opts.retries ?? 1;
  const baseMs = opts.baseMs ?? 400;
  // Cap exponential backoff so total wait stays bounded.
  const CAP_MS = 2000;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) throw new Error("aborted");
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === retries) throw err;
      const delay = Math.min(baseMs * 2 ** attempt, CAP_MS) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function isTransient(err: unknown): boolean {
  const e = err as { status?: number; code?: string; message?: string };
  if (e?.status && [408, 409, 429, 500, 502, 503, 504].includes(e.status)) return true;
  const msg = (e?.message || "").toLowerCase();
  return /timeout|econnreset|etimedout|overloaded|rate.?limit|temporar/.test(msg);
}

/** True only for "model unavailable" failures — to gate fallback model swap. */
export function isModelUnavailable(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  if (e?.status === 404) return true;
  return /model.*not.*found|invalid.*model|unsupported.*model/i.test(e?.message || "");
}
