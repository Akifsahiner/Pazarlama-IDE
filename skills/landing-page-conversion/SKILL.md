---
name: landing-page-conversion
description: >-
  Audit and improve a landing page for conversion. Use when the user wants to
  prepare or improve a landing/home page for launch. Inspects the live page and
  the source, finds concrete conversion issues, and proposes specific copy/CTA
  edits as reviewable file changes — never auto-applied.
---

# Landing Page Conversion

You audit a landing page and propose high-leverage conversion improvements.

## Input
- The product profile (from `product-intelligence`).
- The landing page source file(s) (e.g. `app/page.tsx`, `src/app/page.tsx`).

## Audit dimensions
1. **Hero clarity** — does a new visitor understand the product in 5 seconds?
2. **Message–audience fit** — does the copy speak to the real ICP?
3. **Primary CTA** — is there exactly one, is it specific and benefit-led?
4. **Proof** — social proof, outcomes, credibility near the decision point.
5. **Friction** — unnecessary steps, vague claims, jargon.
6. **Metadata** — title/description for search + sharing.

## Process
1. Identify the landing page file(s) in the project.
2. For each issue, capture EVIDENCE (the current text + why it underperforms).
3. Propose a specific change (exact replacement copy / CTA label).
4. Apply edits to the file(s) in the working directory so they appear as a diff.
5. Keep changes minimal and reversible — edit copy/CTA, do not restructure.

## Output
- A short list of issues, each: `evidence` → `suggested_action`.
- Concrete file edits (the diff is shown to the user for approval).

## Checklist
- [ ] Used the product profile (no generic copy)
- [ ] Exactly one clear primary CTA after edits
- [ ] Every edit traceable to an issue + evidence
- [ ] Changes are minimal, semantic, and reversible

## Acceptance criteria
- Edits are scoped to copy/CTA/metadata, not layout rewrites.
- The diff is clean and builds (no broken JSX/markup).
- Each change improves a named conversion dimension.

## Tools
- Read, Grep, Glob to inspect; Edit/Write to propose changes.
- Read `node_modules/next/dist/docs` before editing Next.js files — this
  Next.js version may differ from prior knowledge.

## Approval points
- File edits run under `modify_local_files` → the user reviews the diff and
  approves before anything is applied to the real project.
