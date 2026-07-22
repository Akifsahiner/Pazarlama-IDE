# Horizon 2 — Complete the CMO Loop

**Status:** In progress  
**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md)

## Arc goal

Measurement truth + memory compounding close the loop so Week N+1 is **evidence-bound**, not generic.

| Priority | Track | Outcome | Status |
|----------|-------|---------|--------|
| P0 | Part 16 Measurement truth | Pulse → command surface; KPI gates on scale/pivot; GA4 on Day 3/5/7 | ✅ PR #15 |
| P0 | Part 17 Memory compounding | Silent archive; replan on Record; memory → intake priorities | ✅ PR #15 |
| P1 | Delegate depth (P10) | SOW export; rubric template fixes; extend trial action | ✅ this branch |
| P1 | Reliability | Telemetry redaction + sink; persistence module; crash hooks | ✅ this branch |
| P2 | Dogfood pipeline | B1–B9 taxonomy; issue template; cohort rollup helper | ✅ this branch |

Part 20 (commercial) follows Horizon 1–2 + dogfood PASS.

## Slice A — Measurement truth (PR #15)

- `resolvePulseCommandAction` → command surface dispatch
- Double-down requires numeric KPI (same bar as pivot)
- GA4 sync on pulse checkpoint days
- Thin-data copy unchanged; no fabricated rows

## Slice B — Memory compounding (PR #15)

- `shouldSilentArchiveCycle` + auto `completeOpsWeekReview` when ops terminal + KPI ready
- `ReplanPreviewCard` on Execution Record when replan ready
- `applyMemoryToWeek1Priorities` on cycle start
- `buildOpsSnapshotMarkdown` alias for on-demand export

## Slice C — Reliability (Part 18)

- `executionPersistence.ts` — key names + round-trip validation
- `telemetryRedact.ts` — PII/path/token stripping before flush
- `analytics.ts` — redacted batch POST to `/telemetry` when opt-in
- `ErrorBoundary` + `reportBackgroundError` → `track()` hooks
- Settings copy matches actual behavior

## Slice D — Delegate depth (Part 14/P10)

- `writer_publish` → 4-day rubric (was falling through to 7-day VA)
- `agency_wave` → 5-day DM rubric
- `buildDelegateSowMarkdown` + Copy SOW in hire modal
- `extendDelegateTrial` + CTA on extend verdict card

## Slice E — Dogfood pipeline infra (Part 19)

- `dogfoodSession.ts` — B1–B9, trust gates, issue body builder, cohort PASS helper
- `.github/ISSUE_TEMPLATE/dogfood-blocker.yml`
- `golden-path-smoke.mjs` asserts new modules

## Exit criteria

### P0 (PR #15)
- [x] Pulse kill/scale changes command surface CTA same session
- [x] Week closes without essay when KPI + ops terminal
- [x] Week N+1 priorities reflect `pending_replan.ops_mutations`
- [x] `npm run test:shared` + proof-loop matrix pass

### P1/P2 (this branch)
- [x] Persistence round-trip test covers kernel + ops + delegate
- [x] Telemetry props redacted; opt-in flush to server route
- [x] Delegate SOW export + extend trial wired
- [x] Dogfood issue template + typed blocker taxonomy

## Deferred

- Pixel screenshot redaction (browser CU) — separate PR
- Dogfood cohort execution (20 founders) — requires team sessions
- Part 20 commercial metrics — after dogfood PASS
