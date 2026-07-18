# Playbook: Analytics Measurement With No Audience

At <100 users and no GA4, measurement is **manual, sparse, and decision-focused**. Design the system you'll automate later — don't pretend you have statistical significance.

- **Pick one north-star for this stage.** Pre-launch: qualified signups or founder calls booked. Not MRR, not retention — you don't have the N.
- **Map funnel to routes you actually have.** `/` → visit. `/signup` or waitlist form → intent. First in-app action → activation. Missing route = missing step — flag, don't invent events.
- **Manual KPI log daily (5 minutes).** Spreadsheet or `weekly-review.md`: date, visitors (if known), signups, outreach replies, PH upvotes, ad spend. Honest zeros beat fabricated dashboards.
- **Event taxonomy draft for engineering.** Even without GA4, name events now (`signup_completed`, `activation_first_project`). When analytics connects, implementation is copy-paste from taxonomy doc.
- **Cohort by channel from day 1.** Tag every signup: PH, Twitter, cold outreach, founder call, organic. At 20 users, one PH cohort of 15 tells you more than "20 total signups."
- **Don't A/B test.** Need ~300 conversions per variant. Instead: weekly narrative — "This week we changed headline X, signups went 2→5, all from LinkedIn."
- **5-second qualitative loop.** Ask every signup (email or call): "What almost stopped you?" Log answers — that's your measurement-rich qualitative KPI.
- **Weekly review non-negotiable.** 30 min Friday: north-star vs last week, channel breakdown, one decision for next week. Empty manual log = skill output failure.
- **Flag `hasAnalytics: false` prominently.** Every measurement plan states: "Numbers are manual until GA4 connected — do not report to investors as automated."

Track: manual_log_completeness (≥5 days/week), north-star trend week-over-week, event taxonomy ready for engineering handoff.

## Preconditions
- [ ] Marketing profile complete for analytics-measurement
- [ ] Primary metric named before execution
- [ ] Honest aggression dial matches real assets (list, proof, team hours)

## Aggression dial

| Level | When | Focus |
|-------|------|-------|
| conservative | Thin assets / solo | One channel, learning metrics |
| standard | Warm channel or list | Best-practice cadence from narrative above |
| aggressive | Strong proof + distribution | Execute full tactic stack with kill rules |

## Timeline
- **T-14**: Instrument leading metric; lock ICP + offer
- **T-7**: Ship assets referenced in narrative
- **T-1**: Final checklist + supporter warm-up
- **H0**: Primary launch motion
- **D+1…D+7**: Measure, teardown, kill or scale

## Tactic stack
1. Name bottleneck with 3 profile citations
2. Ship one measurable experiment this week
3. Tie Plan Studio tasks to registry tactic ids
4. Cap parallel channels at 2
5. Predefine kill/pivot rule before spend or blast

## Orchestration
- One primary channel from narrative; ≤2 support channels
- Repo/browser/asset tasks split by execution_mode

## Realistic outcomes
- State honest bands — do not promise #1 PH or viral without assets
- Leading metric moves in 7–14d when playbook matches profile

## Kill / pivot rules
- Leading metric misses after agreed sample → stop and rewrite hypothesis
- Never add channels when primary motion underperforms

## Ethics line
- No fake metrics, fake social proof, undisclosed ads, or ToS-breaking growth hacks
