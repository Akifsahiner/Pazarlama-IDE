# CMO Proof Loop — P2 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P2  
**Depends on:** [`CMO_OPS_SPEC.md`](CMO_OPS_SPEC.md) (P1 ops cadence)

## Purpose

Close the loop between **ship → measure → pivot**:

```
Apply (Lane A) → user executes (Lane B) → KPI proof → manual_kpis / GA4 → week review → pivot suggestion
```

A CMO does not accept "I posted" without numbers. P2 makes that non-negotiable in the product.

## KPI gate rules

User/delegate ops tasks require **both**:

1. P1 accountability (URL, metric text, or substantive note)
2. **P2 numeric KPI** (`kpi_value`) mapped to a preset via `resolveOpsKpiGate()`

On confirm:

- Proof stored on `ops_cadence.tasks[].proof` with `kpi_id`, `kpi_value`, `kpi_source`
- `manual_kpis` upserted via `buildManualKpiFromOpsProof()` → Performance / Command Center

### GA4 path

When gate maps to GA4 (`sessions`, `conversions`):

- **Pull GA4** in proof modal → `syncGa4Metrics()` → read `connector_snapshots.ga4`
- Sets `kpi_source: "ga4"` — still honest; never fabricated

## Week review gate

`canCompleteWeekReview()` blocks close when:

- Open user tasks remain
- Done user tasks lack `proof.kpi_value`
- Summary empty

On success:

- Campaign → `measuring` phase (`log_kpi` event)
- `buildPivotSuggestion()` attached to `ops_cadence.pivot_suggestion`

## Flat metric → auto-pivot

`evaluateWeek1Metrics()` verdicts:

| Verdict | Condition |
|---------|-----------|
| `flat` | KPI = 0, or &lt;20% of target |
| `promising` | KPI &gt; 0 and ≥50% of target |
| `insufficient_data` | No KPI logged / all skipped |

`buildPivotSuggestion()` when flat or insufficient after Week 1:

- Headline + rationale tied to **current thesis**
- `suggested_thesis_ids` from deterministic alternates map
- UI: `CmoPivotCard` → Re-run CMO intake

### P11 memory guard

`buildPivotSuggestion()` also reads `growth_memory`. Two evidence-backed winners on the
current thesis suppress a generic pivot, while the pending replan carries winner/loser
evidence into Week N+1. Missing samples never count as winners.

## Engine

`desktop/src/shared/cmoProofLoop.ts`

## UI

| Surface | Component |
|---------|-----------|
| Proof modal KPI section | `OpsTaskProofModal` |
| Pivot card | `CmoPivotCard` |
| Week review modal | `CmoWeekReviewModal` |
| Next action | week review + pivot dispatch |

## Verification

```bash
cd desktop && npm run test:shared   # cmoProofLoop.test.ts
cd desktop && npm run typecheck
```

## Follow-ups (P4)

- Continuous replan: measuring → intake with delta
- Auto Week 2 cadence from pivot acceptance

See [`CMO_LANE_B_SPEC.md`](CMO_LANE_B_SPEC.md) for P3 (DONE).
- GA4 before/after delta on apply receipt

## Progressive human proof (Faz 5 — Human Lane)

Lane B / operator / ops human tasks use a **URL-before-KPI** state machine (`humanProofProgress.ts`):

| Step | Gate | Lifecycle |
|------|------|-----------|
| `draft` | — | `awaiting_proof` |
| `posted` | URL ≥ 8 chars or valid http(s) | `awaiting_proof` |
| `metrics` | KPI optional; `measure_deferred` allowed | `measuring` |
| `complete` | posted gate passed (+ KPI if `done_when` requires) | ops/Lane B done |

**Rules:**

- "I posted" without URL is rejected (`humanExecutionContractLint.ts`, drawer stepper)
- KPI section disabled until posted URL passes `validatePostedUrl()`
- `HumanTaskKitDrawer` is primary proof UX; `OpsTaskProofModal` retains URL-first gate for non-kit tasks
- Influencer reply stage requires thread URL (min 8 chars) — not note-only

**Anchors:** `HumanTaskKitDrawer.tsx`, `store.ts` (`markHumanTaskPosted`, `logHumanTaskMetrics`, `completeHumanTaskKit`), `CMO_HUMAN_EXECUTION_BIND_SPEC.md`.
