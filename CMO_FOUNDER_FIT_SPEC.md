# CMO Founder-Fit Intake + Strategic Options (P13)

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P13  
**Depends on:** P0 Intake, P7 Growth Control Plane, P12 Command Surface

## Goal

Turn the first session from a scan-only channel recommendation into a short CMO decision:

`7 founder questions → cultural tension → one narrative → A/B/C options → recommendation → 30-day target → contract → one Yes → operations`

After the decision is sealed, advisory surfaces stop. The P12 command surface owns the next action.

## Seven questions

The intake intentionally asks exactly seven questions:

1. Founder visibility / camera readiness
2. Tolerance for polarizing positioning
3. First-month budget band (feasibility only; allocation is P14)
4. Product readiness for a demand spike
5. Product magic moment
6. Sustainable weekly marketing hours
7. Definition of a 30-day win

`cmoFounderFit.ts` validates the answers and scores thesis eligibility. Hard conflicts are blockers, not warnings. A founder who selects `brand_face_readiness: never` cannot be recommended `founder_social`; a product with `scale_readiness: not_yet` cannot be recommended high-volume short-form.

## Narrative

`cmoGrowthNarrative.ts` deterministically produces:

- `cultural_tension`
- `one_liner`
- `enemy_frame`
- `proof_angle`
- auditable `signals`

The engine uses project class, repo/readme evidence, and the founder's magic moment. No LLM decides or rewrites the binding narrative in P13.

The sealed narrative is passed into Lane A, Lane B, Distribution Operator, Influencer Operator, and command-surface fallback rationale through `cmoNarrativeContext.ts`.

## Strategic options

`cmoStrategicOptions.ts` always returns three explicit postures:

| Option | Posture | Purpose |
|--------|---------|---------|
| A | Safe foundation | Lower founder load; establish measurable proof |
| B | Balanced bet | Highest founder-fit-adjusted eligible thesis |
| C | Category attack | Highest-upside differentiated distribution path |

Every option contains tradeoffs, eligibility, a 30-day target, CMO commitments, and founder commitments. Ineligible options remain visible with a reason but cannot be selected or sealed.

## Target honesty

Targets are labeled:

- `measured` — derived from a real manual KPI/current-user baseline
- `assumption` — no reliable baseline; numeric target is intentionally omitted
- `stretch` — aggressive option derived from a measured baseline

Every target includes a Week 1 calibration note. Missing data never becomes a fabricated GA4 row or fake forecast.

## Decision gate

`beginCmoWeek1()` refuses to start until `strategic_decision.sealed_at` exists. The sole decision CTA seals the selected option, builds the final `ChannelThesis`, persists the contract, and immediately starts operations.

Legacy projects with an existing `ops_cadence` are treated as implicitly sealed. If a persisted strategic decision exists, hydrate backfills its seal timestamp from the cadence.

## Persistence

Profile fields:

- `founder_fit`
- `growth_narrative`
- `strategic_decision`
- final `channel_thesis.strategic_option_id`

They are mirrored by server Zod and cached per project under `founder_fit.v1`, `growth_narrative.v1`, and `strategic_decision.v1`.

## UX

- `FounderFitWizard` — one question per step, seven total
- `StrategicDecisionCard` — narrative, A/B/C, recommendation, target confidence, contract, one Yes
- `CmoStrategicIntakeFlow` — wizard-to-decision orchestration
- Project Reveal and Home both gate Week 1 through this flow

After Yes, the strategic card disappears and `GrowthCommandSurface` becomes primary.

## Verification

- Founder-fit, narrative, and strategic option engines have 30 P13 scenarios
- Shared suite includes all P13 tests
- Typecheck, wow-checklist smoke, golden-path smoke, desktop build, and server build are required

## Out of scope

- Numeric budget allocation/reallocation is owned by P14; see [`CMO_BUDGET_PLANE_SPEC.md`](CMO_BUDGET_PLANE_SPEC.md).
- Product bottleneck / Lane D issue creation is owned by P15; see [`CMO_PRODUCT_LOOP_SPEC.md`](CMO_PRODUCT_LOOP_SPEC.md).
- LLM narrative polish
