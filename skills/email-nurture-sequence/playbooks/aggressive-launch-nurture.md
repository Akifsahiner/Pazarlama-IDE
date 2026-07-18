# Playbook: Aggressive Launch Nurture

14-day pre-launch drip + launch week 3 waves (PH/community-synced) + 3-email post-launch onboarding. For ≥5k engaged list **or** ≥1k with coordinated PH/community launch.

## Preconditions
- [ ] Double opt-in or documented consent for marketing email
- [ ] ESP segments: engaged / warm / dormant defined
- [ ] Launch date + primary spike channel locked (PH, community, or standalone)
- [ ] UTM scheme: `utm_campaign=prelaunch_d|launch_w1|launch_w2|launch_w3|onboard_d1`
- [ ] Founder from-name + reply-to monitored launch week
- [ ] Unsubscribe + List-Unsubscribe header verified in ESP

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | 200–1k list | 7-day drip + 1 launch email + 2 onboarding |
| standard | 1k–5k, mixed engagement | 10-day drip + 2 launch waves + 3 onboarding |
| aggressive | ≥5k engaged or PH war-room | 14-day drip + 3 waves + near-miss + PH timing lock |

**Honest ceiling:** List with <20% engaged opens → wave 1 open rate 25–35%, not 50%. State ceiling in decision.

## Timeline

| Phase | When | Action |
|-------|------|--------|
| T-21 | −21d | List hygiene + segment export |
| T-14 | −14d | Pre-launch drip Day 1 (problem story) |
| T-10 | −10d | Drip Day 5 (build log / screenshot) |
| T-7 | −7d | Subject A/B teaser; winner locked |
| T-3 | −3d | Near-miss nudge (waitlist unlock or teaser non-clickers) |
| T-1 | −1d | PH/community timing lock + wave schedule |
| H0 | Spike | **No email** if PH — organic seed (`ph_submit_1201_pt`) |
| H+6 | ~6am PT | Wave 1 → engaged segment |
| H+9 | ~9am PT | Wave 2 → general + warm |
| H+12 | ~12pm PT | Wave 3 → reframe / "in case you missed" |
| D+1 | +1d | Onboarding #1 activation checklist |
| D+3 | +3d | Onboarding #2 one-feature habit |
| D+7 | +7d | Onboarding #3 feedback + teardown metrics email |

## Tactic stack

1. **`email_list_hygiene_segment` (T-21)** — Engaged/warm/dormant; remove hard bounces. Metric: segment sizes logged.
2. **`email_prelaunch_drip_14d` (T-14)** — 4–6 emails: story arc, not discounts. Metric: calendar with send dates.
3. **`email_subject_line_ab` (T-7)** — A/B on teaser; 20% split; winner for wave 2 subject pattern. Metric: winner ≥10% relative lift or default kept.
4. **`email_story_arc_teaser` (T-7)** — Sneak peek + single CTA preview waitlist/demo. Metric: click rate baseline recorded.
5. **`email_near_miss_nudge` (T-3)** — 1-invite-from-unlock OR opened-but-no-click. Metric: single segment, one send.
6. **`email_ph_timing_lock` (T-1)** — Wave times on calendar; PH H0 = no blast. Metric: signed schedule shared with launch channel owner.
7. **`email_launch_wave_1_engaged` (H+6)** — Engaged only; founder from-name; one CTA. Metric: send logged + UTM.
8. **`email_launch_wave_2_general` (H+9)** — General list minus dormant; different subject. Metric: send logged.
9. **`email_launch_wave_3_reframe` (H+12)** — Optional if unsub <0.3% after wave 2; "honest story" angle. Metric: send or skip documented.
10. **`email_post_launch_onboarding_3` (D+1–D+7)** — Activation → habit → feedback. Metric: 3 sends scheduled.
11. **`email_unsubscribe_compliance` (T-14)** — Footer + List-Unsubscribe; physical address if CAN-SPAM. Metric: test inbox check pass.
12. **`email_teardown_metrics_d7` (D+7)** — Internal + optional public email with honest launch stats. Metric: open/click/activation rollup.

## Orchestration

- **Primary:** ESP timed waves tied to launch spike
- **Parallel:** Founder LinkedIn at H+9 (not duplicate email copy)
- **Do not:** Wave 1 at PH H0; do not email dormant segment launch week
- **Handoff:** Post D+7 activation → product lifecycle or success team

## Realistic outcomes

| Profile | Wave 1 open | Launch week activations | Unsub rate |
|---------|-------------|-------------------------|------------|
| Aggressive (5k+ engaged) | 40–55% | 8–15% of engaged clicks → activate | <0.4% |
| Standard (1–5k) | 30–45% | 5–10% | <0.6% |
| Thin list (<500) | 25–35% | 3–8% | monitor closely |

## Kill / pivot rules

- Wave 1 unsub >0.3% → cancel wave 3
- Wave 1 open <20% on engaged → pause wave 2; fix from-name/subject
- Complaint rate >0.1% → stop all sends 72h; audit consent
- Activation <5% after 500 clicks → fix onboarding email #1, not more blasts

## Ethics line

- No false "Re:" subjects, no vote asks, no purchased lists
- Launch emails disclose relationship ("You're on our waitlist because…")
- Aggressive = more **timed** touchpoints to opted-in users — not harassment
