# Product Understanding — Part 6 SSOT

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) — Bölüm B, Part 6  
**Status:** Implemented in `desktop/src/shared/productUnderstanding*.ts`

## Purpose

Every CMO recommendation must be **grounded** in repo paths, live URLs, user answers, analytics snapshots, or labeled gaps. No fabricated product claims.

## 11 dimensions

| ID | Question | Empty default |
|----|----------|---------------|
| `product_category` | Product type? | assumption |
| `business_model` | Revenue model? | missing |
| `pricing` | Pricing surface? | missing |
| `target_user` | ICP? | missing |
| `primary_problem` | Core pain? | assumption |
| `activation_event` | First value? | needs_confirmation |
| `traffic_analytics` | Measurement? | missing |
| `site_structure` | Landing/pricing/onboarding? | measured when routes exist |
| `founder_constraints` | Time/budget/visibility? | missing until P13 |
| `distribution_assets` | Channels/proof? | missing |
| `competitors_alternatives` | Alternatives? | missing |

## Core types

- `EvidenceRef` — structured source (repo_path, live_url, user_answer, analytics_snapshot, …)
- `ProductClaim` — `{ dimension, value, confidence, evidence[] }`
- `ProductUnderstandingGraph` — persisted on `MarketingProfile.product_understanding`

## Confidence contract

| Confidence | Rule |
|------------|------|
| measured | `evidence.length >= 1` |
| assumption | Explicit label in UI |
| missing | `value === null` |
| needs_confirmation | Inline CTA via `confirmation_queue` |

## Anti-fabrication gates (FAB)

| ID | Trigger |
|----|---------|
| FAB-01 | Strategic seal with critical dimensions missing |
| FAB-02 | Brain cites missing profile field |
| FAB-MEASURED | Measured claim without evidence |
| FAB-04 | Competitor without URL/user ref |
| FAB-05 | URL-only project cites repo paths |

## Code anchors

- `productUnderstandingPolicy.ts` — `buildProductUnderstanding`
- `productUnderstandingFromScan.ts` — scan extractors
- `productUnderstandingFabrication.ts` — `auditClaimFabrication`
- `productUnderstandingIntakeBind.ts` — thesis rationale links
- `WhyPanel.tsx` — user-facing "Why?"
- `store.ts` — seal gate
- `server/src/brain/citationValidator.ts` — brain post-check

## Verification

```bash
cd desktop
npm run typecheck
node --import tsx --test src/shared/productUnderstandingPolicy.test.ts
node scripts/product-understanding-smoke.mjs
```
