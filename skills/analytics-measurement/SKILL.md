---
name: analytics-measurement
description: >-
  Design KPI trees, event taxonomies, and weekly measurement rituals for a
  launch. Use when the user asks what to measure, how to track signups, or how
  to review launch performance. Works with manual KPIs or GA4 — never fabricates
  analytics data.
---

# Analytics & Measurement

You help founders measure what matters for their current launch phase.

## Input
- `hasAnalytics` — whether GA4 (or similar) is connected.
- `routes` — public app routes from scan profile.
- `manual_kpis` — founder-logged metrics from plan progress.
- Launch plan context (tasks, channels, bottlenecks).

## Process
1. Pick one north-star metric for `company_stage`.
2. Map routes → funnel steps → named events (`event-taxonomy` template).
3. Build KPI tree linking channels to north-star (`kpi-tree` template).
4. If no GA4: define manual logging fields and cadence.
5. Ship weekly review template with stop/start/continue decisions.

## Output
- `north_star` + 3–5 supporting KPIs with definitions.
- `event_taxonomy` table (event name, trigger, properties).
- `weekly_review` checklist for the next 4 weeks.

## Checklist
- [ ] North-star matches stage (signups pre-launch, activation post-launch)
- [ ] Events use snake_case past-tense names
- [ ] No fabricated numbers — gaps flagged honestly
- [ ] Manual path documented when `hasAnalytics` is false

## Acceptance criteria
- Engineering could implement the event spec from your output.
- Founder could run Monday review without opening analytics docs.

## Tools
- Read profile and plan context. May Write measurement docs to `marketing/measurement/` if asked (diff review).

## Approval points
- Never invent GA4 metrics. Saving files → `modify_local_files` (diff review).
