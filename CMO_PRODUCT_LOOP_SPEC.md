# CMO Product Loop (Lane D) — P15

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) P15  
**Depends on:** P0 Intake, P4 Continuous CMO, P6 Lane A, P7 Growth Plane, P11 Growth Memory, P13 Founder-Fit

## Purpose

Stop acquisition work when product activation is the binding constraint:

`activation intake → deterministic product binding → P0 PRODUCT REQUEST → Lane A or developer issue → proof → resume marketing`

Engine: `desktop/src/shared/cmoLaneD.ts`

## Honesty contract

- Activation rate and TTFV math is deterministic TypeScript; no LLM computes metrics.
- User/KPI values are `measured`; the 40% default target and 20% conservative floor are `assumption`; absent metrics remain `missing`.
- A repo scan can identify onboarding or instrumentation gaps, but never invent activation performance.
- Product binding sets explicit `marketing_paused`; it suppresses Lane B, distribution, influencer, and delegate execution.
- No issue is filed automatically. Core work exports markdown; the user records the real issue or PR URL.
- A P0 request closes only with proof. Site fixes need PR/shipped proof; core fixes need an issue or PR URL.

## Intake

`ProductActivationCard` appears after the P13 decision and P14 budget boundary. It captures:

- activation event (prefilled from `magic_moment`)
- signups and activated users
- activation-rate target
- current and target time-to-first-value
- onboarding-path presence

The repo scanner adds `product.onboarding_missing` and `product.activation_event_missing` only when signup routes exist without an onboarding path.

## Deterministic binding

`detectProductBinding` uses first-match priority:

1. founder `scale_readiness === "not_yet"`
2. P7 binding stage is `activation`
3. measured activation is below the founder target
4. at least 10 measured signups and activation is below the labeled 20% assumption floor
5. onboarding scan gap plus a defined magic moment

No match means normal Lane A/B/C operations.

## PRODUCT REQUEST contract

Every request has:

- `priority: P0`
- `acceptance_criteria[]`
- `growth_impact`
- `marketing_status: paused`
- `fix_scope: site_level | core_product`
- explicit status and proof

Site-level instrumentation/onboarding work links into Lane A and closes on apply proof. Auth, billing, core workflow, performance, and scale-readiness work exports as a tracked developer issue.

## Governance and continuous loop

`beginCmoWeek1` and `startNextCmoCycle` evaluate product binding. While active:

- product-loop ops replace marketing thesis ops
- `LaneDPanel` becomes the backstage P0 queue
- the command surface shows “Marketing paused”
- distribution/influencer/delegate operators do not start
- week close requires every P0 to be shipped or explicitly skipped

P11 harvests shipped requests as `product_fix` experiments with `message_ids: []`; product evidence cannot turn marketing copy into a winner. Replan exposes `product_hints` and never silently resumes marketing.

## Resume gate

`resumeMarketingAfterProductLoop` is a human action. It is available only when all P0 requests are terminal. Resuming clears the pause; normal marketing work is generated on the next CMO cycle.

## Verification

```bash
cd desktop && npm run test:shared && npm run typecheck
npm run test:wow-checklist
cd ../server && npm run build
```

`cmoLaneD.test.ts` covers activation math, confidence, binding order, request generation, Lane A linking, proof gates, issue export, pause/resume, progress, and hydration.
