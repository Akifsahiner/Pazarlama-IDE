# CMO Measurement Compulsion — Faz 5 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md)  
**Depends on:** [`CMO_PROOF_LOOP_SPEC.md`](CMO_PROOF_LOOP_SPEC.md), first ship + Week 1 ops

## Purpose

**No scale or pivot without logged KPI.** GA4 is encouraged (never blocks apply/verify), but Week 1 gate and pivot decisions require measurement baseline.

## Baseline readiness

`assessMeasurementBaseline(profile, project)` — ready if ANY of:

| Source | Condition |
|--------|-----------|
| `ga4_connected` | `hasGa4Connected(profile)` |
| `manual_kpi` | ≥1 manual KPI with value |
| `measurement_ack` | User acknowledged manual logging |
| `activation_event_logged` + snippet/ack | Activation event defined + analytics or ack |

## Week 1 gate

`beginCmoWeek1`:

- **Soft (default):** opens `MeasurementBaselineCard`, status event, continues
- **Hard (`MEASUREMENT_GATE_HARD=1`):** blocks until baseline ready

`week1Ready` = product activation + revenue + baseline (when hard gate).

## Post-ship CTA

After `markFirstShip` / ship pipeline `done`:

- Non-blocking handoff: Connect GA4 or log baseline
- Surfaces: `ShipWinCard`, command surface secondary CTA

## Week review — GA4 first

`CmoWeekReviewModal` on open:

1. If GA4 connected → `syncGa4Metrics()` (spinner)
2. `evaluateWeek1MetricsWithGa4Priority` — GA4 > ops proof ga4 > manual > operator
3. Side-by-side: GA4 | Manual | Using

## Pivot hardening

| Rule | Enforcement |
|------|-------------|
| Pivot requires numeric KPI | `startNextCmoCycle({ mode: "pivot" })` |
| No pivot card CTA on insufficient_data | `CmoPivotCard` |
| No lenient promising bypass | `evaluateWeek1Metrics` |
| Command surface | pivot → "Log KPI in review" when no KPI |

## Exit criteria

- Week 1 hard gate behind `MEASUREMENT_GATE_HARD=1`
- Week review shows GA4 sync + KPI panel
- Pivot disabled until review closed + KPI logged
- No fake GA4 rows (honest metrics preserved)

## Code anchors

| Module | Path |
|--------|------|
| Baseline model | `desktop/src/shared/measurementBaseline.ts` |
| GA4-priority assessment | `desktop/src/shared/cmoProofLoop.ts` |
| Baseline UI | `desktop/src/renderer/features/onboarding/MeasurementBaselineCard.tsx` |
| Week review KPI panel | `desktop/src/renderer/features/workspace/CmoPivotCard.tsx` |
