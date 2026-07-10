# KPI Tree — Fill-In Template

One north-star per phase. Every KPI below must **drive a decision** — if changing it wouldn't change what you do Monday, delete it.

---

## Measurement context

```
Product:           [name]
Company stage:     [prelaunch / launch week / growth]
hasAnalytics:      [true — GA4 connected / false — manual only]
Primary motion:    [PLG / hybrid / sales-led]
North-star phase:  [pick from stage table below]
Review cadence:    [weekly — default Friday 30 min]
Owner:             [founder name]
```

---

## Stage → north-star picker

| Stage | Default north-star | Window |
|-------|-------------------|--------|
| Pre-launch (<100 users) | Qualified signups or founder calls booked | weekly |
| Launch week | Activations or PH/demo conversions | daily |
| Early growth | Activated trials/week or SQLs | weekly |
| Scaling | Revenue or retention (D30) | weekly + monthly |

**Selected north-star:**
```
Metric:     [e.g. activated_trials_per_week]
Definition: [exact formula — e.g. signup → core action within 7 days, ICP-matched]
Target:     [number]
Floor:      [number below which you change strategy]
Data source: [GA4 event / CRM / manual log]
```

---

## KPI tree (fill top-down)

```
                    [NORTH STAR: _______________]
                              |
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   [Leading KPI 1]      [Leading KPI 2]      [Leading KPI 3]
        │                     │                     │
   [Input metric]        [Input metric]        [Input metric]
```

### Level 1 — North-star (1 only)

| KPI | Definition | Target | Source | Owner |
|-----|------------|--------|--------|-------|
| | | | | |

### Level 2 — Leading indicators (max 3)

| KPI | Definition | Healthy band | Drives north-star how? | Source |
|-----|------------|--------------|------------------------|--------|
| | | | | |
| | | | | |
| | | | | |

### Level 3 — Input metrics (diagnostic, max 5 total)

| KPI | Definition | Notes | Source |
|-----|------------|-------|--------|
| | | | |
| | | | |

---

## Funnel mapping (routes → stages)

| Funnel stage | Route / action | Event name (if tracked) | Current baseline |
|--------------|----------------|-------------------------|------------------|
| Visit | `/` | `page_view` (auto) | |
| Intent | `/pricing`, waitlist | `pricing_page_viewed` | |
| Signup | `/signup` complete | `signup_completed` | |
| Activation | [core workflow] | `activation_[verb]` | |
| Revenue | payment / demo booked | `trial_converted` / `demo_requested` | |

**Missing route = measurement gap:** _______________________________

---

## Channel breakdown (required for north-star)

| Channel | Signups/trials | Activation rate | Notes |
|---------|----------------|-----------------|-------|
| Product Hunt | | | |
| Email | | | |
| LinkedIn organic | | | |
| Outbound | | | |
| Paid | | | |
| Organic/direct | | | |

---

## Manual logging schema (when hasAnalytics = false)

Daily 5-min log:

| Date | Visitors | Signups | Activations | Outreach replies | Ad spend | Notes |
|------|----------|---------|-------------|------------------|----------|-------|
| | | | | | | |

**Migration note:** When GA4 connects, map manual rows → events in `event-taxonomy.md`.

---

## Example (B2B SaaS PLG — filled)

**North-star:** Activated trials/week (trial → connected Stripe + 1 reconciliation in 7 days)

| Level | KPI | Target | Band |
|-------|-----|--------|------|
| L1 | Activated trials/week | 12 | 8–15 healthy |
| L2 | Trial starts/week | 25 | |
| L2 | Trial → activation (7d) | 48% | 40–55% |
| L2 | Visitor → trial (LP) | 6% | 4–8% |
| L3 | Pricing page → trial | 18% | diagnostic |
| L3 | LinkedIn traffic share | 30% | channel mix |

---

## Bad vs good

| Bad KPI | Good KPI |
|---------|----------|
| "Website traffic" (no decision) | "ICP-matched signups from outbound" |
| 15 metrics tracked | 1 north-star + 3 leading + ≤5 inputs |
| "Growth" | "Activated trials/week with Stripe connected" |
| No data source | Every KPI has GA4 event or manual column |
| Same north-star at 10 users and 10k | Stage-appropriate north-star |

---

## Reject the KPI tree if:

- >1 north-star at same level
- Any KPI lacks numeric target or healthy band
- Leading indicators don't logically connect to north-star
- Vanity metrics included (raw followers, impressions without conversion path)
- hasAnalytics false but no manual logging schema

---

## Decision triggers

| Signal | Threshold | Action |
|--------|-----------|--------|
| North-star below floor 2 weeks | [floor] | Change channel mix or positioning — not micro-optimize |
| One channel 0 activation | 2 weeks | Pause channel, fix or kill |
| Activation drops but signups flat | >10pp drop | Onboarding/product issue — not marketing |
| Manual log gaps | >2 days/week | Fix logging before any optimization |
