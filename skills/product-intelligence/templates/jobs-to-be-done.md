# Jobs-to-be-Done — Fill-In Template

Map what buyers hire your product to do — tied to routes and workflows in the codebase, not marketing feature bullets.

---

## JTBD format

```
When [situation / trigger],
I want to [motivation / action],
so I can [expected outcome],
instead of [current workaround / pain].
```

Each job needs: **priority** (P1–P3), **route/workflow evidence**, **frequency** (daily/weekly/event).

---

## Job inventory (fill 3–5)

### Job 1 — P1 (core activation job)

```
When:   _________________________________________________
I want to: _____________________________________________
So I can: ______________________________________________
Instead of: ____________________________________________

Route/workflow evidence: [e.g. /onboarding/connect-stripe → /dashboard/reconcile]
Frequency: [daily / weekly / per close cycle / per launch]
Success metric: [time saved, error rate, $ impact]
Status: [verified in product / landing-only / needs_validation]
```

### Job 2 — P1 or P2

```
When:   
I want to: 
So I can: 
Instead of: 

Route/workflow evidence: 
Frequency: 
Success metric: 
Status: 
```

### Job 3

*(repeat structure)*

### Job 4 (optional)

*(repeat structure)*

### Job 5 (optional)

*(repeat structure)*

---

## Job → feature mapping (anti-feature-list)

| Job | Product capability (verb) | Route | NOT a job (reject) |
|-----|---------------------------|-------|------------------|
| Close books faster | Auto-match transactions | `/reconcile` | "AI-powered dashboard" |
| | | | "Real-time analytics" |
| | | | "User-friendly interface" |

---

## Example (B2B compliance tool)

**Job 1 — P1**
```
When:   Our SOC 2 audit is in 8 weeks and evidence is scattered across Drive + Jira
I want to: Collect and map controls to evidence automatically
So I can: Pass audit without pulling 2 engineers off roadmap for 6 weeks
Instead of: Manual spreadsheet tracker updated by whoever remembers

Route: /controls → /evidence/upload → /audit/export
Frequency: Event (audit cycle) + weekly refresh
Metric: Evidence collection hours (40 → 4)
Evidence: README setup step 3, app/audit/page.tsx
```

---

## Prioritization rules

- **P1:** Without this job, product has no reason to exist. Maps to activation event.
- **P2:** Strong retention job; user returns weekly/monthly for this.
- **P3:** Nice-to-have; don't lead GTM copy with P3 jobs.

If you have >2 P1 jobs, narrow ICP — you're describing two products.

---

## Bad vs good

| Bad job | Why bad | Good rewrite |
|---------|---------|--------------|
| "Manage my business better" | No situation, no outcome | "When board asks for runway, I want updated burn in 5 min…" |
| "Use AI features" | Feature, not job | "When support volume spikes, I want to draft replies from our docs…" |
| "Sign up for the product" | Onboarding step, not job | Delete — not a JTBD |
| No route evidence | Unverified | Add path or mark `landing-only` |

---

## Handoff to downstream skills

| Skill | Uses JTBD for |
|-------|---------------|
| `lead-research` | Pain keywords in LinkedIn search |
| `outreach-drafting` | Touch 1 problem line |
| `launch-asset-generator` | Tweet 2–3 workflow demo narrative |
| `analytics-measurement` | `activation_[job_verb]` event naming |

---

## Reject the JTBD set if:

- Any job lacks "instead of" (current workaround)
- >50% jobs marked `needs_validation` with no validation plan
- Jobs are feature names ("reporting", "analytics", "AI")
- P1 job doesn't map to a post-signup workflow
