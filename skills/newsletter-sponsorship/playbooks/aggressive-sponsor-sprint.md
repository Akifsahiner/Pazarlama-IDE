# Playbook: Aggressive Sponsor Sprint

4-week ethical maximum: 3 niche dev newsletter slots, A/B hooks, strict UTM attribution, and CPA kill rules. **Not** spray-and-pray across 10 lists or paid social lookalikes.

## Preconditions
- [ ] Live landing page with mobile QA (signup or trial <60s)
- [ ] UTM analytics capturing `signup_complete` / `trial_start` by campaign
- [ ] Shortlist ≥8 newsletters scored; top 3 overlap ≥4/5
- [ ] Media kits received for top 3 (open rate, sponsor CTR, price, lead time)
- [ ] Native copy Hook A + Hook B drafted (≤120 words each)
- [ ] Max CPA and min CTR floors written before first wire
- [ ] Budget ≥$3k for 3 slots + 10% buffer
- [ ] Calendar: no PH/HN/community spike same week as slot #1

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | LP thin / no analytics | `no-audience` — one slot only |
| standard | $1.5–3k, 2 lists | Two slots 14d apart; single hook |
| aggressive | LP + proof + $3k+ | This playbook — 3 slots, A/B hooks, kill rules |

**Honest ceiling:** Without technical LP and ≥4/5 overlap, expect $250–500 CPA — not $50 miracles. Front-page newsletter ≠ front-page HN; measure signups.

## Timeline

| Phase | When | Action |
|-------|------|--------|
| T-21 | −21d | Shortlist 8–12 niche newsletters; overlap score |
| T-18 | −18d | Media kit requests (top 5); screenshot last 3 sponsor blocks |
| T-14 | −14d | Lock UTM scheme; creative brief to publishers |
| T-12 | −12d | Book slot #1 (highest overlap); Hook A copy approved |
| T-10 | −10d | Book slot #2 (different stack/newsletter); Hook B copy |
| T-7 | −7d | Book slot #3 or hold budget pending slot #1 signal |
| T-3 | −3d | QA all URLs mobile; sales inbox tag live |
| H0 | Send #1 | Newsletter A drops; `utm_content=hook_a` |
| H+7 | +7d | Send #2 — different newsletter; `utm_content=hook_b` |
| H+14 | +14d | Send #3 only if slot #1 or #2 CPA ≤ ceiling |
| D+7 each | +7d from send | Teardown per slot; kill rule evaluation |
| D+28 | +28d | Sprint retrospective; scale winners, blacklist losers |

## Tactic stack

1. **`nl_sponsor_shortlist_niche` (T-21)** — 8–12 dev newsletters (Bytes, React Status, JS Weekly, etc.). Metric: spreadsheet with price, cadence, contact.
2. **`nl_audience_overlap_score` (T-21)** — Score 1–5: stack, role, geo, open rate. Metric: only ≥4/5 eligible for sprint.
3. **`nl_media_kit_request` (T-18)** — Email template requesting opens, sponsor CTR, audience breakdown, example blocks. Metric: 3 kits in hand before booking.
4. **`nl_sponsor_creative_brief` (T-14)** — One-pager: product, ICP, CTA URL, screenshot specs, disclosure. Metric: publisher written OK.
5. **`nl_native_copy_120_words` (T-12)** — Hook A + B variants; native editorial tone. Metric: ≤120 words, one primary link.
6. **`nl_utm_campaign_scheme` (T-14)** — `utm_source={{newsletter_slug}}&utm_medium=newsletter_sponsor&utm_campaign=nl_sprint_{{YYYYMM}}&utm_content=hook_a|hook_b`. Metric: test links fire events.
7. **`nl_slot_booking_lead_time` (T-12)** — Book ≥14d before send; avoid holiday issues. Metric: confirmation emails logged.
8. **`nl_creative_ab_hook` (H0 / H+7)** — Same LP, different opening line across sends. Metric: winner = higher CTR at equal spend.
9. **`nl_kill_rule_cpa_7d` (D+7 each)** — If CPA > ceiling AND clicks ≥200, pause that newsletter. Metric: documented kill/continue.
10. **`nl_post_sponsor_teardown` (D+7 each)** — Clicks, signups, CPA, activation, hook winner, sales notes. Metric: teardown in experiment log.
11. **`nl_max_consecutive_slots_2` (ongoing)** — Never book >2 consecutive issues same newsletter without skip. Metric: 0 violations in sprint calendar.

## Orchestration

- **Primary:** Highest overlap newsletter (slot #1) — cleanest learning signal
- **Sequential:** Slot #2 different newsletter 7d later — isolates list quality
- **Conditional slot #3:** Fund only if one of first two hits CPA ≤ ceiling
- **Do not:** Book 3 sends same week, reuse HN UTM campaign, or buy "remnant" slots without CTR history
- **Support:** Founder LinkedIn post D+7 on *learnings* — not "we're sponsoring everywhere"

## Realistic outcomes

| Profile | CTR | Signups/slot | CPA (7d) | Notes |
|---------|-----|--------------|----------|-------|
| Aggressive (fit ≥4/5, strong LP) | 0.9–1.4% | 60–150 | $80–180 | Scale winners 2×/quarter |
| Standard (fit 3–4/5) | 0.5–0.9% | 20–60 | $180–350 | Optimize hook before rebook |
| Poor fit / weak LP | <0.5% | <15 | >$400 | Kill; fix LP not budget |

## Kill / pivot rules

- **D+3:** Publisher reports <0.4% CTR → flag creative; do not rebook until hook rewritten
- **D+7:** CPA > ceiling with ≥200 clicks → kill that newsletter; redirect slot #3 budget
- **D+7:** CTR strong but activation <15% → pivot to LP/onboarding; newsletter may be fine
- **Any send:** Broken URL or UTM → pause sprint; credit negotiation with publisher
- **Sprint end:** Zero slots hit CPA → 30d pause; run `no-audience` LP experiments

## Ethics line

- **Never:** Fake endorsements, undisclosed affiliate framing, click inflation from team/list
- **Always:** Honor publisher sponsored labels, native tone, honest metrics in copy
- Aggressive = disciplined multi-slot test with kill rules — not maximum spend regardless of outcomes
