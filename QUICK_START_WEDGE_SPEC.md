# Quick Start Wedge — Ship First, Strategize Second

Sibling to [`CMO_INTAKE_SPEC.md`](CMO_INTAKE_SPEC.md). Defines the **First 60 Minutes** onboarding wedge before `firstShipAt`.

## Principle

Users must **ship a visible repo change** (hero, meta, CTA) before Full CMO (founder fit, seal, Week 1) becomes the primary CTA.

## CTA priority (Reveal + Home)

When `firstShipAt == null` and a hero route exists:

1. **Primary:** `reveal-ship-first-win` → `beginQuickStartShip()`
2. **Secondary:** Full CMO setup / launch plan

After `firstShipAt`:

1. Complete CMO strategy (7 questions) if not sealed
2. Week 1 ops when sealed + activation + revenue ready

Pure functions: [`desktop/src/shared/quickStartWedge.ts`](desktop/src/shared/quickStartWedge.ts)

## Onboarding tracks

| Track | Default | Behavior |
|-------|---------|----------|
| `quick_start` | Yes (new projects) | Draft intake for thesis chip only; defer full merge |
| `full_cmo` | User opt-in | Existing founder fit → seal → Week 1 path |

Persist: `onboarding_track.v1.{projectId}`

## Intake timing

- **Draft intake** (`buildCmoIntake({ draft: true })`) runs on scan for thesis chip — does **not** demote ship CTA.
- **Full intake merge** deferred until `firstShipAt` OR explicit `full_cmo` track.

`shouldDeferFullCmoIntake()` gates Home/Reveal CMO sections.

## Guaranteed ship pipeline

Stages: `run → diff → apply → preview → verify → done | failed`

- Quick Start skips scout; direct edit with max 2 skills (`landing-page-conversion`, `seo-content-engine`).
- `guaranteedShip: true` on edit runs → agent host emits `NO_PATCHES` failure when diff is empty.
- Apply auto-opens preview; browser verify when `canBrowse`.

State: `shipPipeline`, `firstShipSnapshot`, `firstShipLedger` — see [`desktop/src/shared/shipPipeline.ts`](desktop/src/shared/shipPipeline.ts).

## Unlock gates

Full CMO Week 1 requires:

- `firstShipAt` **or** `onboardingTrack === "full_cmo"`
- Strategic decision sealed
- Product activation + revenue intake

## Metrics (local only)

`execution_metrics.v1.{projectId}` — FST, apply rate, run success. No server sync in Faz 1.

## Test IDs

| ID | Surface |
|----|---------|
| `quick-start-choose` | Fork card |
| `reveal-ship-first-win` | Reveal primary CTA |
| `ship-pipeline-bar` | Workspace canvas |
| `ship-apply-primary` | Run / Preview canvas |
| `ship-win-card` | Home / thread |
| `command-surface-ship-first-win` | Growth command surface |
