# Event Taxonomy — Fill-In Template

Name events **before** wiring GA4. Convention: `snake_case`, past tense, one action per event. Engineering implements from this doc — marketing owns naming.

---

## Taxonomy rules

```
Format:        object_action or action_object (pick one style — be consistent)
Tense:         past tense (signup_completed, not signup_complete)
Case:          snake_case only
One event =    one user action (not funnels crammed into one name)
Properties:    camelCase in GA4 user properties, snake_case in event params
```

**Style chosen for this product:** `[object_action / action_object]`

---

## Product context

```
Product:        [name]
Key routes:     [list from product profile]
Activation def: [specific action = activated user]
CRM sync:       [HubSpot / Pipedrive / none]
hasAnalytics:   [true/false]
```

---

## Core events (required set)

| Event name | Fires when | Route / trigger | Properties | Priority |
|------------|------------|-----------------|------------|----------|
| `signup_completed` | Account created | `/signup` success | `method`, `utm_source`, `utm_campaign` | P0 |
| `activation_[core_verb]` | First core value action | e.g. `/projects/create` | `time_since_signup_sec` | P0 |
| `pricing_page_viewed` | Pricing page load | `/pricing` | `referrer` | P1 |
| `demo_requested` | Demo form submit | `/demo` or Calendly redirect | `company_size`, `role` | P1 |
| `integration_connected` | OAuth success | `/integrations/[name]` | `integration_name` | P1 |
| `trial_started` | Trial clock begins | billing flow | `plan_tier` | P0/P1 |
| `subscription_started` | First payment | checkout success | `plan_tier`, `mrr` | P0 |

**Fill `[core_verb]` from JTBD:** e.g. `activation_reconciliation_completed`, `activation_project_created`

---

## Marketing / acquisition events

| Event name | Fires when | Properties |
|------------|------------|------------|
| `outreach_link_clicked` | UTM outreach link hit | `touch_number`, `channel` |
| `launch_asset_clicked` | UTM launch campaign hit | `asset_type` (ph, twitter, email) |
| `waitlist_joined` | Waitlist form submit | `source` |

---

## Engagement events (optional — max 5)

| Event name | Fires when | Why track |
|------------|------------|-----------|
| | | |
| | | |

---

## User properties (set once or update)

| Property | Type | Set when | Example values |
|----------|------|----------|----------------|
| `icp_tier` | string | signup or sales tag | `A`, `B`, `unknown` |
| `acquisition_channel` | string | first touch | `ph`, `linkedin`, `outbound`, `email` |
| `company_stage` | string | onboarding | `seed`, `series_a`, `enterprise` |
| `plan_tier` | string | billing | `free`, `pro`, `team` |

---

## Event → KPI mapping

| KPI (from kpi-tree) | Event(s) used | Calculation |
|---------------------|---------------|-------------|
| Activated trials/week | `trial_started` + `activation_[verb]` | COUNT activation WHERE trial in last 7d |
| Visitor → signup | `page_view` + `signup_completed` | signups / sessions (LP filter) |
| Outbound reply rate | manual + `outreach_link_clicked` | replies / sends (partial auto) |

---

## Naming examples

**Good:**
```
signup_completed
activation_reconciliation_completed
pricing_page_viewed
integration_connected  (property: integration_name=stripe)
demo_requested
```

**Bad — reject:**
```
SignUp                    (wrong case)
user_signed_up_and_onboarded  (two actions)
click                     (too generic)
pageView                  (wrong case/style)
conversion                (meaningless)
```

---

## Implementation checklist for engineering

- [ ] GA4 property ID documented (not in repo — user config)
- [ ] Events fire on success only — not button click before confirm
- [ ] UTM params captured on `signup_completed`
- [ ] `activation_[verb]` fires once per user (dedupe)
- [ ] Test events verified in GA4 DebugView
- [ ] CRM webhook mirrors `demo_requested` and `signup_completed` if CRM exists

---

## Migration from manual logging

| Manual column | Becomes event | Notes |
|---------------|---------------|-------|
| Daily signups | `signup_completed` | Backfill not required |
| Activations | `activation_[verb]` | Start fresh from connect date |
| Outreach replies | stays manual until link tracking | Add UTM first |

---

## Bad vs good

| Bad taxonomy | Good taxonomy |
|--------------|---------------|
| 40 events on day 1 | P0 events first, expand later |
| Inconsistent tense | All past tense |
| `button_click_3` | Named for user outcome |
| No property on signup | utm_source on every acquisition event |
| Marketing names ≠ eng names | Single doc both teams use |

---

## Reject the taxonomy if:

- `activation_[verb]` undefined or matches signup
- Events mix camelCase and snake_case
- No UTM capture plan on acquisition events
- >15 events in v1 (scope creep)
- Event names don't map to KPI tree metrics
