# CMO Distribution Operator (P8)

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P8  
**Depends on:** P7 Growth Control Plane, P1 Ops Cadence, P3 Lane B, P2 Proof Loop

## Problem

P7 answers **Darboğaz / Bugün / Done when** but distribution execution for `viral_short_form` and `founder_social` still lacked:

| Gap | P8 fix |
|-----|--------|
| Volume | Daily min/max targets + today counter |
| Hook grid | Structured hook × day grid with formula + retention targets |
| Proof | Retention-first (3s %, completion, 24h views) — not vibes |
| Double-down | Hook-level scale/kill + week double_down when pattern wins |

**Principle:** Deterministic engine + auditable evidence. Missing retention → honest errors; never fabricate view counts.

**P13 narrative inheritance:** Hook `script_hint` values are seeded with the sealed
`growth_narrative.one_liner`; retention still decides scale/kill.

## Scope gate

Operator is created and UI shown when **all** of:

1. `channel_thesis.id ∈ { viral_short_form, founder_social }`
2. Active `ops_cadence` exists (Week 1+ executing)
3. `growth_control_plane.binding.gtm ∈ { awareness, distribution }` **OR** binding unset (distribution theses default open)

When gate is false (e.g. binding = conversion), panel hidden — strip/ops unchanged.

## Data model

Persisted on `MarketingProfile.distribution_operator` + localStorage `distribution_operator.v1`.

Engine: `desktop/src/shared/cmoDistributionOperator.ts`  
Types: `desktop/src/shared/types.ts`  
Server Zod: `server/src/schemas/marketingProfile.ts` → `distributionOperatorSchema`

Key types: `DistributionOperatorWorkspace`, `DistributionHook`, `DistributionSlot`, `DistributionSlotProof`, `DailyVolumeTarget`, `DistributionVerdict`.

## Modes

### `short_form_volume` (`viral_short_form`)

- Hooks A/B/C: `negative_outcome`, `contrarian`, `demo_first`
- Daily targets D1–7: min 3, max 5 (ramps D1–2=3, D3–5=4, D6–7=5)
- 7-day hook rotation grid + daily 30m engage slot
- Primary KPI: `short_form_views` (rollup from 24h views)

### `founder_grid` (`founder_social`)

- 14-day grid, 3 posts/week on D1/D3/D5; engage D2/D4/D6; measure D7
- Primary KPI: `linkedin_impressions` + reply notes
- Platforms: LinkedIn primary; optional X flagged in UI

## Proof contract

| Mode | Required on `post` | Required on `measure` |
|------|-------------------|----------------------|
| short_form_volume | `post_url` | `retention_3s_pct` + `views_24h` |
| founder_grid | `post_url` | `impressions` or `replies` + note |

Honest error example: *"Log 3-second retention % — this hook test closes on retention, not vibes."*

## Verdict rules (deterministic)

| Rule | Condition | Verdict |
|------|-----------|---------|
| **Scale** | Same hook: ≥2 measured slots with `retention_3s_pct ≥ target` | `scale` |
| **Kill** | Same hook: ≥3 posts, all `retention_3s_pct < 45` | `kill` |
| **Double down** | Scale + week KPI ≥50% of target | `double_down` — elevated volume + winning formula variants |
| **Test more** | <3 measured hooks | `test_more` |

Founder mode uses impression/reply proxies with lower thresholds.

## Core functions

| Function | Purpose |
|----------|---------|
| `createDistributionOperatorFromThesis` | Build workspace from thesis (+ double_down opts) |
| `resolveDailyVolumeTarget` | Today min/max/done/remaining |
| `validateDistributionProof` | Proof validation by slot kind + mode |
| `completeDistributionSlot` | Apply proof, advance slot status |
| `evaluateHookPerformance` | Scale/kill/double_down verdict |
| `getNextDistributionSlot` | Next pending post for today |
| `syncLaneBFromOperator` | Lane B calendar from operator slots |
| `rollupOperatorKpis` | Sum views → `short_form_views`, best retention → `hook_retention_3s_pct` |
| `isDistributionOperatorGate` | Scope gate check |
| `distributionVolumeSummary` | Strip one-liner: `2/4 posts · Hook B pending` |

## UI

- **`DistributionOperatorPanel`** (`data-testid="distribution-operator-panel"`) — hook grid, volume header, verdict, script scaffolds
- **`DistributionProofModal`** — retention/views proof
- **P12 `GrowthCommandSurface`** — volume chip + deterministic why; Start move → proof modal
- **`DistributionVerdictCard`** — scale/double_down when pivot suppressed
- Placement: above Lane B in Workspace/Home; Lane B hidden when operator active (synced note in panel)

## Store wiring

| Trigger | Action |
|---------|--------|
| `beginCmoWeek1()` | Create operator if gate → sync Lane B |
| `startNextCmoCycle({ mode: "double_down" })` | Recreate with elevated volume + winning hook |
| `completeDistributionSlot()` | Validate → verdict → KPI rollup → recompute growth plane |
| `loadMarketingProfile()` / `openProject()` | Hydrate `distribution_operator.v1` |

## Integrations

- **P7:** `attachTodayMove` prefers operator next slot for distribution today moves
- **P2:** `buildPivotSuggestion` suppresses pivot when verdict is `scale` or `double_down`; `evaluateWeek1Metrics` reads operator KPI rollup
- **P4:** `archiveCompletedCycle` stores `hook_summary` from operator verdict

## KPI presets

| id | Use |
|----|-----|
| `hook_retention_3s_pct` | Best hook 3s retention this week |
| `hook_completion_pct` | Best completion (optional) |
| `short_form_views` | Primary viral rollup |
| `social_posts` | Post count; target bumps on double_down |

## Feature checklist (§12)

1. Right growth thesis? — Only viral/founder; gated by P7 binding  
2. Reduces “what today?” — Volume counter + next hook in strip  
3. Lane B? — Human posts + retention proof; no auto-post  
4. Metric in 7 days? — Per-hook retention + rollup views/impressions  
5. World-class CMO? — Scale/kill from skill playbook; double-down not blind pivot  

## Out of scope (P10+)

- Auto-post / platform APIs  
- LLM script generation at runtime  
- Paid ads creative grid  
- Auto thesis pivot (explicit double_down only)

**P9 (Influencer Operator)** — see [`CMO_INFLUENCER_OPERATOR_SPEC.md`](CMO_INFLUENCER_OPERATOR_SPEC.md)

## Tests

`desktop/src/shared/cmoDistributionOperator.test.ts` — 12 deterministic scenarios (gate, volume, scale, kill, double_down, proof, rollup, sync, next slot).
