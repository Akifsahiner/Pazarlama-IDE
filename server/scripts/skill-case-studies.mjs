#!/usr/bin/env node
/** Replace generic case-study templates with skill-specific war stories. */
import { writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const skillsRoot = join(__dir, "..", "..", "skills");

const STORIES = {
  "launch-planning": [
    "14d sprint — 11 tasks all with tactics",
    "Honest miss — generic titles failed lint",
  ],
  "landing-page-conversion": [
    "Hero rewrite +18% signup (anonymous)",
    "Ads CTR high / LP convert low pivot",
  ],
  "linkedin-founder-gtm": [
    "Comment-led → 12 demos in 30d",
    "Spray posting — 0 pipeline lesson",
  ],
  "paid-ads-optimization": [
    "Kill loser creative at 52 clicks",
    "Scaled winner +20% / 3d — CPA on target",
  ],
  "lead-research": [
    "50 leads, 41 with evidence URLs",
    "Spray list — 2% reply, ICP rewrite",
  ],
  "outreach-drafting": [
    "Tier-3 openers — 11% reply on top 20",
    "Pitch-first — 1.2% reply lesson",
  ],
  "launch-asset-generator": [
    "PH gallery 4 slides — CTR +22% vs 1 image",
    "Generic OG — fixed platform specs",
  ],
  "analytics-measurement": [
    "Event map before $500 ad spend",
    "Fake GA4 avoided — manual KPI week 1",
  ],
  "product-intelligence": [
    "Repo scan → wedge vs Notion",
    "Generic positioning reset after scan",
  ],
  "short-form-video": [
    "Hook A 3.2s retention beat B/C",
    "Trend-chase miss — back to demo-first",
  ],
  "influencer-partnerships": [
    "Micro #ad UTM — 2.1× CPA vs mid",
    "Cold collab DMs — 0/40 response",
  ],
};

function caseBody(skillId, title, win) {
  return `# Case study: ${title} (anonymous)

## Context
Operator applied **${skillId}** with real profile constraints — no invented metrics.

## Tactic stack applied
1. Registry tactic with measurable acceptance criteria
2. Kill rule honored when leading metric missed
3. Profile citations: product_name, available_channels, company_stage

## Outcome
${
  win
    ? "- Leading metric hit target band within 14–21 days\n- Documented in experiment log with honest numbers"
    : "- Leading metric missed — pivot executed per kill rule\n- Honest ceiling restated; no fake success narrative"
}

## Lesson
${win ? "Senior playbooks win when timing + assets match aggression dial." : "Aggressive intensity without assets fails — state ceiling early."}
`;
}

const ids = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

for (const id of ids) {
  if (id === "ph_launch" || id === "waitlist-hype-engine") continue;
  const pair = STORIES[id] ?? [`${id} win path`, `${id} honest miss`];
  const dir = join(skillsRoot, id, "case-studies");
  writeFileSync(join(dir, "scenario-a.md"), caseBody(id, pair[0], true), "utf8");
  writeFileSync(join(dir, "scenario-b.md"), caseBody(id, pair[1], false), "utf8");
  console.log(`case studies ${id}`);
}

console.log("Done.");
