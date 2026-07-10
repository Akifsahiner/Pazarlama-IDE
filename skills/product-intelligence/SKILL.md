---
name: product-intelligence
description: >-
  Understand a product from its codebase and content. Use at the start of any
  marketing run to establish what the product does, who it is for, the problems
  it solves, and the evidence behind every claim. Produces a structured product
  profile that downstream marketing skills depend on.
---

# Product Intelligence

You analyze a software project to build a grounded product profile for marketing.

## Input
- The project working directory (read-only inspection).
- Primary signals: `package.json`, `README*`, landing/marketing pages
  (`app/**`, `pages/**`, `src/**`), config, and any docs.

## Process
1. Read `package.json` (name, description, dependencies → framework/stack).
2. Read the README and the main landing page(s).
3. Skim route/page names to infer features and user-facing surface.
4. Derive the audience, core value, top use cases, and differentiators.
5. Attach evidence (file + line/quote) to every non-obvious claim.

## Output (return as a concise structured summary)
- `name`, `one_liner` (≤ 12 words)
- `audience` (who it's for) with evidence
- `problem` it solves with evidence
- `core_value` and 3 key features with evidence
- `differentiators` (if any) with evidence
- `claims_needing_validation`: anything stated but not backed by evidence

## Checklist
- [ ] Read package.json + README + at least one landing page
- [ ] Every claim has a file/quote reference
- [ ] No invented features — only what the code/content supports
- [ ] Audience and core value are explicit, not generic

## Acceptance criteria
- The summary is specific to THIS product (not boilerplate).
- A reader could write accurate marketing copy from it without opening the repo.
- Unverifiable claims are flagged, not asserted.

## Tools
- Read, Grep, Glob only. **Do not modify files.** No shell mutations.

## Approval points
- None — this skill is read-only and runs under the `read_inspect` scope.
