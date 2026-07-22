# Horizon 2 — Complete the CMO Loop

**Status:** In progress (post Horizon 1 merge)  
**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md)

## Arc goal

Measurement truth + memory compounding close the loop so Week N+1 is **evidence-bound**, not generic.

| Priority | Track | Outcome |
|----------|-------|---------|
| P0 | Part 16 Measurement truth | Pulse → command surface; KPI gates on scale/pivot; GA4 on Day 3/5/7 |
| P0 | Part 17 Memory compounding | Silent archive; replan on Record; memory → intake priorities |
| P1 | Delegate depth (P10) | SOW polish — after dogfood |
| P1 | Reliability | Telemetry + CMO state recovery |
| P2 | Dogfood pipeline | 20 founders when ready |

Part 20 (commercial) follows Horizon 1–2 + dogfood PASS.

## Slice A — Measurement truth (this PR)

- `resolvePulseCommandAction` → command surface dispatch
- Double-down requires numeric KPI (same bar as pivot)
- GA4 sync on pulse checkpoint days
- Thin-data copy unchanged; no fabricated rows

## Slice B — Memory compounding (this PR)

- `shouldSilentArchiveCycle` + auto `completeOpsWeekReview` when ops terminal + KPI ready
- `ReplanPreviewCard` on Execution Record when replan ready
- `applyMemoryToWeek1Priorities` on cycle start
- `buildOpsSnapshotMarkdown` alias for on-demand export

## Exit criteria

- [x] Pulse kill/scale changes command surface CTA same session
- [x] Week closes without essay when KPI + ops terminal
- [x] Week N+1 priorities reflect `pending_replan.ops_mutations`
- [x] `npm run test:shared` + proof-loop matrix pass
