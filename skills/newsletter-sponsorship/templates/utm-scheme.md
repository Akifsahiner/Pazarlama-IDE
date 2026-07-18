# Template: UTM campaign scheme

Lock **before** booking any slot. One scheme per sprint; extend per newsletter.

## Naming convention

| Param | Pattern | Example |
|-------|---------|---------|
| `utm_source` | newsletter slug (lowercase, hyphenated) | `react-status` |
| `utm_medium` | fixed | `newsletter_sponsor` |
| `utm_campaign` | `nl_sprint_YYYYMM` or `nl_[product]_YYYYMM` | `nl_sprint_202607` |
| `utm_content` | hook variant or issue date | `hook_a` / `hook_b` / `issue_2026-07-15` |

## Full URL template

```
{{landing_base_url}}?utm_source={{newsletter_slug}}&utm_medium=newsletter_sponsor&utm_campaign={{campaign_name}}&utm_content={{hook_variant}}
```

## Example URLs (copy-paste)

**React Status — Hook A (July sprint)**
```
https://app.example.com/signup?utm_source=react-status&utm_medium=newsletter_sponsor&utm_campaign=nl_sprint_202607&utm_content=hook_a
```

**Bytes — Hook B**
```
https://app.example.com/signup?utm_source=bytes&utm_medium=newsletter_sponsor&utm_campaign=nl_sprint_202607&utm_content=hook_b
```

**JS Weekly — single hook**
```
https://app.example.com/signup?utm_source=js-weekly&utm_medium=newsletter_sponsor&utm_campaign=nl_sprint_202607&utm_content=primary
```

## Analytics mapping

| Event | Trigger | Dimension |
|-------|---------|-----------|
| `page_view_sponsor` | LP load with UTMs | `utm_source`, `utm_content` |
| `signup_complete` | Account created | inherit UTMs from first touch |
| `trial_start` | Paid trial or core activation | inherit UTMs |

## Collision rules

- **Do not** reuse `utm_campaign` for Product Hunt, HN, or paid search same month
- **Do not** change `utm_content` mid-flight on a live issue
- **Do** create new `utm_campaign` each sprint (`nl_sprint_202608`)

## Kill rule inputs (pre-write)

| Metric | Floor / ceiling |
|--------|-----------------|
| Min CTR (7d) | 0.8% target; kill rebook if <0.5% twice |
| Max CPA signup (7d) | ${{max_cpa}} — default $300 B2B dev SaaS |
| Min clicks before kill | 200 |

## Teardown query hints

- GA4: Acquisition → Traffic acquisition → Session campaign + source/medium
- PostHog: Funnel from `utm_source` contains newsletter slug → `signup_complete`
- Compare `hook_a` vs `hook_b` on **same newsletter family** only when publisher allows repeat
