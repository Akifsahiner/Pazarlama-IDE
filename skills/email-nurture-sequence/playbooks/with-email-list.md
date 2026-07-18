# Playbook: With Email List (Standard Nurture)

1k–5k subscribers, mixed engagement, launch within 30 days. **10-day drip + 2 launch waves** — no third wave unless wave 1 metrics healthy.

- **T-14 → T-4:** Four drip emails (problem, build, preview, countdown)
- **T-7:** Subject A/B on preview email
- **T-3:** Near-miss for waitlist tier only (if referral active — coordinate timing with waitlist skill)
- **H+6 / H+9:** Two waves (engaged → general)
- **D+1 / D+3 / D+7:** Onboarding trilogy

Skip wave 3 unless engaged open >35% and unsub <0.25%.

## Preconditions
- [ ] email_list_size ≥1,000
- [ ] Launch date confirmed
- [ ] Primary CTA URL single (signup or PH)

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | Low engagement (<20% opens) | 7-day drip + 1 launch email |
| standard | This playbook | 10-day drip + 2 waves |
| aggressive | ≥5k engaged | Upgrade to aggressive-launch-nurture |

## Timeline
See aggressive playbook with wave 3 removed unless metrics pass gate.

## Tactic stack
1. **`email_list_hygiene_segment`**
2. **`email_prelaunch_drip_14d`** (10-day variant)
3. **`email_subject_line_ab`**
4. **`email_launch_wave_1_engaged`**
5. **`email_launch_wave_2_general`**
6. **`email_post_launch_onboarding_3`**
7. **`email_ph_timing_lock`**

## Orchestration
- If PH launch: H0 silent, waves at H+6/H+9
- If community-only launch: waves at H0+2h and H0+6h same day max

## Realistic outcomes
- 2-wave sequence: 60–70% of aggressive activation with half complaint risk

## Kill / pivot rules
- Skip wave 2 if wave 1 click <5% on engaged

## Ethics line
- Segment honesty: "engaged" defined consistently in ESP
