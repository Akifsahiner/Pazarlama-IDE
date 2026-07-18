/**
 * Skill pack coverage — every mapped skill id must have a complete pack on disk.
 * Usage (from server/): npm run build && node evals/skill-coverage.mjs
 */
import { access, readdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = resolve(__dirname, "..", "..", "skills");

const REQUIRED_ROOT_FILES = [
  "manifest.json",
  "principles.md",
  "decision-tree.json",
  "anti-patterns.md",
  "kpis.json",
  "SKILL.md",
];

const REQUIRED_PLAYBOOKS = ["no-audience.md", "with-email-list.md", "b2b-saas.md"];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function assertPackStructure(skillId) {
  const errors = [];
  const root = join(SKILLS_ROOT, skillId);
  if (!(await exists(root))) {
    errors.push(`${skillId}: missing directory`);
    return errors;
  }

  for (const file of REQUIRED_ROOT_FILES) {
    if (!(await exists(join(root, file)))) {
      errors.push(`${skillId}: missing ${file}`);
    }
  }

  for (const pb of REQUIRED_PLAYBOOKS) {
    if (!(await exists(join(root, "playbooks", pb)))) {
      errors.push(`${skillId}: missing playbooks/${pb}`);
    }
  }

  const templatesDir = join(root, "templates");
  if (!(await exists(templatesDir))) {
    errors.push(`${skillId}: missing templates/ directory`);
  } else {
    const entries = await readdir(templatesDir);
    const md = entries.filter((n) => n.endsWith(".md"));
    if (md.length === 0) {
      errors.push(`${skillId}: templates/ has no .md files`);
    }
  }

  return errors;
}

const { allMappedSkillIds, retrieveSkills, retrieveSkillsForPlaybook, renderSkillContext } =
  await import("../dist/brain/skillRetrieval.js");
const { marketingProfileSchema } = await import("../dist/schemas/marketingProfile.js");

const smokeProfile = marketingProfileSchema.parse({
  product_name: "Marketing IDE",
  product_description: "Desktop co-pilot for founders to launch and sell products.",
  main_value_proposition: "Claude-quality marketing execution in your repo.",
  target_audience: [{ persona: "solo founders", pains: ["launch paralysis"], jobs: ["ship faster"] }],
  company_stage: "prelaunch",
  business_model: "saas",
  current_users: 12,
  email_list_size: 2500,
  available_channels: ["email", "linkedin", "product_hunt", "twitter"],
  competitors: [{ name: "Cursor", note: "Dev IDE with AI" }],
});

let failed = 0;

const ids = allMappedSkillIds();
console.log(`[skill-coverage] checking ${ids.length} mapped skill ids…`);

for (const id of ids) {
  const errs = await assertPackStructure(id);
  if (errs.length) {
    failed += errs.length;
    for (const e of errs) console.error(`✗ ${e}`);
  } else {
    console.log(`✓ ${id} structure`);
  }
}

const retrievalCases = [
  { label: "outreach → outreach-drafting", discipline: "outreach", expectId: "outreach-drafting" },
  { label: "lead_research → lead-research", discipline: "lead_research", expectId: "lead-research" },
  { label: "analytics → analytics-measurement", discipline: "analytics", expectId: "analytics-measurement" },
  { label: "positioning → product-intelligence", discipline: "positioning", expectId: "product-intelligence" },
  { label: "seo → seo-content-engine", discipline: "seo", expectId: "seo-content-engine" },
  { label: "email → email-nurture-sequence", discipline: "email", expectId: "email-nurture-sequence" },
  { label: "social → twitter-x-founder-gtm", discipline: "social", expectId: "twitter-x-founder-gtm" },
  { label: "growth → launch-planning", discipline: "growth", expectId: "launch-planning" },
  { label: "ads → newsletter-sponsorship", discipline: "ads", expectId: "newsletter-sponsorship" },
];

for (const c of retrievalCases) {
  const packs = await retrieveSkills(c.discipline, smokeProfile, 2);
  if (!packs.length || packs[0].id !== c.expectId) {
    failed += 1;
    console.error(
      `✗ ${c.label}: expected primary pack ${c.expectId}, got ${packs.map((p) => p.id).join(",") || "none"}`,
    );
    continue;
  }
  const ctx = renderSkillContext(packs);
  if (!ctx.includes("Principles") || !ctx.includes("Anti-patterns")) {
    failed += 1;
    console.error(`✗ ${c.label}: renderSkillContext missing Principles or Anti-patterns`);
    continue;
  }
  console.log(`✓ ${c.label} injected (${packs[0].templates.length} templates)`);
}

const playbookCases = [
  { stub: "sales-outbound", expectId: "outreach-drafting" },
  { stub: "analytics-measurement", expectId: "analytics-measurement" },
  { stub: "content-engine", expectId: "launch-asset-generator" },
  { stub: "seo-foundation", expectId: "seo-content-engine" },
  { stub: "email-nurture", expectId: "email-nurture-sequence" },
  { stub: "twitter-x-gtm", expectId: "twitter-x-founder-gtm" },
  { stub: "newsletter-sponsorship", expectId: "newsletter-sponsorship" },
  { stub: "press-pr-launch", expectId: "press-pr-launch" },
  { stub: "devrel-open-source-launch", expectId: "devrel-open-source-launch" },
];

for (const c of playbookCases) {
  const packs = await retrieveSkillsForPlaybook(c.stub, smokeProfile);
  if (!packs.length || packs[0].id !== c.expectId) {
    failed += 1;
    console.error(
      `✗ playbook ${c.stub}: expected ${c.expectId}, got ${packs.map((p) => p.id).join(",") || "none"}`,
    );
  } else {
    console.log(`✓ playbook ${c.stub} → ${c.expectId}`);
  }
}

if (failed > 0) {
  console.error(`[skill-coverage] ${failed} failure(s)`);
  process.exit(1);
}

console.log("[skill-coverage] OK — all mapped skills covered and retrievable");
