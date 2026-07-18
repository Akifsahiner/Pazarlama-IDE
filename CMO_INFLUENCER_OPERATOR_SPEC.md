# CMO Influencer Operator (P9)

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P9  
**Depends on:** P7 Growth Control Plane, P1 Ops Cadence, P3 Lane B, P2 Proof Loop, P5 Delegate

## Problem

P7 answers **Darboğaz / Bugün / Done when** but influencer execution for `influencer_partnerships` still lacked:

| Gap | P9 fix |
|-----|--------|
| Pipeline | Structured research → pitched → replied → brief → live → reporting |
| Pitch grid | A/B/C pitch variants with deterministic scaffolds |
| Volume | Weekly DM min/max targets + today counter |
| Deal tracking | UTM + promo code per creator; disclosure ack on brief |
| Double-down | Pitch-level scale/kill + week double_down when pattern wins |

**Principle:** Deterministic engine + auditable evidence. Missing reply proof → honest errors; never fabricate signup counts.

**P13 narrative inheritance:** Pitch scaffolds begin with the sealed
`growth_narrative.one_liner`, so creator outreach and owned distribution tell the same story.

## Scope gate

Operator is created and UI shown when **all** of:

1. `channel_thesis.id === influencer_partnerships`
2. Active `ops_cadence` exists (Week 1+ executing)
3. `growth_control_plane.binding.gtm ∈ { awareness, distribution }` **OR** binding unset

When gate is false (e.g. binding = conversion), panel hidden — strip/ops unchanged.

## Data model

Persisted on `MarketingProfile.influencer_operator` + localStorage `influencer_operator.v1`.

Engine: `desktop/src/shared/cmoInfluencerOperator.ts`  
Types: `desktop/src/shared/types.ts`  
Server Zod: `server/src/schemas/marketingProfile.ts` → `influencerOperatorSchema`

Key types: `InfluencerOperatorWorkspace`, `InfluencerPitch`, `InfluencerTouch`, `InfluencerTouchProof`, `InfluencerDeal`, `WeeklyOutreachTarget`, `InfluencerVerdict`.

## Mode: `micro_influencer_dm`

- Pitches A/B/C: `micro_cold`, `warm_intro`, `podcast_newsletter`
- 15 touches across 7 days with weekly DM targets (D1–2=2, D3–5=3, D6–7=4)
- Primary KPI: `influencer_replies` (warm/hot reply rollup)
- Secondary: `influencer_referral_signups`, `influencer_pitch_reply_rate`, `influencer_cpa_qualified_signup`

## Pipeline stages

| Stage | Proof required |
|-------|----------------|
| `research` → `pitched` | Handle + platform + ICP fit |
| `pitched` → `replied` | Thread URL + reply received + interest level |
| `replied` → `brief_sent` | Deal structure + UTM + **disclosure_ack** |
| `brief_sent` → `live` | Live post URL |
| `live` → `reporting` | Clicks/signups (optional spend for CPA) |

Honest error example: *"Log warm or hot reply interest — this pitch test closes on replies, not send volume."*

## UTM rules

`generateCreatorUtm(handle, productUrl?)` produces stable slug:

- `utm_campaign`: `inf_{slug}` from handle
- `promo_code`: uppercase slug fragment
- `utm_link`: product URL + UTM params when URL provided

## Verdict rules (deterministic)

| Rule | Condition | Verdict |
|------|-----------|---------|
| **Scale** | Same pitch: ≥2 warm/hot replies | `scale` |
| **Kill** | Same pitch: ≥5 pitched, zero replies | `kill` |
| **Double down** | Scale + week KPI ≥50% of target | `double_down` — elevated volume + winning pitch variants |
| **Test more** | <2 warm replies on any pitch | `test_more` |

## Core functions

| Function | Purpose |
|----------|---------|
| `createInfluencerOperatorFromThesis` | Build workspace from thesis (+ double_down opts) |
| `resolveWeeklyOutreachTarget` | Today min/max/done/remaining DMs |
| `validateInfluencerProof` | Proof validation by pipeline stage |
| `completeInfluencerTouch` | Apply proof/deal, advance stage |
| `evaluatePitchPerformance` | Scale/kill/double_down verdict |
| `getNextInfluencerTouch` | Next pending touch for today |
| `syncLaneBFromInfluencerOperator` | Lane B calendar from operator touches |
| `importCreatorsFromDelegateProof` | VA brief → research touches |
| `rollupInfluencerKpis` | Replies → `influencer_replies`, signups → referral rollup |
| `isInfluencerOperatorGate` | Scope gate check |
| `influencerOutreachSummary` | Strip one-liner: `2/3 DMs · Pitch B pending` |
| `generateCreatorUtm` | Per-creator UTM + promo code |
| `influencerOutreachToCsv` | Extended outreach CSV export |

## UI

- **`InfluencerOperatorPanel`** (`data-testid="influencer-operator-panel"`) — pipeline board, volume header, verdict, pitch scaffolds, CSV export
- **`InfluencerProofModal`** (`data-testid="influencer-proof-modal"`) — stage-aware proof
- **`InfluencerDealModal`** (`data-testid="influencer-deal-modal"`) — deal + UTM + disclosure
- **P12 `GrowthCommandSurface`** — outreach chip + deterministic why; Start move → proof/deal modal
- **`InfluencerVerdictCard`** — scale/double_down when pivot suppressed
- Placement: above Lane B in Workspace/Home; Lane B hidden when operator active (synced note in panel)

## Store wiring

| Trigger | Action |
|---------|--------|
| `beginCmoWeek1()` | Create operator if gate → sync Lane B |
| `startNextCmoCycle({ mode: "double_down" })` | Recreate with elevated volume + winning pitch |
| `completeInfluencerTouch()` | Validate → verdict → KPI rollup → recompute growth plane |
| `completeDelegateBrief()` | Import creators from VA proof note |
| `loadMarketingProfile()` / `openProject()` | Hydrate `influencer_operator.v1` |

## Integrations

- **P7:** `attachTodayMove` prefers operator next touch for influencer today moves
- **P2:** `buildPivotSuggestion` suppresses pivot when verdict is `scale` or `double_down`; `evaluateWeek1Metrics` reads operator KPI rollup
- **P4:** `archiveCompletedCycle` stores `hook_summary` from operator verdict headline
- **P5:** VA delegate brief imports creators into research pipeline

## KPI presets

| id | Use |
|----|-----|
| `influencer_replies` | Warm/hot reply count this week |
| `influencer_referral_signups` | UTM-attributed signups rollup |
| `influencer_pitch_reply_rate` | Reply rate per pitch variant |
| `influencer_cpa_qualified_signup` | Spend / qualified signup (optional) |

## Feature gate (§12 checklist)

1. Right growth thesis? — Only `influencer_partnerships`; gated by P7 binding  
2. Reduces “what today?” — Outreach counter + next creator/pitch in strip  
3. Lane B/C? — Human DMs + deal close; **no auto-send**  
4. Metric in 7 days? — Reply proof + UTM signup rollup  
5. World-class CMO? — Pipeline stages + scale/kill from skill playbook  

## Out of scope (P11+)

- Auto-DM / Instagram/TikTok/LinkedIn platform APIs  
- LLM pitch personalization at runtime  
- Full CRM sync (HubSpot, Airtable bi-directional)  
- Creator payment / contract e-sign  
- Podcast booking automation  
- Paid ads creative grid (separate thesis path)  

**P10 (Delegation Operator)** — see [`CMO_DELEGATE_OPERATOR_SPEC.md`](CMO_DELEGATE_OPERATOR_SPEC.md)  

## Tests

`desktop/src/shared/cmoInfluencerOperator.test.ts` — 16 deterministic scenarios (gate, volume, scale, kill, double_down, proof, UTM, rollup, sync, next touch, delegate import).
