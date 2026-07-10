import { hasAnthropic, hasOpenAI } from "../env.js";
import { anthropicProvider } from "./anthropic.js";
import { openaiProvider } from "./openai.js";
import type { LLMProvider } from "./types.js";

export type ProviderId = "anthropic" | "openai";

export function getProvider(requested?: ProviderId): LLMProvider {
  const id: ProviderId = requested ?? "anthropic";
  if (id === "openai") {
    if (!hasOpenAI) throw new Error("OPENAI_API_KEY is not configured on the server");
    return openaiProvider;
  }
  if (!hasAnthropic) throw new Error("ANTHROPIC_API_KEY is not configured on the server");
  return anthropicProvider;
}

export { type LLMProvider };
