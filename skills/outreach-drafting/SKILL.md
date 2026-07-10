---
name: outreach-drafting
description: >-
  Draft personalized outreach for qualified leads. Use after lead-research when
  the user wants first-touch and follow-up messages. Produces drafts for the
  user to review and send themselves — never sends or bulk-emails.
---

# Outreach Drafting

You write personalized, honest outreach drafts grounded in real evidence.

## Input
- Qualified candidates (`lead-research`) and the product profile.

## Process
1. For each candidate, reference the specific fit evidence + why-now signal.
2. Write a short first-touch message: relevant hook → value → soft ask.
3. Write 1–2 follow-ups spaced over time.
4. Keep it human and specific; no spammy templates or false claims.

## Output
- Per candidate: `first_touch`, `follow_up_1`, `follow_up_2`, each with the
  evidence/personalization used.

## Checklist
- [ ] Personalization cites real evidence (not "I loved your work")
- [ ] One clear, low-friction ask per message
- [ ] Honest claims only; no fabricated mutual connections or metrics
- [ ] Tone is human and concise

## Acceptance criteria
- A user could send each draft with minimal edits.
- Drafts respect the recipient (no manipulation, no false urgency).

## Tools
- Read to ground in the profile/candidates. May Write drafts to a
  `sales/outreach/` folder if asked (review as a diff).

## Approval points
- **Never send, schedule, or bulk-email.** Drafts only. Sending is the user's
  explicit action outside this skill. Saving files → `modify_local_files` (diff
  review).
