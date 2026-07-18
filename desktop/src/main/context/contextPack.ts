import { promises as fs } from "node:fs";
import path from "node:path";
import type { MarketingProfile } from "../../shared/types";
import type { ContextPack, Mention } from "../../shared/orchestration";
import { emptyMarketingProfile } from "../../shared/defaults";
import { DEFAULT_CONTEXT_LIMIT } from "../../shared/contextBudget";
import { listFacts, searchProjectIndex } from "./projectIndex";

export async function buildContextPack(input: {
  projectId: string;
  cwd: string;
  goal: string;
  mentions?: Mention[];
  profile?: MarketingProfile;
  maxTokens?: number;
}): Promise<ContextPack> {
  const maxTokens = input.maxTokens ?? Math.floor(DEFAULT_CONTEXT_LIMIT * 0.45);
  const retrieved = await searchProjectIndex(input.projectId, input.cwd, input.goal, 8);
  const facts = (await listFacts(input.projectId, input.cwd)).map((f) => ({
    key: f.key,
    value: f.value,
  }));

  const mentions: ContextPack["mentions"] = [];
  for (const m of input.mentions ?? []) {
    if (!m.path) continue;
    try {
      const abs = path.join(input.cwd, m.path);
      const text = await fs.readFile(abs, "utf8");
      mentions.push({ path: m.path, excerpt: text.slice(0, 2000) });
    } catch {
      /* missing file */
    }
  }

  let tokensEst =
    Math.ceil(input.goal.length / 4) +
    mentions.reduce((n, m) => n + Math.ceil(m.excerpt.length / 4), 0) +
    retrieved.reduce((n, r) => n + Math.ceil(r.text.length / 4), 0) +
    facts.reduce((n, f) => n + Math.ceil((f.key + f.value).length / 4), 0);

  let truncated = false;
  const trimmedRetrieved = [...retrieved];
  while (tokensEst > maxTokens && trimmedRetrieved.length > 0) {
    const dropped = trimmedRetrieved.pop()!;
    tokensEst -= Math.ceil(dropped.text.length / 4);
    truncated = true;
  }

  return {
    profile: input.profile ?? emptyMarketingProfile(),
    mentions,
    retrieved: trimmedRetrieved,
    facts,
    budget: { tokensEst, maxTokens, truncated },
  };
}
