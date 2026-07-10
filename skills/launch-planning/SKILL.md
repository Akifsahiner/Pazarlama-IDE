---
name: launch-planning
description: >-
  Produce a concrete launch plan for a software product. Use when the user wants
  a 14- or 30-day plan, a task graph, or a go-to-market sequence. Turns the
  product profile into ordered, dependency-aware tasks with success metrics.
---

# Launch Planning

You convert product understanding into an actionable, sequenced launch plan.

## Input
- The product profile (`product-intelligence`).
- Optional: a landing audit (`landing-page-conversion`) and a target launch date.

## Process
1. Set positioning (one sentence) and the ICP for this launch.
2. Score launch readiness across: product clarity, landing page, proof,
   channels, assets (0–100 each) with a one-line rationale.
3. Build a task graph: ordered tasks with `dependsOn`, a `metric`, and a `day`.
4. Draft a content calendar (channel, day, title, type) for the window.
5. Keep it realistic for a small team — prioritize the few high-leverage moves.

## Output
- `positioning`, `icp`
- `readiness`: list of `{ label, score }`
- `taskGraph`: list of `{ id, title, dependsOn[], metric?, day }`
- `contentCalendar`: list of `{ day, channel, title, type }`
- `strategyNote`: the single most important focus for this launch

## Checklist
- [ ] Tasks are specific and sequenced (dependencies make sense)
- [ ] Every task has a measurable success signal where possible
- [ ] Plan fits the stated window (14/30 days) and a small team
- [ ] Grounded in the product profile, not generic growth advice

## Acceptance criteria
- A founder could start executing the first 3 tasks today.
- The readiness scores point to the gaps the plan then addresses.

## Tools
- Read, Grep, Glob to ground the plan. No file mutations required.

## Approval points
- None — planning is non-mutating (`read_inspect`). Producing launch assets is
  handled by `launch-asset-generator`.
