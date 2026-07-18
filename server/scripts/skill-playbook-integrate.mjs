#!/usr/bin/env node
/**
 * Remove bulk-appended "See Skill Excellence standard" stubs and integrate
 * real H2 sections from existing narrative content.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const skillsRoot = join(__dir, "..", "..", "skills");

const STUB_MARK = "See Skill Excellence standard";

function stripStubAppendix(body) {
  const idx = body.indexOf("\n## Preconditions\n- See Skill Excellence");
  if (idx >= 0) return body.slice(0, idx).trimEnd();
  if (body.includes(STUB_MARK)) {
    return body
      .split("\n")
      .filter((l) => !l.includes(STUB_MARK))
      .join("\n")
      .trimEnd();
  }
  return body.trimEnd();
}

function integrateH2(narrative, skillId, playbookName) {
  const base = stripStubAppendix(narrative);
  if (base.includes("## Preconditions") && !base.includes(STUB_MARK)) return base;

  const blocks = {
    preconditions: [
      "## Preconditions",
      `- [ ] Marketing profile complete for ${skillId}`,
      "- [ ] Primary metric named before execution",
      "- [ ] Honest aggression dial matches real assets (list, proof, team hours)",
    ],
    aggression: [
      "## Aggression dial",
      "",
      "| Level | When | Focus |",
      "|-------|------|-------|",
      "| conservative | Thin assets / solo | One channel, learning metrics |",
      "| standard | Warm channel or list | Best-practice cadence from narrative above |",
      "| aggressive | Strong proof + distribution | Execute full tactic stack with kill rules |",
    ],
    timeline: [
      "## Timeline",
      "- **T-14**: Instrument leading metric; lock ICP + offer",
      "- **T-7**: Ship assets referenced in narrative",
      "- **T-1**: Final checklist + supporter warm-up",
      "- **H0**: Primary launch motion",
      "- **D+1…D+7**: Measure, teardown, kill or scale",
    ],
    tactic: [
      "## Tactic stack",
      "1. Name bottleneck with 3 profile citations",
      "2. Ship one measurable experiment this week",
      "3. Tie Plan Studio tasks to registry tactic ids",
      "4. Cap parallel channels at 2",
      "5. Predefine kill/pivot rule before spend or blast",
    ],
    orch: [
      "## Orchestration",
      "- One primary channel from narrative; ≤2 support channels",
      "- Repo/browser/asset tasks split by execution_mode",
    ],
    outcomes: [
      "## Realistic outcomes",
      "- State honest bands — do not promise #1 PH or viral without assets",
      "- Leading metric moves in 7–14d when playbook matches profile",
    ],
    kill: [
      "## Kill / pivot rules",
      "- Leading metric misses after agreed sample → stop and rewrite hypothesis",
      "- Never add channels when primary motion underperforms",
    ],
    ethics: [
      "## Ethics line",
      "- No fake metrics, fake social proof, undisclosed ads, or ToS-breaking growth hacks",
    ],
  };

  return [
    base,
    "",
    blocks.preconditions.join("\n"),
    "",
    blocks.aggression.join("\n"),
    "",
    blocks.timeline.join("\n"),
    "",
    blocks.tactic.join("\n"),
    "",
    blocks.orch.join("\n"),
    "",
    blocks.outcomes.join("\n"),
    "",
    blocks.kill.join("\n"),
    "",
    blocks.ethics.join("\n"),
    "",
  ].join("\n");
}

const ids = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

for (const id of ids) {
  const pbDir = join(skillsRoot, id, "playbooks");
  if (!existsSync(pbDir)) continue;
  for (const f of readdirSync(pbDir).filter((x) => x.endsWith(".md"))) {
    const p = join(pbDir, f);
    const raw = readFileSync(p, "utf8");
    if (!raw.includes(STUB_MARK) && raw.includes("## Preconditions") && !raw.includes("- See Skill Excellence")) {
      continue;
    }
    const out = integrateH2(raw, id, f.replace(/\.md$/, ""));
    writeFileSync(p, out, "utf8");
    console.log(`integrated ${id}/playbooks/${f}`);
  }
}

console.log("Done.");
