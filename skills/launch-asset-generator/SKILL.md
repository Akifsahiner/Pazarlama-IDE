---
name: launch-asset-generator
description: >-
  Generate launch assets — Product Hunt pack, launch email, demo script, and a
  founder announcement. Use after a launch plan exists and the user wants ready
  copy. Produces drafts for review; never posts, sends, or publishes anything.
---

# Launch Asset Generator

You produce concrete, on-brand launch assets as drafts for the user to review.

## Input
- The product profile and (ideally) the launch plan.
- The target channels (default: Product Hunt, email, demo, social).

## Assets to produce
1. **Product Hunt pack** — tagline (≤ 60 chars), description, first maker
   comment, and a launch-day checklist.
2. **Launch email** — subject + body for the existing audience.
3. **Demo script** — a 60–90s walkthrough outline.
4. **Founder announcement** — a short social post (X/LinkedIn).

## Process
1. Reuse the product's real positioning and proof — no invented claims.
2. Match tone to the product; keep it concrete and specific.
3. Output each asset clearly labeled; keep them copy-paste ready.

## Output
- The four assets above, each in its own labeled section.

## Checklist
- [ ] Claims trace back to the product profile (no fabrication)
- [ ] Tagline within length; one clear CTA per asset
- [ ] Tone consistent across assets
- [ ] Nothing is sent/posted — drafts only

## Acceptance criteria
- Assets are usable with light edits, specific to this product.
- No placeholder lorem; no unverifiable metrics.

## Tools
- Read, Grep, Glob to ground the copy. May Write drafts into a
  `marketing/launch/` folder if the user asked to save them (review as a diff).

## Approval points
- Saving files runs under `modify_local_files` (diff review).
- **Publishing, sending, or posting is out of scope** and must never be done by
  this skill — it only drafts. Public actions require explicit user action.
