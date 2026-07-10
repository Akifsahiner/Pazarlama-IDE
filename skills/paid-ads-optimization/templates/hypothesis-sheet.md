# Hypothesis Sheet — Paid Ads Template

One variable per test. Log before spend, not after. Minimum sample: 100 clicks or $200 spend per variant — whichever comes first.

---

## Test header

```
Test ID:       [HYP-001]
Date launched: [YYYY-MM-DD]
Channel:       [Google Search / Meta / LinkedIn / etc.]
Campaign:      [Campaign name]
Owner:         [Name]
Status:        [Running / Winner / Killed / Inconclusive]
```

---

## Hypothesis statement

```
We believe [audience/segment] will respond to [single variable change]
because [insight from data, customer call, or competitor research].

Success metric: [CPA / trial signup / demo booked] ≤ $[target]
Failure metric: CPA > $[kill threshold] after $[spend cap] or [N] clicks
```

**Example:**
```
We believe Head of Ops titles on LinkedIn will respond to "cut onboarding from 14 days to 2"
because 4/5 demo calls mentioned ramp time last month.

Success: CPA ≤ $85 for demo booked
Failure: CPA > $170 after $400 spend
```

---

## Control vs variant (ONE variable only)

| Element | Control (A) | Variant (B) | Variant (C) optional |
|---------|-------------|-------------|----------------------|
| **Variable under test** | [e.g. Headline] | | |
| Headline | [text] | [text] | [text] |
| Primary text | [same] | [same] | [same] |
| Image/video | [same] | [same] | [same] |
| Audience | [same] | [same] | [same] |
| Landing page | [same URL] | [same URL] | [same URL] |
| Bid strategy | [same] | [same] | [same] |

**Valid single variables:** headline, primary text, creative (image vs video), audience segment, LP headline, CTA button copy, offer (trial length).

**Invalid:** changing headline AND image AND audience simultaneously — you'll learn nothing.

---

## Results tracker

| Variant | Impressions | Clicks | CTR | Spend | Conversions | CPA | Notes |
|---------|-------------|--------|-----|-------|-------------|-----|-------|
| A (control) | | | | | | | |
| B | | | | | | | |
| C | | | | | | | |

**Review date:** [launch + 7 days]

---

## Decision log

```
Result:     [Winner: B / Kill all / Inconclusive]
Action:     [Scale B 20% budget / Pause C / New test HYP-002 on creative]
Learning:   [One sentence — e.g. "Outcome headlines beat feature headlines 2:1 on CPA"]
Next test:  [HYP-002 — test video creative against winning headline]
```

---

## Kill / scale rules (defaults)

| Signal | Threshold | Action |
|--------|-----------|--------|
| Kill | CPA > 2× target after $200 spend | Pause variant; do not tweak bids — fix the variable |
| Inconclusive | CPA within 15% of target, low volume | Extend 7 days or increase budget 25% once |
| Scale | CPA ≤ target for 3 consecutive days | Increase budget 20% every 3 days |
| Ceiling | CPA rises > 25% after scale | Roll back to previous budget; audience saturated |

---

## 30-day test roadmap (sequential)

| Week | Test ID | Variable | Rationale |
|------|---------|----------|-----------|
| 1 | HYP-001 | Headline (outcome vs feature) | Establish message baseline |
| 2 | HYP-002 | Creative (static vs 15s video) | Lock headline from HYP-001 |
| 3 | HYP-003 | Audience (job title narrow vs broad) | Lock creative from HYP-002 |
| 4 | HYP-004 | Landing page headline match | Message match to winning ad |

---

## Pre-launch checklist

- [ ] Conversion pixel / CAPI firing — verified in platform diagnostics
- [ ] UTM parameters on every ad URL
- [ ] Dedicated LP per campaign — headline matches ad
- [ ] Budget cap set at campaign level (not "unlimited" on day 1)
- [ ] Hypothesis written before ad goes live — not retrofitted

---

## Reject the test if it:

- Changes 2+ variables without factorial design
- Has no numeric kill threshold ("we'll see how it goes")
- Runs on brand campaign traffic mixed with prospecting
- Uses optimized-for-clicks bidding before 50 conversions in account history

## Ethical notes

- Special ad categories (housing, employment, credit) have restricted targeting — verify before launch
- Don't advertise claims you can't substantiate; platform policies + FTC apply to ad copy
- Retargeting frequency cap: 3–5 impressions/user/week on Meta to avoid stalker effect
