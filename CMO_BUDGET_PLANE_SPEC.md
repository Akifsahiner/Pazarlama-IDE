# CMO Budget Plane (P14)

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) P14  
**Depends on:** P4 Continuous CMO, P11 Growth Memory, P13 Founder-Fit

## Purpose

Make marketing cash a first-class operating constraint:

`monthly ceiling → deterministic channel allocation → action estimates → logged actuals → channel CPA → reviewed reallocation`

The engine is deterministic TypeScript. No language model allocates money, computes CPA, declares ROI, or silently applies a budget change.

## Honesty contract

- Canonical currency is USD.
- `cost_estimate_usd` is planning data; `actual_spend_usd` / `spend_usd` is logged evidence.
- CPA exists only when both actual spend and attributed outcomes are greater than zero.
- Missing outcome evidence produces `insufficient_data`, never zero CPA or a channel verdict.
- User-entered ceilings are `measured`; band midpoints are `assumption`; evidence-backed scale previews are `stretch`.
- Revenue, LTV, and ROI are owned by P16 — see [`CMO_REVENUE_PLANE_SPEC.md`](CMO_REVENUE_PLANE_SPEC.md).
- No ad-platform write, charge, auto-post, or silent next-week reallocation occurs.

## Allocation

Engine: `desktop/src/shared/cmoBudgetPlane.ts`

P13 budget bands resolve to conservative planning amounts only when the founder skips numeric entry:

| Band | Assumption |
|------|------------|
| `$0` | `$0` |
| Under `$500` | `$250` |
| `$500–2,000` | `$1,250` |
| Over `$2,000` | `$2,500` floor; confirm actual ceiling |

Each channel thesis has a fixed six-bucket percentage template: primary channel, paid ads, influencer, delegate labor, tools, reserve. Camera refusal shifts five points from founder execution to delegation. Under three weekly hours shifts ten points from primary execution to reserve. Percentages always total 100; money rounding remainder goes to reserve.

When the founder does not provide a CPA ceiling, the preview engine uses an explicitly labeled assumption ceiling: `$80` for signup motions and `$400` for outbound pipeline. It is never presented as a benchmark or user fact.

## Execution ledger

`seedActionCosts` divides weekly bucket caps across Lane B, Lane C, distribution, influencer, delegate, and paid ops actions. `applyActionCostEstimates` mirrors the estimate onto the source entity.

Actual spend can be logged in:

- Lane B completion proof
- Influencer reporting proof
- Delegate delivery proof
- Manual `paid_spend` and `tools_spend` KPIs

Organic distribution slots remain `$0` unless explicitly linked to paid work.

## Week close

`rollupBudgetActuals` returns one `BudgetChannelCloseout` per bucket:

- allocated USD
- actual spend USD
- measured outcomes and metric ID, when present
- CPA or `insufficient_data`
- burn percentage

`completeOpsWeekReview` archives an immutable `budget_snapshot` on `CmoCycleRecord`. Missing spend is a nudge, not a close blocker.

## Replan and money memory

P11 harvests one `budget_bucket` experiment per bucket with logged spend. These experiments have `message_ids: []`; money can never turn a hook or pitch into a winner.

Deterministic reallocation:

- Measured CPA at or below the user ceiling can preview a 10-point move from reserve.
- At least 50% allocation spent with an explicitly measured zero outcome can preview a cut to reserve.
- A thesis pivot resets percentages to the new thesis template.
- Insufficient evidence leaves allocation unchanged.

The preview is stored beside the P11 replan and applies only when the founder starts the next CMO cycle.

## UI

- `BudgetSetupCard` — numeric ceiling, optional CPA ceiling, allocation preview
- `BudgetPlanePanel` — backstage plan, weekly caps, actual burn, honest CPA
- `CmoWeekReviewModal` — channel closeout table
- `ReplanPreviewCard` — explicit percentage mutations and confidence
- `GrowthMemoryPanel` — spend experiments separate from message winners

## Verification

`cmoBudgetPlane.test.ts` covers band mapping, all thesis templates, founder-fit shifts, rounding, action estimates, CPA evidence gates, snapshot language, reallocation, application, hydration, and estimate/actual separation. `cmoGrowthMemory.test.ts` covers money harvest isolation and budget mutation merge.
