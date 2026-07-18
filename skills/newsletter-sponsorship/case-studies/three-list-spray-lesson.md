# Case study: Three-list spray + UTM miss → $2.1k burned (anonymous)

## Context
Early-stage API monitoring tool, $2.5k budget, rushed launch same week as Show HN. Founder booked TLDR Dev, a generic "tech trends" digest, and a cheap remnant slot — same week.

## What went wrong
- `nl_utm_campaign_scheme` incomplete — two links missing `utm_content`; HN campaign shared name `launch_march`
- `nl_audience_overlap_score` skipped — "tech trends" list was 85% non-technical readers
- `nl_slot_booking_lead_time` violated — remnant slot 3 days out, Thanksgiving issue
- `nl_kill_rule_cpa_7d` defined but ignored at D+7 ("wait for brand lift")
- `nl_max_consecutive_slots_2` — booked same cheap list 3 weeks straight; CTR 1.2% → 0.4% → 0.3%

## Outcome
| Newsletter | Cost | Attributed signups | CPA |
|------------|------|-------------------|-----|
| TLDR Dev | $900 | 12 | $75 |
| Tech trends digest | $700 | 3 | $233 |
| Remnant (3wk × $500) | $1,500 | 4 | $375 |

- Blended measurable CPA unreliable; ~19 signups claimed, 8 verifiable with UTMs
- HN same week stole founder attention; sponsor URLs not QA'd — 404 for 4h on mobile
- Publisher feedback: copy "read like an ad"

## Recovery
- 30d sponsorship pause
- Fixed UTM scheme from template; single React Status slot 21d later
- Second attempt: 41 signups, $156 CPA, 0.95% CTR

## Lesson
One week, three lists, broken attribution = learning zero. Overlap score and UTM before wire are not bureaucracy — they're the kill switch. Never book consecutive remnant slots; fatigue is real and measurable.
