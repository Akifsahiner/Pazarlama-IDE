# CMO Thesis Quality Engine (P18 / Part 7)

**Status:** Shipped in `desktop/src/shared/cmoThesisQualityEngine.ts`  
**North star:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) — correct channel thesis per product, not one-size-fits-all SEO/landing.

**Not to be confused with P7 Growth Control Plane** (`cmoGrowthPlane.ts`) — runtime binding during execution. P18 evaluates strategy **before and during** intake/seal.

## Purpose

Stop recommending SEO or landing conversion to every product. A unified deterministic engine evaluates eleven dimensions and produces an evidence-bound channel thesis with product-specific rationale.

## Eleven dimensions

| ID | Source |
|----|--------|
| product_class | Scan + profile business model |
| market_maturity | company_stage + launch window + blog/traffic |
| founder_fit | P13 seven questions |
| public_presence | P17 PublicPresencePolicy |
| distribution_assets | Scan routes + available_assets + presence |
| budget | monthly_budget_band (+ P14 when present) |
| activation_readiness | P15 detectProductBinding / activation profile |
| monetization_readiness | P16 inferPricingThesis / checkout detect |
| existing_demand | users, email list, KPIs, pipeline |
| growth_mechanism_fit | P17 assessGrowthMechanisms |
| evidence_confidence | Composite measured / assumption / missing |

## Output — `ThesisQualityReport`

- `primary_mechanism_id` + `primary_thesis_id`
- `secondary_support` — complementary channel
- `why_now[]` — product-specific bullets (must cite scan fact, metric, or founder answer)
- `why_not_others[]` — rejected theses with evidence
- `success_signal` + `kill_pivot_condition`
- `week1_execution` — from mechanism templates
- `dimension_scores` + `ranked_pairs`

## Algorithm

1. `buildThesisQualityContext` — aggregate all dimensions
2. Joint score every eligible `(mechanism, thesis)` pair
3. Apply hard gates (activation binding, checkout missing, scale not ready)
4. Select primary + secondary; generate evidence-backed rationale
5. Lint generic copy via `GENERIC_THESIS_RATIONALE_RE`

## Integration

| Consumer | Role |
|----------|------|
| `buildCmoIntake` | Draft thesis from report when founder_fit present |
| `buildStrategicDecision` | A/B/C from ranked pairs |
| `marketingProfile.thesis_quality_report` | Persisted snapshot |
| `StrategicDecisionCard` / `CmoIntakeCard` | UI: why now / why not |
| `cmoGrowthPlane` | success_signal + kill_pivot in alignment note |

## Eval exit criteria

- ≥100 synthetic scenarios in `thesisScenarioCorpus.ts`
- `eval:thesis-quality` wrong-primary rate ≤ 3%
- Every report passes `assertThesisQualityEvidence`
- `why_now` must be product-specific (no generic lint match)

## Verification

```bash
cd desktop && npm run test:shared   # includes cmoThesisQualityEngine.test.ts
cd server && npm run eval:thesis-quality
```
