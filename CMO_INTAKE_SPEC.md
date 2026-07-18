# CMO Intake + Channel Thesis — P0 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P0  
**Status:** Implemented in `desktop/src/shared/cmoIntake.ts`  
**Goal:** Replace “generic 30-day plan first” with a **one-page CMO verdict + channel thesis** before planning.

---

## Problem

Users open a finished project and do not know **which growth game** to play (viral short-form vs SEO vs PH vs outbound). A default hero-CTA + launch plan treats every product the same. A world-class CMO picks **one primary channel thesis** in intake.

---

## Inputs

| Signal | Source |
|--------|--------|
| Repo scan | `ProjectProfile` — framework, routes, monorepo, analytics, readme |
| Persona | `settings.persona` — marketing vs sales |
| Profile memory | `MarketingProfile` — stage, users, email list, launch date, pipeline |
| Founder/product class | Heuristics on readme + productType + routes |
| Activation / first value (P15) | Activation event, signups, activated users, target rate, TTFV, onboarding path |

No LLM required for P0 (deterministic, testable). LLM enrichment is P0.5 optional.

P15 adds a second deterministic gate after the founder decision and budget boundary. If measured
activation, founder scale readiness, or repo onboarding gaps make product the binding constraint,
`beginCmoWeek1` creates Lane D P0 PRODUCT REQUESTs instead of distribution tactics. See
[`CMO_PRODUCT_LOOP_SPEC.md`](CMO_PRODUCT_LOOP_SPEC.md).

---

## Outputs — `ChannelThesis`

| Field | Purpose |
|-------|---------|
| `id` | Thesis slug (`viral_short_form`, `founder_social`, …) |
| `headline` | One sentence the user remembers |
| `verdict` | `marketable` \| `needs_work` \| `not_ready` |
| `verdict_reason` | Why |
| `primary_bottleneck` | `GtmBottleneck` |
| `rationale` | 2–4 bullets — why this thesis, not SEO-by-default |
| `week1_priorities` | Max 3 ops tasks: what / why / owner / done_when |
| `lane_a` / `lane_b` / `deprioritize` | Execution lanes |
| `primary_playbook_ids` | Plan Studio alignment |
| `signals` | Detected facts (audit trail) |

Stored on `MarketingProfile.channel_thesis`.

---

## Thesis catalog (P0)

| ID | When | Not now |
|----|------|---------|
| `viral_short_form` | Consumer/viral B2C, prelaunch, founder-story potential | SEO-first |
| `founder_social` | B2B/devtools, awareness gap | Viral volume |
| `product_hunt_launch` | Launch ≤21d or explicit launch goal | Long SEO cycle |
| `landing_conversion` | Landing exists, conversion bottleneck or post-launch optimize | PH-first |
| `seo_content` | Blog route + growing stage | Short-form volume |
| `outbound_sales` | Sales persona, empty pipeline | Brand campaigns |
| `community_launch` | DevTools / OSS signals | Paid ads first |
| `influencer_partnerships` | Consumer + proof gap + awareness | Cold outbound |

**Calibration:** Cluely-like signals → `viral_short_form`, not `landing_conversion` alone.

---

## UX flow

```
openProject → scan → runCmoIntake() → channel_thesis on profile
    → ProjectReveal "Thesis" beat (verdict + headline + week1)
    → Primary CTA: "Start Week 1" (beginCmoWeek1)
    → Secondary: "Full launch plan", "Review hero & ship"
```

Home dashboard shows `CmoIntakeCard` when thesis exists and no active plan.

---

## `beginCmoWeek1`

1. Ensure `CampaignSession` exists — phase `executing`, goal = thesis headline  
2. First `week1_priorities[0]` with `owner: system` → repo run (hero ship if landing thesis)  
3. `owner: user` → workspace handoff with prepared checklist (Lane B)  
4. Persist milestone on campaign session  

---

## API / persistence

- Client: `buildCmoIntake()` after scan; `updateMarketingProfile({ channel_thesis })`  
- Server: `marketingProfileSchema.channel_thesis` for sync  
- Tests: Cluely-like, B2B SaaS, sales outbound, not_ready URL stub  

---

## P0.5 / P2 follow-ups

- P0.5: optional LLM intake refinement via browser audit
- P2: proof loop ties ops close to KPI measurement  
- Plan generation weighted by `primary_playbook_ids`  

## P13 — draft thesis → founder-sealed strategy

P0 remains the deterministic scan baseline. P13 adds the human decision before operations:

1. `buildCmoIntake({ draft: true })` creates the repo-derived draft thesis.
2. Seven founder-fit answers constrain thesis eligibility.
3. `GrowthNarrative` creates the cultural tension, one-liner, and proof angle.
4. A/B/C options expose tradeoffs, honest 30-day targets, and the CMO/founder contract.
5. One Yes seals the selected option and `buildFinalChannelThesis()` creates the operational thesis.
6. `beginCmoWeek1()` is blocked until the decision is sealed.

Canonical P13 detail: [`CMO_FOUNDER_FIT_SPEC.md`](CMO_FOUNDER_FIT_SPEC.md).

---

## Feature gate (§12 checklist)

1. Right growth thesis per product class — **yes, heuristic engine**  
2. Reduces “what do I do today?” — **week1_priorities**  
3. Lane A/B explicit — **yes**  
4. Metric in 7 days — **done_when on priorities** (proof loop P2)  
5. CMO would do this — **intake before plan**  
