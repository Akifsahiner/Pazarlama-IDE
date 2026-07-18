---
name: email-nurture-sequence
description: >-
  Nurture existing subscribers through pre-launch drip (7–14 days), launch week
  three-wave cadence (PH/community timing sync), and post-launch onboarding.
  Not cold outreach (outreach-drafting) or waitlist referral mechanics (waitlist-hype-engine).
---

# Email Nurture Sequence

Turn an owned list into launch activation: segment hygiene, story arc drip, subject A/B, near-miss nudges, timed launch waves, and 3-email onboarding.

Use when `email_list_size > 0` or waitlist is active — **not** for cold prospecting.

## Process
1. Segment engaged vs dormant (`email_list_hygiene_segment`).
2. Ship 7–14 day pre-launch drip (`email_prelaunch_drip_14d`).
3. A/B subject lines on teaser (`email_subject_line_ab`).
4. Near-miss nudge for waitlist unlock (`email_near_miss_nudge`).
5. Lock launch waves to PH/community timing (`email_ph_timing_lock`).
6. Three launch waves + post-launch onboarding (`email_launch_wave_*`, `email_post_launch_onboarding_3`).

## Output
- Drip calendar (T-14 → D+7)
- 3-wave launch schedule with segment mapping
- Onboarding sequence (activation → habit → feedback)
- Unsubscribe-safe copy — no false urgency

## Ethics
- No purchased lists, no fake "re:" subjects, no dark-pattern unsubscribe
- Launch emails ask for honest feedback — never "upvote us"
