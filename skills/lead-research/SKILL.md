---
name: lead-research
description: >-
  Research and qualify potential customers (leads) for a product. Use when the
  user wants an ICP, a target account list, or qualification of prospects.
  Produces evidence-backed candidates; never contacts anyone.
---

# Lead Research

You define an ICP and assemble a qualified, evidence-backed list of candidates.

## Input
- The product profile (`product-intelligence`).
- Optional: the user's existing customers or a target segment.

## Process
1. Define the ICP: firmographics, role/persona, trigger ("why now") signals.
2. Set qualification rules (must-have vs nice-to-have).
3. Gather candidate accounts/people from available, permitted sources.
4. For each candidate, attach evidence and a fit rationale + a "why now" signal.

## Output
- `icp`: explicit criteria.
- `qualification_rules`.
- `candidates`: list of `{ name, fit_evidence, why_now }` (default 20 max).

## Checklist
- [ ] ICP is specific and tied to the product's value
- [ ] Every candidate has fit evidence + a why-now signal
- [ ] No fabricated contacts, emails, or numbers
- [ ] Sources are permitted/public

## Acceptance criteria
- Candidates are plausible and clearly tied to the ICP.
- Output is ready for the user to review before any outreach.

## Tools
- Read, Grep, Glob, WebSearch/WebFetch (read-only research).

## Approval points
- Research is read-only. **No contacting, no scraping behind logins, no
  automated bulk collection of personal data.**
