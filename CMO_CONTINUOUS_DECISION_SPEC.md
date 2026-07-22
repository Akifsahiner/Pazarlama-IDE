# CMO Continuous Decision — Product Spec (Faz 7/8/9 Redirect)

**Status:** Canonical — supersedes any roadmap item named Faz 7, Faz 8, or Faz 9 that implies **scheduled review ceremonies** or **periodic report products**.  
**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md)  
**Builds on:** [`CMO_DAY3_PULSE_SPEC.md`](CMO_DAY3_PULSE_SPEC.md), [`CMO_OPS_SPEC.md`](CMO_OPS_SPEC.md), [`CMO_COMMAND_SURFACE_SPEC.md`](CMO_COMMAND_SURFACE_SPEC.md)

---

## 1. Executive decision

**We will not ship:**

| Cancelled phase | What it was going to be | Why it fails the bar |
|-----------------|-------------------------|----------------------|
| **Faz 7** — Weekly Review Ceremony | Day 7 war room, guided 3-field review, “devam mı pivot mu?” modal, CMO voice paragraph | User already decides **intraday**; ceremony creates writer’s block and makes the product valuable **once a week** |
| **Faz 8** — Stakeholder / client report layer | PDF export, “share with client”, polished monthly/quarterly narrative for outsiders | Agency deliverable, not **operator CMO**; optimizes for document aesthetics over **today’s next action** |
| **Faz 9** — Weekly evidence report product | `SessionLaunchReport`, “weekly session report”, evidence rollup as a **primary surface** | Cursor doesn’t email you a weekly “continue this repo?” PDF; neither should we |

**We will ship instead:** one continuous loop — **diagnose → operate today → measure now → adjust when data says so → archive quietly**. No calendar gates. No mandatory essays.

> **Product law:** Fewer features, perfect daily service. Cursor/Claude win by being **right every turn**, not by **more dashboards**.

---

## 2. North star alignment (corrected loop)

Replace ceremony language with continuous language everywhere (specs, copy, command surface priority):

```
INTAKE → THESIS → OPERATE (today)
    → EXECUTE (Lane A/B/C/D)
    → MEASURE (Pulse: Day 1→3→5→7 checkpoints, not a Day 7 gate)
    → ADJUST (kill/scale/pivot when thresholds hit — intraday)
    → ARCHIVE (optional, silent — memory for Week N+1)
    → repeat daily
```

| Old framing | New framing |
|-------------|-------------|
| Weekly review ritual | **Pulse row** + hook verdict + command surface action |
| “Week 7 war room” | **War room on demand** — collapsed by default; open when user wants full week context |
| Monthly client report | **Copy link / export on demand** — never a product milestone |
| Pivot at week close | **Pivot suggestion when `flat` / kill rules fire** — user confirms, not calendar |
| `measuring` phase = write a summary | `measuring` = **ops terminal + KPI logged** → replan preview ready |

---

## 3. The Cursor test (senior product bar)

Before any feature ships, it must pass **all five**:

1. **Daily utility** — Would a founder open this **today** without it being “report day”?
2. **Zero ambiguity** — Does it answer WHAT / WHY / WHO / WHEN / DONE in one glance?
3. **Honest numbers** — No fabricated metrics, no empty “promising” without proof?
4. **Action-bound** — Every insight ends in **one executable next step** (Lane A ship or Lane B prepare)?
5. **Non-blocking** — Never stop shipping/posting because a textarea is empty?

**Fails the bar (do not build):**

- Mandatory review modal before Week 2
- Auto-generated “CMO voice” essay user didn’t ask for
- Monthly/quarterly PDF as a **guided journey step**
- Dashboard whose only job is “summarize what we already showed daily”
- Feature count for investor decks

---

## 4. What we already have (keep & sharpen)

These **are** the product — deepen them, don’t bury them under reports.

| Surface | Role | Sharpening direction |
|---------|------|----------------------|
| **Morning Brief** | Today / Why / Done when | Primary hero — never secondary to a report |
| **Day 3/5/7 Pulse** ([`CMO_DAY3_PULSE_SPEC.md`](CMO_DAY3_PULSE_SPEC.md)) | “İşe yaradı mı?” intraday | Replace week-review as **primary measurement UX** |
| **Hook leaderboard + kill** | Distribution decisions | Real-time; no wait for Day 7 |
| **Command surface CTA** | One next action | Always visible; beats “open review modal” |
| **Growth memory harvest** | Silent archive on cycle close | Background; feeds replan preview — **not** a user-facing essay |
| **Replan preview strip** | Week N+1 delta | User-applied; data-driven — not narrative ceremony |

---

## 5. Refactor map (existing code → continuous model)

Not new features — **de-ceremonialize** what P2–P4 built.

### 5.1 Week review (P2) — demote, don’t delete

**Today:** `CmoWeekReviewModal`, `canCompleteWeekReview`, `command-surface-week-review` can **block** Week N+1.

**Target:**

| Keep | Change |
|------|--------|
| KPI rollup on close (`evaluateWeek1MetricsWithGa4Priority`) | Trigger from **“Close week”** optional control — not banner/modal interrupt |
| `archiveCompletedCycle` + `growth_memory` harvest | Automatic when ops terminal + min logged KPI |
| Pivot suggestion data | Surface in **Pulse + Replan strip** first; modal is optional detail |
| GA4 sync on review open | Move to **Ga4SyncChip** on Record (done in Faz 6) |

**Remove / soften:**

- Empty textarea as **hard gate** for `startNextCmoCycle`
- Command surface priority: `week_review` **below** pulse action and today’s ops task
- Copy: “Write your week summary” → “Week archived — **Start Week 2** when ready”

### 5.2 Session / evidence report (Faz 9–10 legacy) — on-demand export only

**Today:** `SessionLaunchReport`, `buildSessionReportMarkdown` → “Weekly session report”.

**Target:**

- Rename mentally: **Session snapshot export** — user clicks “Copy markdown” / “PDF” when **they** need to share
- **Not** a campaign phase, not a timeline step, not a wow-checklist primary path
- No auto-open after week complete
- No “Weekly” in default title — use `{project} — ops snapshot {date}`

### 5.3 Client / stakeholder layer (Faz 8) — do not build

- No `share-client-report` as a **golden-path** CTA
- No monthly rollup UI in desktop primary nav
- If export exists: same snapshot pipeline as 5.2 — **one code path**, no second “report product”

### 5.4 Campaign phase `measuring`

**Today:** Implies “sit and review.”

**Target:**

- `measuring` = **data sufficient for replan** (ops done + KPI logged)
- UI: Replan preview strip + one button — not a new screen
- Phase label user-facing: “Ready to plan next week” not “Measuring outcomes”

---

## 6. Faz 7/8/9 replacement — single initiative: **Continuous Decision Surface**

One initiative, three slices (not three faz):

### Slice A — Pulse-native decisions (extends Faz 6)

- Pulse **action** field is the pivot/kill/scale CTA (already partially true)
- When hook kill fires → command surface updates **same day**
- When verdict `flat` for 2+ checkpoints → replan preview **surfaces** (no modal)

**Acceptance:**

- [ ] User can answer “işe yaradı mı?” from Record **without** opening week review
- [ ] Kill/scale changes today’s CTA within same session

### Slice B — Silent cycle archive

- When `allOpsTasksTerminal` + min KPI logged → auto `archiveCompletedCycle` + memory harvest
- Optional one-line auto-summary **deterministic template** (max 2 sentences) stored on cycle — **not shown unless user opens History**
- `startNextCmoCycle` never requires free-text input

**Acceptance:**

- [ ] Week 2 startable with zero textarea typing
- [ ] Cycle record contains KPI snapshot + thesis_id + harvested memory

### Slice C — Export on demand (demote Faz 8/9)

- Single `buildOpsSnapshotMarkdown(cadence, profile, pulse, memory)` — reused by copy button
- PDF = print stylesheet of same snapshot — no separate report engine
- Removed from golden path smoke / wow checklist as **primary** journey

**Acceptance:**

- [ ] Export exists; golden path does not require it
- [ ] No “Weekly session report” in default user journey copy

---

## 7. Command surface priority (canonical order)

When multiple governance states compete, resolve in this order:

1. **Product loop pause** (Lane D P0) — if activation binding blocks marketing
2. **Today’s ops task** (user or system) — what / why / done when
3. **Pulse action** (Day ≥3) — measurement-driven next move
4. **Distribution / influencer kill-scale** — operator verdict
5. **Replan preview** — when cycle archived + pivot/double-down ready
6. ~~Week review modal~~ → optional “View week snapshot” in History
7. ~~Session report~~ → Settings / History export only

---

## 8. Copy & UX rules (anti-bloat)

| Never say | Say instead |
|-----------|-------------|
| “Weekly review due” | “Week 1 ops complete — start Week 2 or adjust thesis” |
| “Write what you learned” | “KPI logged — memory saved automatically” |
| “Monthly report ready” | “Copy snapshot” (if user asks) |
| “CMO summary” (essay) | “Pulse: 847/500 views · Hook A leading · Post B today” |
| “War room ceremony” | “War room — full week plan” (on demand) |

Turkish product copy follows same rule: **eylem cümlesi**, not **rapor cümlesi**.

---

## 9. Metrics that matter (for us, not for user dashboards)

We track internally whether **continuous model works** — we do **not** ship these as user-facing charts:

| Signal | Healthy | Unhealthy |
|--------|---------|-----------|
| Days with command-surface dispatch / DAU | High | User only opens app on Day 7 |
| Week review modal open rate | Low optional | Required path every week |
| Time-to-first KPI log after ship | <48h | >7d |
| Pulse row seen (Day 3+) | >80% of active Week-1 users | Hidden behind collapsed card |
| Export click rate | Occasional | Becomes primary “done” action |

---

## 10. Implementation checklist (engineering)

When touching related code, prefer **subtraction**:

- [ ] Lower `week_review` in `resolveCommandSurfaceAction` priority
- [ ] `canCompleteWeekReview` → optional summary; hard requirement = KPI + terminal ops only
- [ ] `SessionLaunchReport` → move under History / overflow; remove timeline prominence
- [ ] Rename “Weekly session report” strings in `sessionReport.ts`
- [ ] Update `PRODUCT_NORTH_STAR.md` §4 table: “weekly review ritual” → “continuous pulse + optional archive”
- [ ] Update `wow-checklist.md`: remove “week review as critical path”; keep export as secondary
- [ ] Eval: assert command surface prefers ops/pulse over `week_review` when both due

**Do not add:**

- New modal screens for Faz 7/8/9
- LLM-generated week/month summaries as default
- Calendar reminders for review
- Client portal / stakeholder login

---

## 11. Relationship to other specs

| Spec | Status after this doc |
|------|------------------------|
| [`CMO_DAY3_PULSE_SPEC.md`](CMO_DAY3_PULSE_SPEC.md) | **Primary** measurement UX — extend, don’t supersede |
| [`CMO_PROOF_LOOP_SPEC.md`](CMO_PROOF_LOOP_SPEC.md) | Keep KPI gates; **relax** review essay gate |
| [`CMO_MEASUREMENT_COMPULSION_SPEC.md`](CMO_MEASUREMENT_COMPULSION_SPEC.md) | Keep baseline + GA4 priority; **move** GA4 pull off review-only |
| [`CMO_CONTINUOUS_SPEC.md`](CMO_CONTINUOUS_SPEC.md) | Keep archive + replan; **decouple** from review modal |
| Faz 7 Weekly Review Ceremony plan | **Cancelled** |
| Faz 8 Client/Stakeholder Report plan | **Cancelled** |
| Faz 9 Weekly Evidence Report plan | **Cancelled** — export-on-demand only |

---

## 12. One paragraph for the team

Marketing IDE wins when a founder opens the app **Tuesday at 10am** and knows exactly what to post, ship, or kill — with honest numbers from yesterday’s hook test. It loses when we ask them to write a weekly essay or read a monthly PDF. Faz 6 Pulse is the measurement product; Faz 7/8/9 as ceremonies are **negative value**. Ship **continuous decision quality**, not **report quantity**. That is the Cursor/Claude bar.
