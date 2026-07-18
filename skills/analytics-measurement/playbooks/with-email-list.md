# Playbook: Analytics Measurement With an Existing Email List

List + site traffic changes what you can measure. Focus on **email→site→conversion chain** and list health — not vanity open rates alone.

- **North-star: list-attributed conversions.** Qualified signups or activations where `utm_source=email` or self-reported "newsletter" on thank-you page.
- **Instrument email sends before launch week.** UTM on every link: `utm_source=newsletter&utm_medium=email&utm_campaign=[send-name]`. Match campaign name to subject line for post-hoc analysis.
- **Track send-level funnel.** Per send: delivered → opened → clicked → landed → signed up. Bottleneck diagnosis: low open = subject. Low click = CTA/copy. Low signup = landing page.
- **List growth rate as leading indicator.** Net new subscribers/week, unsubscribe rate (<0.3% per send healthy), spam complaint rate (<0.1%). Sudden unsub spike = message-market mismatch.
- **Segment performance in weekly review.** Engaged vs cold cohort conversion. If engaged converts 5× cold, double down on re-engagement before list-wide blasts.
- **Cohort retention by signup source.** Email-sourced users vs PH vs organic — do email users activate? If not, email attracts wrong ICP or onboarding fails for that segment.
- **GA4 if connected: link email to user ID.** `signup_completed` event with `user_id` + `acquisition_source`. Enables email cohort retention without spreadsheet hell.
- **Manual backup for email platform gaps.** ESP shows opens; site shows signups. Reconcile weekly — ESP click count should ≈ GA landing sessions with matching UTM.
- **Pre-launch baseline week.** Measure list send performance 1 week before launch. Launch-week lift = send conversion rate vs baseline — not absolute numbers alone.

Track: email-attributed signup rate, list health (unsub/complaint), engaged-segment vs cold-segment activation delta.

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
