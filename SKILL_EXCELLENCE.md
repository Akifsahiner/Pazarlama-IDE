# Skill Excellence Standard

Every marketing skill pack is an **executable growth-lead runbook**, not a blog post.
The Brain, Plan Studio, and Edit Agent must apply it to *this* product's profile — timing, sequence, anti-patterns, and honest outcomes.

## North Star

Users should feel:

1. Timing and order exist (e.g. 12:01 PT submit, T-14 hunter DM) — not "post on social."
2. Plan Studio Day N tasks map to skill `tactic` IDs + `instructions_md`.
3. Honest aggression dial: "#1 unrealistic without a warm list" builds trust.

Reference quality: [`skills/ph_launch/principles.md`](skills/ph_launch/principles.md) and [`skills/ph_launch/anti-patterns.md`](skills/ph_launch/anti-patterns.md).

## Required file tree

```
skills/<id>/
  manifest.json          # version, primary_metric, playbook_selector, aggression_playbooks
  SKILL.md               # Agent SDK entry (≤80 lines, execution summary)
  principles.md          # ≥10 numbered, measurable items
  anti-patterns.md       # ≥12 items: Don't / Why / Cost
  decision-tree.json     # aggression dial branches
  kpis.json              # primary + leading + lagging
  playbooks/
    no-audience.md
    with-email-list.md
    b2b-saas.md
    <aggressive-*.md>    # ≥4th playbook (skill-specific name)
  templates/             # ≥3 copy-paste assets
  case-studies/          # ≥2 anonymous scenarios
```

## Playbook H2 contract (lint-enforced)

Every playbook markdown file must include these headings:

1. `## Preconditions`
2. `## Aggression dial`
3. `## Timeline`
4. `## Tactic stack`
5. `## Orchestration`
6. `## Realistic outcomes`
7. `## Kill / pivot rules`
8. `## Ethics line`

## Manifest v2 fields

```json
{
  "id": "ph_launch",
  "version": "1.1.0",
  "changelog": "Added aggressive-top-1 war-room playbook",
  "aggression_playbooks": ["aggressive-top-1"],
  "primary_metric": "ph_rank_day_one",
  "playbook_selector": []
}
```

## Tactic registry

Central IDs live in `server/src/brain/tacticRegistry.ts` (mirrored in desktop `gtmCatalog`).
Plan tasks with a `tactic` field must resolve to a registered ID.

## Quality gates

| Gate | Tool | Pass bar |
|------|------|----------|
| Structural | `npm run skill:audit` / `eval:skills` | principles ≥10, anti ≥12, playbooks ≥4 sections, case-studies ≥2 when claimed |
| Behavioral | `eval:gtm` | generic titles rejected, PH ethics |
| LLM judge | `evals/skill-quality*.mjs` | avg ≥4.2 (when API key present) |

## Runtime contract

- Brain: `retrieveSkills` injects primary playbook + anti-patterns into decisions.
- Plan: `lintPlaybook` requires tactic coverage (100% for `ph-number-one`).
- Edit: `contextPrefix` includes formatted skill pack (playbook + anti-patterns).

## Aggression dial (honest)

| Level | Meaning |
|-------|---------|
| conservative | Minimum viable runway; avoid overreach |
| standard | Best practice for warm assets |
| aggressive | Max ethical intensity (e.g. PH #1 war-room) — never upvote farms / paid hunters |

## Commands

```bash
# From server/
npm run skill:audit      # write skills/_audit/gap-matrix.json + exit 1 on hard gaps
npm run skill:scaffold -- <skillId>   # create missing dirs/files from template
npm run eval:skills      # skill-coverage + skill-audit
```
