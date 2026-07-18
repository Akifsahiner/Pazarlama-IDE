#!/usr/bin/env node
/**
 * Skill Excellence structural audit — writes skills/_audit/gap-matrix.json
 * Usage: node scripts/skill-audit.mjs [--strict]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..", "..");
const skillsRoot = join(root, "skills");
const auditDir = join(skillsRoot, "_audit");
const strict = process.argv.includes("--strict");

const REQUIRED_ROOT = [
  "manifest.json",
  "principles.md",
  "anti-patterns.md",
  "decision-tree.json",
  "kpis.json",
  "SKILL.md",
];

const PLAYBOOK_H2 = [
  "## Preconditions",
  "## Aggression dial",
  "## Timeline",
  "## Tactic stack",
  "## Orchestration",
  "## Realistic outcomes",
  "## Kill / pivot rules",
  "## Ethics line",
];

const BASE_PLAYBOOKS = ["no-audience.md", "with-email-list.md", "b2b-saas.md"];

function listSkillDirs() {
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
}

function countPrinciples(text) {
  return text.split("\n").filter((l) => /^\d+\./.test(l.trim())).length;
}

function countAnti(text) {
  return text.split("\n").filter((l) => l.trim().startsWith("- ")).length;
}

function playbookSectionHits(body) {
  const found = [];
  const missing = [];
  for (const h of PLAYBOOK_H2) {
    if (body.includes(h)) found.push(h);
    else missing.push(h);
  }
  return { found, missing, complete: missing.length === 0 };
}

function auditSkill(id) {
  const dir = join(skillsRoot, id);
  const gaps = [];
  const layers = {
    A_principles: false,
    B_anti: false,
    C_decision_tree: false,
    D_playbooks: false,
    E_templates_kpis: false,
    F_case_studies: false,
    manifest_v2: false,
  };

  for (const f of REQUIRED_ROOT) {
    if (!existsSync(join(dir, f))) gaps.push(`missing ${f}`);
  }

  let principles = 0;
  let anti = 0;
  if (existsSync(join(dir, "principles.md"))) {
    principles = countPrinciples(readFileSync(join(dir, "principles.md"), "utf8"));
    layers.A_principles = principles >= 10;
    if (principles < 10) gaps.push(`principles ${principles} < 10`);
  }

  if (existsSync(join(dir, "anti-patterns.md"))) {
    anti = countAnti(readFileSync(join(dir, "anti-patterns.md"), "utf8"));
    layers.B_anti = anti >= 12;
    if (anti < 12) gaps.push(`anti-patterns ${anti} < 12`);
  }

  layers.C_decision_tree = existsSync(join(dir, "decision-tree.json"));

  let playbooks = [];
  const pbDir = join(dir, "playbooks");
  if (existsSync(pbDir)) {
    playbooks = readdirSync(pbDir).filter((f) => f.endsWith(".md"));
  }
  for (const pb of BASE_PLAYBOOKS) {
    if (!playbooks.includes(pb)) gaps.push(`missing playbooks/${pb}`);
  }
  const aggressive = playbooks.filter((p) => /aggressive/i.test(p));
  if (aggressive.length === 0) gaps.push("missing aggressive-* playbook");

  const playbookDetails = [];
  let allSectionsOk = playbooks.length >= 4;
  for (const pb of playbooks) {
    const body = readFileSync(join(pbDir, pb), "utf8");
    const sec = playbookSectionHits(body);
    playbookDetails.push({ file: pb, sectionsComplete: sec.complete, missing: sec.missing });
    if (!sec.complete) {
      allSectionsOk = false;
      gaps.push(`playbooks/${pb} missing H2: ${sec.missing.join(", ")}`);
    }
    if (body.includes("See Skill Excellence standard")) {
      allSectionsOk = false;
      gaps.push(`playbooks/${pb} contains stub placeholder text`);
    }
    const tacticLines = body.match(/^\d+\.\s+/gm) ?? [];
    if (body.includes("## Tactic stack") && tacticLines.length < 3) {
      gaps.push(`playbooks/${pb} tactic stack needs ≥3 numbered steps`);
    }
  }
  layers.D_playbooks = playbooks.length >= 4 && allSectionsOk;

  const tplDir = join(dir, "templates");
  let templates = 0;
  if (existsSync(tplDir)) {
    templates = readdirSync(tplDir).filter((f) => f.endsWith(".md")).length;
  }
  const hasKpis = existsSync(join(dir, "kpis.json"));
  layers.E_templates_kpis = templates >= 3 && hasKpis;
  if (templates < 3) gaps.push(`templates ${templates} < 3`);
  if (!hasKpis) gaps.push("missing kpis.json");

  const csDir = join(dir, "case-studies");
  let caseStudies = 0;
  if (existsSync(csDir)) {
    caseStudies = readdirSync(csDir).filter((f) => f.endsWith(".md")).length;
    for (const cs of readdirSync(csDir).filter((f) => f.endsWith(".md"))) {
      const csBody = readFileSync(join(csDir, cs), "utf8");
      if (/Profile-grounded diagnosis/i.test(csBody) && /14–30 days \(honest range\)/i.test(csBody)) {
        gaps.push(`case-studies/${cs} is generic template — rewrite with metrics`);
        layers.F_case_studies = false;
      }
    }
  }
  layers.F_case_studies = caseStudies >= 2;
  if (caseStudies < 2) gaps.push(`case-studies ${caseStudies} < 2`);

  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  } catch {
    gaps.push("manifest.json unreadable");
  }
  if (manifest) {
    layers.manifest_v2 = Boolean(manifest.version);
    if (!manifest.version) gaps.push("manifest missing version");
    if (!Array.isArray(manifest.aggression_playbooks)) {
      gaps.push("manifest missing aggression_playbooks[]");
      layers.manifest_v2 = false;
    }
  }

  const layerPass = Object.values(layers).filter(Boolean).length;
  return {
    id,
    principles,
    anti,
    playbooks: playbooks.length,
    aggressivePlaybooks: aggressive,
    templates,
    caseStudies,
    layers,
    layerPass,
    layerTotal: 7,
    playbookDetails,
    gaps,
    excellenceReady: gaps.length === 0,
  };
}

const ids = listSkillDirs();
const matrix = {
  generatedAt: new Date().toISOString(),
  standard: "SKILL_EXCELLENCE.md",
  skills: ids.map(auditSkill),
};

mkdirSync(auditDir, { recursive: true });
writeFileSync(join(auditDir, "gap-matrix.json"), JSON.stringify(matrix, null, 2), "utf8");

let hardFails = 0;
console.log("Skill Excellence audit\n");
for (const s of matrix.skills) {
  const mark = s.excellenceReady ? "✓" : "○";
  console.log(
    `${mark} ${s.id}  layers ${s.layerPass}/${s.layerTotal}  P=${s.principles} A=${s.anti} PB=${s.playbooks} CS=${s.caseStudies}`,
  );
  if (!s.excellenceReady) {
    for (const g of s.gaps.slice(0, 8)) console.log(`    - ${g}`);
    if (s.gaps.length > 8) console.log(`    … +${s.gaps.length - 8} more`);
  }
  // Soft gaps are expected until S2–S5; --strict fails any gap
  if (strict && s.gaps.length) hardFails += 1;
  // Always fail hard missing root files
  const critical = s.gaps.filter(
    (g) =>
      g.startsWith("missing manifest") ||
      g.startsWith("missing principles") ||
      g.startsWith("missing anti-patterns") ||
      g.startsWith("missing SKILL.md") ||
      g.startsWith("missing decision-tree") ||
      g.startsWith("missing kpis"),
  );
  if (critical.length) hardFails += 1;
}

console.log(`\nWrote ${join(auditDir, "gap-matrix.json")}`);
console.log(`Skills: ${ids.length}  excellence-ready: ${matrix.skills.filter((s) => s.excellenceReady).length}`);

if (hardFails > 0) {
  console.error(`\n✗ ${hardFails} skill(s) failed critical checks`);
  process.exit(1);
}
console.log("\n✓ audit complete (use --strict for full excellence bar)");
