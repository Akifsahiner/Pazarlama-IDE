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
