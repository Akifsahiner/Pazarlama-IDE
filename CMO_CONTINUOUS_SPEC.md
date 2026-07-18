# CMO Continuous — P4 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P4  
**Depends on:** P0 intake, P1 ops cadence, P2 KPI proof loop, P3 Lane B, `CampaignSession`

## Purpose

Close the **months-long CMO loop**: execute → measure → intake with delta → Week N replan. Not a one-shot Week 1.

```
Week N complete → week review → measuring → intake delta → Week N+1 ops + Lane B
```

Engine: `desktop/src/shared/cmoContinuous.ts`

## Data model

Stored on `MarketingProfile.cmo_continuous` (+ localStorage `cmo_continuous.v1`).

| Field | Meaning |
|-------|---------|
| `current_cycle_index` | Active week number (1, 2, 3…) |
| `phase` | `executing` \| `measuring` \| `pivot_ready` |
| `cycles[]` | Archived week outcomes (thesis, KPI snapshot, review summary) |
| `pending_delta` | Last replan: signal changes + thesis shift narrative |
| `accepted_pivot_thesis_id` | Thesis chosen when pivoting (audit trail) |

Ops cadence lineage: `prior_ops_cadence_id` on `CmoOpsCadence`.

## Flow

### 1. Week complete → archive

`completeOpsWeekReview()`:

1. P2 pivot evaluation (unchanged)
2. `archiveCompletedCycle()` — push `CmoCycleRecord`, phase → `measuring` or `pivot_ready`
3. Campaign → `measuring` (`log_kpi` event)

### 2. Replan ready

`isContinuousReplanReady()` when:

- `week_review.status === "completed"`
- Cycle archived for current `week_index`
- `campaign_session.phase === "measuring"`
- Continuous phase is `measuring` or `pivot_ready`

### 3. Start Week N+1

`startNextCmoCycle({ mode, thesisId? })`:

| Mode | Thesis |
|------|--------|
| `pivot` | `pivot.suggested_thesis_ids[0]` or explicit `thesisId` |
| `double_down` | Same `cadence.thesis_id` |

Steps:

1. `buildCmoIntake({ context: { force_thesis_id, cycle_index, prior KPI, memory_snapshot } })`
2. `buildIntakeDelta()` — before/after signals + headline
3. `createOpsCadenceFromThesis({ week_index: N+1 })`
4. `createLaneBWorkspaceFromThesis`
5. `applyNextCycleStarted()` — phase → `executing`
6. Campaign `cmo_cycle_restart` event → phase → `executing`

P11 adds a precomputed `growth_memory.pending_replan`: completed-week proof is harvested into
an experiment/message ledger, and the selected preview mutates Week N+1 priorities, Lane B
copy, and P8/P9 winner hints. Starting the week remains an explicit user action.

## Intake delta (P4)

`CmoIntakeContext` on `buildCmoIntake`:

- `force_thesis_id` — bypass `pickThesisId` for pivot/double-down
- `cycle_index` — Week N priority ids (`thesis.wN.i`) + rationale prefix
- `prior_primary_kpi_*` — KPI truth from archived cycle

## UX

| Surface | Component |
|---------|-----------|
| Workspace / Home | `CmoCyclePanel` — history, delta, Start Week N CTAs |
| Pivot card | `CmoPivotCard` — pivot vs double-down (not generic re-intake) |
| Next action | `start_next_cmo_cycle` when replan ready |
| Active campaign | Measuring CTA triggers `startNextCmoCycle` when ready |

## Store

| Trigger | Action |
|---------|--------|
| `beginCmoWeek1` | `createInitialContinuousState` |
| `completeOpsWeekReview` | `archiveCompletedCycle` |
| Pivot card / cycle panel | `startNextCmoCycle` |
| `dismissPivotSuggestion` | `pivot_ready` → `measuring` |

## Verification

```bash
cd desktop && npm run test:shared   # cmoContinuous.test.ts, campaignSession.test.ts
cd desktop && npm run typecheck
node desktop/scripts/golden-path-smoke.mjs
cd server && npm run build
```

## Campaign session event

```typescript
{ type: "cmo_cycle_restart"; cycleIndex: number; thesisTitle: string }
```

Measuring → executing with milestone `Week N — {thesis}`.
