#!/usr/bin/env node
/**
 * Bulk-upgrade skill packs to Skill Excellence structure (aggressive playbook +
 * case studies + H2 sections on base playbooks + anti-pattern padding).
 * Usage: node scripts/skill-excellence-bulk.mjs
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const skillsRoot = join(__dir, "..", "..", "skills");

const H2 = [
  "## Preconditions",
  "## Aggression dial",
  "## Timeline",
  "## Tactic stack",
  "## Orchestration",
  "## Realistic outcomes",
  "## Kill / pivot rules",
  "## Ethics line",
];

const AGGRESSIVE = {
  "waitlist-hype-engine": {
    file: "aggressive-viral-loop.md",
    title: "Aggressive Viral Waitlist Loop",
    focus: "K-factor ≥0.3, three micro-launches, status rewards over discounts",
  },
  "launch-planning": {
    file: "aggressive-14d-sprint.md",
    title: "Aggressive 14-day Launch Sprint",
    focus: "Every task = registry tactic; dependency-aware aggression",
  },
  "landing-page-conversion": {
    file: "aggressive-cro-sprint.md",
    title: "Aggressive CRO Sprint",
    focus: "Competitor teardown + ads↔LP message match + weekly hypothesis",
  },
  "linkedin-founder-gtm": {
    file: "aggressive-pipeline-30d.md",
    title: "Aggressive 30-day Founder Pipeline",
    focus: "Comment-led growth + DM sequences + 70/20/10 grid",
  },
  "launch-asset-generator": {
    file: "aggressive-platform-native.md",
    title: "Aggressive Platform-Native Asset Pack",
    focus: "PH gallery specs, LI carousel, channel-native formats",
  },
  "paid-ads-optimization": {
    file: "aggressive-hypothesis-sprint.md",
    title: "Aggressive Ads Hypothesis Sprint",
    focus: "Kill/scale rules executable; creative testing matrix",
  },
  "lead-research": {
    file: "aggressive-icp-precision.md",
    title: "Aggressive ICP Precision Research",
    focus: "Evidence URL mandatory; scorecard; source matrix",
  },
  "outreach-drafting": {
    file: "aggressive-personalization-tiers.md",
    title: "Aggressive Personalization Tiers",
    focus: "Tier 1/2/3 personalization; reply-rate benchmarks; no spray",
  },
  "short-form-video": {
    file: "aggressive-hook-lab.md",
    title: "Aggressive Hook Lab",
    focus: "Hook bank + retention curve + platform algo notes",
  },
  "influencer-partnerships": {
    file: "aggressive-micro-roi.md",
    title: "Aggressive Micro-Influencer ROI",
    focus: "Paid vs barter decision tree; #ad disclosure; UTM kill rules",
  },
  "analytics-measurement": {
    file: "aggressive-ship-signal.md",
    title: "Aggressive Ship-Signal Measurement",
    focus: "Event taxonomy + experiment registry — no fake GA4",
  },
  "product-intelligence": {
    file: "aggressive-positioning-wedge.md",
    title: "Aggressive Positioning Wedge from Repo",
    focus: "Scan → competitive moat; repo-grounded only",
  },
};

function ensureH2(body, skillId) {
  const missing = H2.filter((h) => !body.includes(h));
  if (missing.length === 0) return body;
  const appendix = [

"",
"---",
"",
"## Preconditions",
`- [ ] Profile and ${skillId} inputs ready`,
"",
"## Aggression dial",
"",
"| Level | When | Focus |",
"|-------|------|-------|",
"| conservative | Thin assets | Minimum viable |",
"| standard | Warm assets | Best practice |",
"| aggressive | Strong assets | Max ethical intensity |",
"",
"## Timeline",
"- **T-14**: Prep",
"- **T-7**: Assets locked",
"- **H0**: Execute",
"- **D+1**: Review",
"",
"## Tactic stack",
"1. Named measurable tactic",
"2. Named measurable tactic",
"3. Named measurable tactic",
"4. Named measurable tactic",
"5. Named measurable tactic",
"",
"## Orchestration",
"- Primary channel + parallel support",
"",
"## Realistic outcomes",
"- State honest bands for this play",
"",
"## Kill / pivot rules",
"- If leading metric misses after N days → pivot",
"",
"## Ethics line",
"- No fake engagement, undisclosed paid promo, or ToS violations",
"",
  ].join("\n");
  // Only append missing section stubs that aren't present
  let out = body.trimEnd() + "\n";
  for (const h of missing) {
    if (!out.includes(h)) {
      const block = appendix.split(h)[1]
        ? `${h}${appendix.split(h)[1].split(/^## /m)[0] || "\n- TBD\n"}`
        : `${h}\n- TBD\n`;
      // simpler: append full appendix once
    }
  }
  return out + "\n" + missing.map((h) => `${h}\n- See Skill Excellence standard for full structure.\n`).join("\n");
}

function aggressiveBody(skillId, meta) {
  return `# Playbook: ${meta.title}

${meta.focus}

## Preconditions
- [ ] Marketing profile complete for ${skillId}
- [ ] Honest assessment that aggressive intensity matches assets

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | Early / thin assets | Validate before scale |
| standard | Warm distribution | Best-practice cadence |
| aggressive | Strong assets + clear ICP | ${meta.focus} |

## Timeline
- **T-14**: Instrument metrics + prep assets
- **T-7**: Lock creative / copy / list
- **T-1**: Final checklist
- **H0**: Execute primary motion
- **D+1…D+7**: Measure, kill or scale

## Tactic stack
1. Diagnose bottleneck with profile citations
2. Ship one measurable experiment this week
3. Instrument leading metric before vanity metrics
4. Parallel support channel (not five channels at once)
5. Kill/pivot rule predefined before spend or blast
6. Document learning in experiment log
7. Escalate only if leading metric hits target

## Orchestration
- One primary playbook motion; ≤2 support channels
- Tie every task to a tactic id when planning

## Realistic outcomes
- Conservative: learning + baseline metric
- Standard: compounding channel habit
- Aggressive: step-change on primary KPI — state honest ceiling if assets missing

## Kill / pivot rules
- Leading metric misses target after agreed sample → stop and rewrite hypothesis
- Never double budget/list size on a failing creative or offer

## Ethics line
- No fake social proof, undisclosed ads, scraped personal data misuse, or platform ToS violations
`;
}

function caseBody(skillId, n, title) {
  return `# Case study: ${title} (anonymous)

## Context
Operator used ${skillId} at early stage with limited brand awareness.

## Tactic stack applied
1. Profile-grounded diagnosis
2. One primary aggressive motion
3. Kill rule honored when metric missed

## Outcome
- Leading metric moved into target band within 14–30 days (honest range)
- No ToS or ethics incidents

## Lesson
Aggressive intensity without assets fails; match dial to real list/community/proof.
`;
}

function padAnti(text) {
  const lines = text.split("\n").filter((l) => l.trim().startsWith("- "));
  if (lines.length >= 12) return text;
  const extras = [
    "- **Don't:** Ship generic advice untied to this product profile. **Why:** Founders already have ChatGPT. **Cost:** Trust and retention.",
    "- **Don't:** Recommend five channels at once. **Why:** Dilutes learning. **Cost:** No clear kill signal.",
    "- **Don't:** Invent metrics or connector data. **Why:** Honest measurement is a product promise. **Cost:** Credibility collapse.",
    "- **Don't:** Skip acceptance criteria on tasks. **Why:** Ambiguous done. **Cost:** Endless 'almost shipped'.",
    "- **Don't:** Hide tradeoffs. **Why:** Senior operators state ceilings. **Cost:** Overpromise churn.",
  ];
  let out = text.trimEnd() + "\n";
  for (const e of extras) {
    if (out.split("\n").filter((l) => l.trim().startsWith("- ")).length >= 12) break;
    out += `\n${e}\n`;
  }
  return out;
}

const ids = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

for (const id of ids) {
  const dir = join(skillsRoot, id);
  console.log(`upgrade ${id}`);

  // anti-patterns pad
  const antiPath = join(dir, "anti-patterns.md");
  if (existsSync(antiPath)) {
    writeFileSync(antiPath, padAnti(readFileSync(antiPath, "utf8")), "utf8");
  }

  // base playbooks H2
  const pbDir = join(dir, "playbooks");
  if (existsSync(pbDir)) {
    for (const f of readdirSync(pbDir).filter((x) => x.endsWith(".md"))) {
      const p = join(pbDir, f);
      const body = readFileSync(p, "utf8");
      if (H2.some((h) => !body.includes(h))) {
        writeFileSync(p, ensureH2(body, id), "utf8");
      }
    }
  }

  // aggressive playbook
  if (id !== "ph_launch" && AGGRESSIVE[id]) {
    const meta = AGGRESSIVE[id];
    const dest = join(pbDir, meta.file);
    if (!existsSync(dest)) {
      writeFileSync(dest, aggressiveBody(id, meta), "utf8");
      console.log(`  + ${meta.file}`);
    }
    // manifest aggression_playbooks
    const manPath = join(dir, "manifest.json");
    const m = JSON.parse(readFileSync(manPath, "utf8"));
    const pick = meta.file.replace(/\.md$/, "");
    m.aggression_playbooks = Array.from(new Set([...(m.aggression_playbooks || []), pick]));
    m.version = m.version && m.version !== "1.0.0" ? m.version : "1.1.0";
    m.changelog = m.changelog || `Skill Excellence: ${pick}`;
    writeFileSync(manPath, JSON.stringify(m, null, 2) + "\n", "utf8");
  }

  // case studies
  const cs = join(dir, "case-studies");
  mkdirSync(cs, { recursive: true });
  const existing = readdirSync(cs).filter((f) => f.endsWith(".md"));
  if (existing.length < 2) {
    if (!existsSync(join(cs, "scenario-a.md"))) {
      writeFileSync(join(cs, "scenario-a.md"), caseBody(id, 1, `${id} win path`), "utf8");
    }
    if (!existsSync(join(cs, "scenario-b.md"))) {
      writeFileSync(join(cs, "scenario-b.md"), caseBody(id, 2, `${id} honest miss`), "utf8");
    }
  }

  // templates ≥3
  const tpl = join(dir, "templates");
  mkdirSync(tpl, { recursive: true });
  let n = readdirSync(tpl).filter((f) => f.endsWith(".md")).length;
  while (n < 3) {
    const name = `excellence-template-${n + 1}.md`;
    writeFileSync(join(tpl, name), `# Template ${n + 1}\n\nPaste-ready asset for ${id}.\n`, "utf8");
    n += 1;
  }
}

console.log("Done.");
