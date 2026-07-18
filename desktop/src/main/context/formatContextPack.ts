import type { ContextPack } from "../../shared/orchestration";

/** Compact context block prepended to local agent goals. */
export function formatContextPack(pack: ContextPack, maxChars = 12_000): string {
  const lines: string[] = ["# Project context pack (auto-retrieved)", ""];

  if (pack.profile.product_name || pack.profile.site_structure) {
    lines.push("## Product profile (scan)");
    if (pack.profile.product_name) lines.push(`- product: ${pack.profile.product_name}`);
    if (pack.profile.category) lines.push(`- category: ${pack.profile.category}`);
    if (pack.profile.site_structure?.framework) {
      lines.push(`- framework: ${pack.profile.site_structure.framework}`);
    }
    if (pack.profile.site_structure?.monorepo_root) {
      lines.push(`- monorepo app: ${pack.profile.site_structure.monorepo_root}`);
    }
    if (pack.profile.available_channels?.length) {
      lines.push(`- channels: ${pack.profile.available_channels.join(", ")}`);
    }
    lines.push("");
  }

  if (pack.facts.length) {
    lines.push("## Marketing facts");
    for (const f of pack.facts.slice(0, 24)) {
      lines.push(`- ${f.key}: ${f.value}`);
    }
    lines.push("");
  }

  if (pack.mentions.length) {
    lines.push("## User @mentions");
    for (const m of pack.mentions) {
      lines.push(`### ${m.path}`);
      lines.push("```");
      lines.push(m.excerpt.slice(0, 1500));
      lines.push("```");
      lines.push("");
    }
  }

  if (pack.retrieved.length) {
    lines.push("## Retrieved code (FTS)");
    for (const r of pack.retrieved.slice(0, 8)) {
      lines.push(`### ${r.path}:${r.start}-${r.end} (score ${r.score.toFixed(1)})`);
      lines.push("```");
      lines.push(r.text.slice(0, 1200));
      lines.push("```");
      lines.push("");
    }
  }

  if (pack.budget.truncated) {
    lines.push(`_Context truncated to ~${pack.budget.maxTokens} tokens._`);
  }

  const out = lines.join("\n");
  return out.length > maxChars ? `${out.slice(0, maxChars - 20)}\n\n…[truncated]` : out;
}
