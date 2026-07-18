# Playbook: No Audience (Newsletter Runway)

No prior sponsor data, thin budget (<$1.5k/mo), or LP/UTM not ready. Newsletter sponsorship is a **paid learning channel** — not your first move.

- **Days 1–7: Ship LP + UTM.** Signup flow works mobile; GA4/PostHog events: `signup_complete`, `trial_start`. Test URL manually.
- **Days 8–14: Build shortlist (desk research).** List 15 niche newsletters; score overlap 1–5 from About pages, sample issues, Twitter bios of readers. No outreach yet.
- **Days 15–21: Request 2 media kits only.** Smallest overlap ≥4/5 lists. Compare sponsor CTR examples in last 3 issues (screenshot sponsor blocks).
- **Day 22: Draft native copy v1** using `templates/creative-native-copy.md` — ≤120 words, one hook.
- **Day 28+: Book ONE slot** ($500–1.2k) with 14d+ lead time. Single send = clean attribution.
- **D+7: Teardown** — if CPA >2× ceiling or CTR <0.5%, fix LP/copy before slot #2.

Realistic outcome: 28-day runway → one learning slot, 10–35 signups if fit is decent, clear kill/scale signal.

## Preconditions
- [ ] Marketing profile complete for newsletter-sponsorship
- [ ] Primary metric `nl_sponsor_signups_7d` named before spend
- [ ] Landing page live with UTM capture
- [ ] Max CPA and CTR floors written in experiment log

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | No LP / no analytics | Delay all spend; ship instrumentation |
| standard | LP live, <$1.5k budget | One slot, one newsletter, 28d runway |
| aggressive | LP + $3k+ ready | Graduate to `aggressive-sponsor-sprint` |

## Timeline
- **T-28**: LP + UTM QA
- **T-21**: Shortlist 15 newsletters; overlap score
- **T-14**: Media kit requests (2 lists)
- **T-7**: Native copy + sponsor brief approved
- **H0**: First sponsor send (single list)
- **D+7**: Teardown + kill/scale decision

## Tactic stack
1. **`nl_sponsor_shortlist_niche`** — 15 names; top 5 scored
2. **`nl_audience_overlap_score`** — Document ICP fit rationale
3. **`nl_media_kit_request`** — 2 kits only; compare sponsor CTR
4. **`nl_sponsor_creative_brief`** — One-page brief for publisher
5. **`nl_utm_campaign_scheme`** — Lock before booking
6. **`nl_native_copy_120_words`** — Single hook variant
7. **`nl_slot_booking_lead_time`** — ≥14d before H0
8. **`nl_post_sponsor_teardown`** — D+7 metrics doc

## Orchestration
- One newsletter, one slot — no parallel sponsors week 1
- Plan Studio tasks map to tactic IDs above
- Do not stack with PH/HN same week (attribution collision)

## Realistic outcomes
- 28d runway + decent fit: 10–35 signups, CPA data to scale or kill
- Skipping LP/UTM → unmeasurable spend; predictable waste

## Kill / pivot rules
- No UTM data by H0 → cancel or postpone slot
- CTR <0.5% at D+3 with publisher report → do not rebook; rewrite hook
- CPA >2× ceiling at D+7 → pause sponsorship 30d; fix LP

## Ethics line
- Disclose sponsored nature per publisher policy
- No fake testimonials or implied editorial endorsement
