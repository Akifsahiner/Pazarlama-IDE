# CMO Revenue & Monetization Plane (P16)

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) P16  
**Depends on:** P7 Growth Plane, P11 Growth Memory, P13 Founder-Fit, P14 Budget Plane, P15 Product Loop

## Purpose

Complete the economic loop after P14 (money out):

`pricing thesis → payment funnel → revenue target → channel attribution → week-close snapshot → revenue memory → replan hints`

P14 answers **how much can we spend**; P16 answers **how do we get paid**. Broken activation still pauses marketing via P15 Lane D. Missing checkout/pricing shifts **focus** and creates monetization P0 tasks — it does **not** blanket-stop distribution.

Engine: `desktop/src/shared/cmoRevenuePlane.ts`

## Honesty contract

| Rule | Behavior |
|------|----------|
| No LLM revenue math | Pricing thesis, funnel rates, CAC, LTV, ROI are deterministic TypeScript |
| Confidence labels | `measured` / `assumption` / `missing` on every revenue output |
| CAC | `spend_usd ÷ attributed_paid_customers` only when **both > 0** |
| LTV / LTV:CAC / ROI | Only when founder manually logs LTV or MRR as `measured`; else `insufficient_data` |
| Funnel conversion | Stage-to-stage rate only when **both** stage counts are measured |
| Targets | P13 `paying_customers` win → target from baseline or labeled default (30 = `assumption`) |
| No fake Stripe | Scan may detect billing deps; never write billing config or invent MRR |
| Memory isolation | `revenue_signal` experiments always `message_ids: []` (same as P14 `budget_bucket`) |
| No auto-scale | Replan hints are preview; founder applies on next cycle |

## Intake chain

After P13 seal → P14 budget → P15 product activation → **`RevenueSetupCard`**:

- monetization model confirmation
- payment provider (scan-detected or manual)
- funnel stage counts when measurable
- paid customers / MRR when known
- revenue target preview from P13 `thirty_day_win`

Repo scan adds gaps via `profileFromScan.ts`:

- `revenue.pricing_page_missing`
- `revenue.checkout_missing`
- `revenue.billing_integration_missing`
- `revenue.funnel_events_missing`

`beginCmoWeek1` requires a saved `revenue_profile`.

## Pricing thesis

`inferPricingThesis` rules (deterministic):

1. Sales persona + empty pipeline + `paying_customers` goal → `sales_led`
2. `/pricing` + signup + checkout routes → `plg_self_serve`
3. Pricing missing + paying-customer goal → `not_yet` + pricing gap
4. Stripe/Paddle/Lemon deps or `/checkout` → provider `measured`; else `none_detected`
5. B2B SaaS + pricing route → `hybrid` or `sales_led` per founder time/camera constraints
6. Consumer → funnel includes `trial_start` → `paid` → `retained`; B2B adds `paid` after activation

## Revenue binding (focus shift, not pause)

Active when product binding is **inactive** and one of:

- `paying_customers` goal with zero/missing paid count and pricing or funnel gaps
- P7 binding `gtm === revenue` with instrumentation gap
- Measured trials with `trial_to_paid_pct` below floor (≥10 trials, <5% rate)

Creates `MonetizationWorkspace` P0 tasks. Does **not** set `marketing_paused`. P7 red list blocks paid ads scale when checkout is missing and spend is active.

## Monetization tasks

Lighter than P15 PRODUCT REQUESTs:

- site-level fixes (`/pricing`, funnel events) → Lane A via `linkSiteLevelMonetizationToLaneA`
- core billing → `buildBillingIssueMarkdown` + issue export modal
- proof via `MonetizationTaskProofModal` (URL, PR, metric)

Week close blocks only when an open monetization P0 remains unshipped/unskipped.

## Attribution & week close

`rollupRevenueAttribution` joins P14 bucket closeout spend with manual paid-customer attribution per source.

`completeOpsWeekReview` archives immutable `revenue_snapshot` on `CmoCycleRecord`.

When `thirty_day_win === paying_customers`, week review shows a revenue progress nudge (not a hard KPI blocker unless monetization P0 is open).

## Replan and revenue memory

P11 harvests `revenue_signal` experiments from funnel leaks and measured CAC rows — always `message_ids: []`.

`buildRevenueReplanPreview` exposes deterministic hints (pricing page, checkout, funnel instrumentation, trial-to-paid stall).

Hints merge into `GrowthReplanRecommendation.revenue_hints` beside P14 budget and P15 product hints.

## UI

- `RevenueSetupCard` — intake after product activation
- `RevenuePlanePanel` — backstage funnel, target, attribution, LTV:CAC when measured
- `MonetizationPanel` — P0 queue when revenue binding active
- `MonetizationTaskProofModal` / `MonetizationIssueExportModal` / `RevenueAttributionProofModal`
- `GrowthCommandSurface` — target/funnel chip + monetization CTA
- Command surface governance kind `revenue_focus` (after `product_loop`, before `pivot`)

## Out of scope

- Auto Stripe setup or billing writes
- Invented MRR dashboards
- Silent pricing changes
- LLM ROI slogans

## Verification

`cmoRevenuePlane.test.ts` covers thesis inference, funnel honesty, CAC/LTV gates, binding, Lane A bridge, harvest isolation, hydration.

Cross-module: `cmoCommandSurface.test.ts` (`revenue_focus`), `cmoGrowthPlane.test.ts` (`buildRevenueRedList`), `cmoProofLoop.test.ts` (revenue nudge + monetization week-close gate), `cmoGrowthMemory.test.ts` (`harvestRevenueFromCycle`).
