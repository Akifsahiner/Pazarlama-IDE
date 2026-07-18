# Template: Embargo checklist

Use for every launch with press outreach. Copy to launch doc; founder + marketing sign off at T-3.

---

## Embargo definition

| Field | Value |
|-------|-------|
| **Launch datetime (UTC)** | {{launch_datetime_utc}} |
| **Local display** | {{launch_datetime_local}} ({{timezone_label}}) |
| **Embargo lifts** | Same instant globally — stories may publish at or after this time |
| **Product/public announcement** | No public mention before lift |

---

## Internal stakeholders (briefed by T-7)

| Role | Name | Acknowledged embargo? | Date |
|------|------|----------------------|------|
| Founder | | [ ] | |
| Marketing | | [ ] | |
| Email/ESP owner | | [ ] | |
| Social (X/LinkedIn) | | [ ] | |
| Sales / AE lead | | [ ] | |
| Engineering (status page) | | [ ] | |
| Investors (if applicable) | | [ ] | |

**Rule:** No teasers with launch date, no "big news tomorrow" posts, no early access tweets.

---

## External parties (embargo agreement)

| Reporter / outlet | Contact | Pitch sent | Confirmed embargo? | Exclusive? |
|-------------------|---------|------------|-------------------|------------|
| {{outlet_1}} | | [ ] | [ ] | [ ] None [ ] Yes — note terms |
| {{outlet_2}} | | [ ] | [ ] | |
| {{outlet_3}} | | [ ] | [ ] | |
| {{outlet_4}} | | [ ] | [ ] | |
| {{outlet_5}} | | [ ] | [ ] | |

**Exclusive rule:** Only one exclusive per news cycle. If granted, document terms in writing.

---

## Materials sync

- [ ] Press kit PDF footer matches `launch_datetime_utc`
- [ ] All 5 pitch emails use identical embargo line
- [ ] Founder quote approved and unchanged across kit/pitches
- [ ] Customer logos/metrics have permission emails archived
- [ ] Demo URL works; UTM `utm_source=press` on LP
- [ ] Scheduled emails/social posts **queued for post-lift only** (verify send time)

---

## T-1 war room prep

- [ ] Founder calendar blocked H−1 through H+6
- [ ] Monitoring sheet ready (outlets, Google News alerts, UTM dashboard)
- [ ] Fact-check one-pager: pricing, metrics, founding date, competitor claims
- [ ] Phone charged; reporter callback ≤30 min during H0–H+6
- [ ] Personal social logged out or draft posts hidden until H0

---

## H0 launch hour

| Time | Action | Owner | Done |
|------|--------|-------|------|
| H−15m | Final scan: no early stories online | Marketing | [ ] |
| H0 | Embargo lifts — OK to publish own announcement | Founder | [ ] |
| H+1 | Monitoring pass #1 + UTM check | Marketing | [ ] |
| H+3 | Monitoring pass #2 | Marketing | [ ] |
| H+6 | Monitoring pass #3; end active war room | Marketing | [ ] |

---

## Leak response (if story appears early)

1. Document URL + timestamp screenshot
2. Do **not** blame reporter publicly
3. Contact editor politely if material breach
4. Internal: pause other outbound until lift
5. Post-mortem: how leak happened (founder social? investor? mis-scheduled email?)

---

## Post-lift (H+24 / H+48)

- [ ] Thank-you note to reporters who covered
- [ ] Correction requests sent for factual errors within 4h of discovery
- [ ] H+48 kill/pivot: if 0 pickups → teardown + owned media (`pr_kill_no_pickup_48h`)
- [ ] Log `press_pickups_embargo_window` and lessons for next cycle

---

## Sign-off

| | Name | Signature / date |
|---|------|------------------|
| Founder | | |
| Marketing lead | | |
