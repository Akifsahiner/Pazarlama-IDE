# CMO Delegation Operator (P10)

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P10  
**Depends on:** P5 Lane C, P3 Lane B, P7 Growth Control Plane, P8/P9 operators

## Problem

P5 shipped delegate briefs with handoff + delivery proof. P10 adds **delegation at scale**: hire scaffolds, daily rubrics, and bidirectional Lane C ↔ Lane B/operator sync.

## Scope gate

When `thesisHasDelegateLane` + active `ops_cadence` + delegate workspace exists.

## Data model

Engine: `desktop/src/shared/cmoDelegateOperator.ts`  
Persist: `MarketingProfile.delegate_operator` + `lane_c_workspace` (compat) + localStorage `delegate_operator.v1`

Key types: `DelegateOperatorWorkspace`, `DelegateHireBlock`, `DelegateDailyRubric`, `DelegateLaneLink`, `DelegateVerdict`.

## Hire briefs

Deterministic job post scaffolds per role (`va_research`, `creator_filmer`, `sdr_outbound`, etc.) with trial KPIs and compensation frame.

## Daily rubric

Generated on handoff; D1–7 checklists with proof validation. Partial days need ≥50% required items + note.

## Lane C ↔ Lane B / operator

| Target | Handoff | Delivery import |
|--------|---------|-----------------|
| `lane_b_outreach` | Reserve rows + CSV | `parseOutboundImportLines` |
| `influencer_operator` | — | `importCreatorsFromDelegateProof` |
| `distribution_operator` | — | `parseCreatorFilmLines` → slot URLs |

## Verdict rules

| Verdict | Condition |
|---------|-----------|
| `promote` | Brief done + ≥85% rubric days + KPI ≥80% |
| `extend` | Partial delivery 40–79% |
| `release` | ≥3 missed rubric days or KPI <40% |
| `on_track` | Default while executing |

## UI

- `DelegateOperatorPanel` (`delegate-operator-panel`)
- `DelegateHireModal`, `DelegateRubricModal`
- P12 `GrowthCommandSurface` rubric summary + deterministic why
- `DelegateVerdictCard` on ops board

## Tests

`desktop/src/shared/cmoDelegateOperator.test.ts` — 15 scenarios.
