#!/usr/bin/env node
/**
 * Scaffold missing Skill Excellence files for a skill pack.
 * Usage: node scripts/skill-scaffold.mjs <skillId>
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..", "..");
const skillsRoot = join(root, "skills");

const skillId = process.argv[2];
if (!skillId || skillId.startsWith("-")) {
  console.error("Usage: node scripts/skill-scaffold.mjs <skillId>");
  process.exit(1);
}

const dir = join(skillsRoot, skillId);
if (!existsSync(dir)) {
  console.error(`Skill dir not found: ${dir}`);
  process.exit(1);
}

const PLAYBOOK_STUB = `# Playbook: TITLE

## Preconditions
- [ ] Product profile complete (name, ICP, value prop)
- [ ] Required assets ready for this play

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | Thin audience / early validation | Minimum viable moves |
| standard | Warm list or community | Best-practice cadence |
| aggressive | Strong assets + clear ICP fit | Max ethical intensity |

## Timeline
- **T-14**: Prep
- **T-7**: Assets locked
- **T-1**: Final checklist
- **H0**: Execute
- **D+1**: Teardown + learnings

## Tactic stack
1. Named tactic with measurable outcome
2. Named tactic with measurable outcome
3. Named tactic with measurable outcome
4. Named tactic with measurable outcome
5. Named tactic with measurable outcome

## Orchestration
- Primary channel + parallel support channels

## Realistic outcomes
- Conservative: …
- Standard: …
- Aggressive: … (state honest ceiling)

## Kill / pivot rules
- If leading metric misses target after N days → pivot to …

## Ethics line
- Never: fake engagement, undisclosed paid promotion, or platform ToS violations.
`;

const CASE_STUB = `# Case study: TITLE (anonymous)

## Context
Product type, stage, assets available.

## Tactic stack applied
1. …
2. …

## Outcome
- Metric results (honest band)

## Lesson
What to copy / what not to copy for similar profiles.
`;

function ensureFile(rel, body) {
  const p = join(dir, rel);
  if (existsSync(p)) {
    console.log(`  skip ${rel}`);
    return false;
  }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body, "utf8");
  console.log(`  + ${rel}`);
  return true;
}

function patchManifest() {
  const p = join(dir, "manifest.json");
  if (!existsSync(p)) return;
  const m = JSON.parse(readFileSync(p, "utf8"));
  let changed = false;
  if (!m.version) {
    m.version = "1.0.0";
    changed = true;
  }
  if (m.changelog === undefined) {
    m.changelog = "Scaffolded Skill Excellence v2 fields";
    changed = true;
  }
  if (!Array.isArray(m.aggression_playbooks)) {
    m.aggression_playbooks = [];
    changed = true;
  }
  if (changed) {
    writeFileSync(p, JSON.stringify(m, null, 2) + "\n", "utf8");
    console.log("  ~ manifest.json (v2 fields)");
  } else {
    console.log("  skip manifest.json (already v2)");
  }
}

console.log(`Scaffolding ${skillId}…`);
patchManifest();

ensureFile(
  "playbooks/aggressive-standard.md",
  PLAYBOOK_STUB.replace("TITLE", `${skillId} aggressive standard`),
);
ensureFile("case-studies/scenario-a.md", CASE_STUB.replace("TITLE", `${skillId} scenario A`));
ensureFile("case-studies/scenario-b.md", CASE_STUB.replace("TITLE", `${skillId} scenario B`));

const tplDir = join(dir, "templates");
mkdirSync(tplDir, { recursive: true });
const n = readdirSync(tplDir).filter((f) => f.endsWith(".md")).length;
if (n < 3) {
  for (let i = n; i < 3; i++) {
    ensureFile(
      `templates/scaffold-asset-${i + 1}.md`,
      `# Template ${i + 1}\n\nPaste-ready copy for ${skillId}.\n`,
    );
  }
}

console.log("Done. Re-run: npm run skill:audit");
