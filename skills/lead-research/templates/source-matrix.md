# Source Matrix — Fill-In Template

Track where every lead came from. Prevents double-counting, measures channel yield, and informs next research sprint.

---

## Research sprint header

```
Product:          [name]
ICP summary:      [one line]
Playbook used:    [no-audience / with-email-list / b2b-saas]
Target count:     [default 20]
Research date:    [YYYY-MM-DD]
Researcher:       [founder / agent]
```

---

## Source definitions

| Source code | Description | Typical yield |
|-------------|-------------|---------------|
| `manual_seed` | Founder-named accounts | High fit, low volume |
| `linkedin_search` | Sales Navigator / search filters | Medium fit, high volume |
| `ph_maker` | PH launch maker in adjacent category | High intent, verify B2B role |
| `ph_hunter` | PH hunter/upvoter on competitor launches | Medium intent |
| `competitor_customer` | Case study / G2 review mining | High fit, proven budget |
| `competitor_engagement` | Commented on competitor pain post | High timing signal |
| `job_change` | New role in last 90 days | Highest reply rate |
| `list_derived` | Lookalike from email subscriber | High conversion |
| `community` | Slack, Discord, forum, GitHub | Variable fit |

---

## Lead registry

| # | Name | Company (domain) | Source | Source URL | Tier | Dedupe notes |
|---|------|------------------|--------|------------|------|--------------|
| 1 | | | | | A/B/C | |
| 2 | | | | | | |
| … | | | | | | |
| 20 | | | | | | |

**Dedupe rule:** One person per row. Same company with 2 contacts = 2 rows, note `same_co: [domain]` in dedupe column.

---

## Source yield summary

| Source | Leads found | A-tier | B-tier | C-tier | A-rate |
|--------|-------------|--------|--------|--------|--------|
| manual_seed | | | | | |
| linkedin_search | | | | | |
| ph_maker | | | | | |
| *(add rows per source used)* | | | | | |
| **TOTAL** | | | | | |

---

## Overlap check

| Domain | Appeared in sources | Action taken |
|--------|---------------------|--------------|
| acme.com | linkedin_search + list_derived | Kept list_derived row (warmer) |
| | | |

---

## Exclusion log (important for ICP refinement)

| Name / domain | Reason excluded | Implication for ICP |
|---------------|-----------------|---------------------|
| bigcorp.com | Enterprise, needs SSO you lack | Add "exclude >500 emp until SSO" |
| | | |

---

## Example row

```
#7 | James Wu | RampRight (rampright.io) | job_change | linkedin.com/in/jameswu | A | New VP Ops as of 2026-05-15, prev company was ICP customer of competitor
```

---

## Next sprint recommendations (fill after summary)

Based on yield data:

- **Double down on:** [source with highest A-rate]
- **Pause:** [source with 0 A-tier in >10 leads]
- **New source to try:** [e.g. competitor G2 reviews if not tried]
- **ICP adjustment:** [tighten/expand based on exclusion log]

---

## Bad vs good

| Bad | Good |
|-----|------|
| 20 leads, all `linkedin_search` | ≥2 source types represented |
| Same person from 2 searches, both drafted | Dedupe note, one row |
| No source URL | Every row has verifiable link |
| C-tier mixed into outreach queue | C-tier in registry but flagged excluded |

---

## Reject the matrix if:

- Total leads >20 without user-requested expansion
- Duplicate domains without dedupe notes
- Any lead lacks source code + URL
- A-rate not calculable (missing tier on any row)
