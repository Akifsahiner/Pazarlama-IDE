/**
 * Approximate Anthropic / OpenAI list prices ($ per million tokens).
 * Used for cost_cents metering — not a billing invoice source of truth.
 */

export interface ModelRates {
  inputPerMTok: number;
  outputPerMTok: number;
}

/** Default Sonnet rates when model is unknown. */
const DEFAULT_RATES: ModelRates = { inputPerMTok: 3, outputPerMTok: 15 };

const RATES: Record<string, ModelRates> = {
  "claude-sonnet-4-6": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-sonnet-4-5": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-sonnet-4-0": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-3-5-sonnet": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-3-7-sonnet": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-opus-4": { inputPerMTok: 15, outputPerMTok: 75 },
  "claude-opus-4-0": { inputPerMTok: 15, outputPerMTok: 75 },
  "claude-opus-4-1": { inputPerMTok: 15, outputPerMTok: 75 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
  "claude-3-5-haiku": { inputPerMTok: 0.8, outputPerMTok: 4 },
  "claude-3-haiku": { inputPerMTok: 0.25, outputPerMTok: 1.25 },
  "gpt-5.5": { inputPerMTok: 2.5, outputPerMTok: 10 },
  "gpt-4o": { inputPerMTok: 2.5, outputPerMTok: 10 },
  "gpt-4o-mini": { inputPerMTok: 0.15, outputPerMTok: 0.6 },
};

function ratesFor(model: string): ModelRates {
  const key = model.trim().toLowerCase();
  if (RATES[key]) return RATES[key];
  if (key.includes("opus")) return RATES["claude-opus-4"]!;
  if (key.includes("haiku")) return RATES["claude-haiku-4-5"]!;
  if (key.includes("sonnet")) return RATES["claude-sonnet-4-6"]!;
  if (key.includes("gpt-4o-mini")) return RATES["gpt-4o-mini"]!;
  if (key.includes("gpt")) return RATES["gpt-4o"]!;
  return DEFAULT_RATES;
}

/** Cost in USD cents (2 decimal places), rounded to nearest cent. */
export function estimateCostCents(
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const rates = ratesFor(model || "claude-sonnet-4-6");
  const dollars =
    (Math.max(0, tokensIn) / 1_000_000) * rates.inputPerMTok +
    (Math.max(0, tokensOut) / 1_000_000) * rates.outputPerMTok;
  return Math.round(dollars * 100 * 100) / 100; // hundredths of a cent → round to 0.01¢
}

/** Format cents as `$X.XX` for logs/UI helpers. */
export function formatUsdFromCents(costCents: number): string {
  return `$${(costCents / 100).toFixed(4)}`.replace(/(\.\d{2})\d+$/, "$1");
}
