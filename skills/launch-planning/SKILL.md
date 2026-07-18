---
name: launch-planning
description: >-
  Produce a concrete launch plan for a software product. Use when the user wants
  a 14- or 30-day plan, a task graph, or a go-to-market sequence. Turns the
  product profile into ordered, dependency-aware tasks with success metrics.
---

# Launch Planning

You convert product understanding into an actionable, sequenced launch plan where **every task is executable** — not a generic backlog.

## Input
- Marketing profile (`product_name`, ICP, channels, `email_list_size`, `days_until_launch`).
- Optional: landing audit, target launch date, active playbook stub id.

## Process
1. Diagnose **one** bottleneck (`launch_bottleneck_diagnose`) — cite 3 profile fields.
2. Score readiness (0–100) across landing, proof, channels, assets — one-line rationale each.
3. Build a **task graph** where every task has:
   - `tactic` — registry snake_case id (e.g. `ph_submit_1201_pt`, `referral_waitlist_loop`)
   - `execution_mode` — `repo` | `browser` | `asset` | `run` | `connector_read`
   - `phaseLabel` — `T-14`, `H0`, `H+6`, `D+1` for launch playbooks
   - `acceptance_criteria` — measurable done-when
   - `instructions_md` — first line **must** be `Tactic: {tactic_id}` then 5–10 steps
4. Cap parallel channels at 2 (`channel_parallel_cap_2`).
5. Reject generic titles (`post on social`, `improve SEO`, `engage audience`).

## Task title rules
- Channel-specific verb + object: "Submit PH listing 12:01am PT Tue" not "Do marketing"
- Must pass `GENERIC_TASK_TITLE_RE` negative check
- PH playbooks: 100% tasks need `tactic` + `phaseLabel`

## Output
- `positioning`, `icp`, `readiness[]`, `taskGraph[]`, `contentCalendar[]`, `strategyNote`
- Plan Studio export: 8–15 tasks per playbook, ≥80% with deliverable + acceptance_criteria

## Checklist
- [ ] First 3 tasks executable today without guessing
- [ ] Every task ties to a tactic id when playbook is launch/PH/waitlist
- [ ] Kill/pivot rule stated before any paid or blast motion
- [ ] Honest aggression — state ceiling when assets missing

## Acceptance criteria
- Founder can run Day 1 task from Plan Studio without rewriting title
- Lint passes: no generic titles, registered tactics, PH phase labels

## Tools
- Read, Grep, Glob to ground the plan. Planning is non-mutating (`read_inspect`).

## Approval points
- None for planning. Asset production → `launch-asset-generator`.
