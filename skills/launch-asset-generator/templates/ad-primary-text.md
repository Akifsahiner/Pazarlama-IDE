# Ad Primary Text — Fill-In Template

Channel-native length limits. **DRAFT — DO NOT PUBLISH.** One variant per hypothesis; change one variable between variants.

---

## Ad config

```
Channel:          [Meta / LinkedIn / Google RSA / Twitter]
Objective:        [conversions / traffic / lead gen]
Audience temp:    [cold / retargeting / lookalike]
Landing URL:      [dedicated LP with UTM]
Positioning spine: [from product profile]
```

---

## Character limits by channel

| Channel | Field | Limit |
|---------|-------|-------|
| Meta | Primary text | 125 chars (125 visible before "See more") |
| Meta | Headline | 40 chars |
| LinkedIn | Intro text | 150 chars (600 max — lead with 150) |
| Google RSA | Headline | 30 chars each (up to 15) |
| Google RSA | Description | 90 chars each (up to 4) |
| Twitter/X | Post text | 280 chars |

---

## Primary text formulas

### Formula A — Outcome + ICP (cold, default)
```
[Outcome verb] [object] for [ICP role plural] — [proof point]. [CTA].
```

### Formula B — Metric hook (B2B, data-driven ICP)
```
[Metric before] → [metric after] for [ICP]. [Product] [mechanism]. [CTA].
```

### Formula C — Customer quote (retargeting / warm)
```
"[Quote ≤15 words]" — [Name, Title, Company]. [CTA].
```

### Formula D — Problem-aware (cold social)
```
Still [painful manual task]? [Product] [automates specific step]. [Risk reversal]. [CTA].
```

---

## Fill-in variants

### Variant 1 (control)
```
Primary text:   ________________________________________________
                ________________________________________________
Char count:     ___/125 (Meta) or ___/150 (LinkedIn lead)

Headline:       ________________________________________________
Char count:     ___/40

Description:    ________________________________________________ (Google only)
Char count:     ___/90

CTA button:     [Learn More / Sign Up / Book Now / Get Started]
```

### Variant 2 (test — ONE variable different from V1)
```
Variable changed: [headline / primary / creative / audience ONLY]

Primary text:   ________________________________________________
Headline:       ________________________________________________
Hypothesis:     We believe [change] will improve [metric] because [reason].
```

---

## UTM template

```
https://[domain]/[lp]?utm_source=[platform]&utm_medium=paid&utm_campaign=[campaign-name]&utm_content=[variant-id]
```

Example: `utm_content=v1-outcome-headline`

---

## Examples (filled)

**Meta — B2B SaaS cold (124 chars):**
```
Cut month-end close from 10 days to 2. Built for SaaS controllers — auto-matches Stripe + bank. Start free, no card.
```

**Meta — Retargeting (98 chars):**
```
You visited Closeflow — month-end automation for SaaS finance teams. Pick up your free trial.
```

**LinkedIn — Metric hook (147 chars):**
```
Ramp time: 14 days → 4 days. RampKit gives ops teams one playbook tied to Slack + HRIS. Series B SaaS teams — book a 15-min walkthrough.
```

---

## Bad vs good

| Bad | Good |
|-----|------|
| "Best-in-class AI platform" | "Cut close from 10 days to 2" |
| 180-char primary on Meta (truncated mid-sentence) | ≤125 with complete thought |
| Homepage URL | Dedicated LP matching ad headline |
| 3 CTAs in one ad | One CTA per variant |
| No UTM | Full UTM on every URL |

---

## Pre-launch checklist

- [ ] Primary text ≤ channel limit (counted)
- [ ] Headline matches LP hero (message match)
- [ ] Proof point traceable to product profile
- [ ] Conversion pixel verified on LP thank-you page
- [ ] Budget cap set at campaign level
- [ ] Hypothesis logged before spend (see paid-ads hypothesis sheet)

---

## Reject the ad copy if:

- Uses banned words: revolutionary, seamless, AI-powered (without specific capability)
- Primary text exceeds visible limit
- LP headline differs from ad headline (message mismatch)
- CTA promises something pricing/onboarding can't deliver
- Variant 2 changes multiple variables simultaneously

## Ethical notes

- Special ad categories (housing, employment, credit) have restricted targeting
- Substantiate all claims — platform policies + FTC apply
- Retargeting frequency: 3–5 impressions/user/week on Meta
