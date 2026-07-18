# CMO Growth Control Plane — P7 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P7  
**Depends on:** P0 channel thesis, P1 ops cadence (`getNowTask`), KPI/GA4 snapshots

## Purpose

P7 creates the deterministic growth control plane consumed by the P12 command surface:

```
Scan + KPIs + thesis → buildGrowthControlPlane → GrowthCommandSurface
```

Engine: `desktop/src/shared/cmoGrowthPlane.ts`

**Principle:** Binding bottleneck is **deterministic** — no LLM. Missing metrics → `confidence: missing`; never fabricated numbers.

## Data model

Stored on `MarketingProfile.growth_control_plane` (+ localStorage `growth_control_plane.v1`).

| Field | Meaning |
|-------|---------|
| `equation` | Product-class growth stages + honest metric sources |
| `binding` | ONE headline sentence + GTM bottleneck + evidence |
| `red_list` | Structured channel rejections (not free-text only) |
| `thesis_aligned` | Flags thesis vs binding tension — **does not auto-pivot** |
| `today` | From ops/operator focus — what / why / done_when / owner |

## Engine rules (summary)

1. **buildGrowthEquation** — product class from scan signals; metrics from GA4, `manual_kpis`, profile only  
2. **resolveBindingBottleneck** — ordered rules: measurement blind, launch window, sales pipeline, traffic+CR, prelaunch attention, etc.  
3. **buildRedList** — binding-specific rejections merged with thesis `deprioritize`  
4. **checkThesisAlignment** — e.g. `seo_content` + awareness binding → misalignment note  
5. **attachTodayMove** — ops/operator now-task + deterministic P12 why

## Store wiring

| Trigger | Action |
|---------|--------|
| `runCmoIntake` | `recomputeGrowthPlane()` |
| `beginCmoWeek1` / `startNextCmoCycle` | recompute after ops created |
| `completeOpsTask` / `syncGa4Metrics` / `upsertManualKpi` | recompute |
| `loadMarketingProfile` / `openProject` | hydrate + recompute |
| `toggleWarRoomExpanded` | open/close P12 backstage |

## UX surfaces

| Surface | Component | When |
|---------|-----------|------|
| Workspace / Home | `GrowthCommandSurface` (`growth-command-surface`) | ops cadence + `today` move |
| Backstage | Ops / Lane A/B/C / Memory / Cycle | hidden until explicitly opened |
| Governance | Compact command-surface banner | review / measuring / pivot / replan |
| NextActionBar | blocking non-CMO work | CMO-owned actions hidden when surface active |

## Verification

```bash
cd desktop && npm run test:shared   # cmoGrowthPlane.test.ts
cd desktop && npm run typecheck
npm run test:wow-checklist
node desktop/scripts/golden-path-smoke.mjs
cd server && npm run build
```

## Feature gate (§12)

1. Right growth thesis? — binding validates thesis; misalignment surfaced  
2. Reduces ambiguity? — single surface: bottleneck + today + why + done when  
3. Lane A/B/C? — surface dispatches existing ops actions  
4. Metric in 7 days? — equation stages show gaps honestly  
5. World-class CMO? — red list rejects wrong channels with evidence  

## Out of scope (P10+)

- Auto-post / platform APIs  
- LLM script generation at runtime  
- Paid ads creative grid  
- Auto thesis pivot on misalignment  

**P8 (Distribution Operator)** — see [`CMO_DISTRIBUTION_OPERATOR_SPEC.md`](CMO_DISTRIBUTION_OPERATOR_SPEC.md)  
**P9 (Influencer Operator)** — see [`CMO_INFLUENCER_OPERATOR_SPEC.md`](CMO_INFLUENCER_OPERATOR_SPEC.md)
**P12 (Command Surface)** — see [`CMO_COMMAND_SURFACE_SPEC.md`](CMO_COMMAND_SURFACE_SPEC.md)
