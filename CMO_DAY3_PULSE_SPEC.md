# CMO Day 3 Pulse Spec (Faz 6)

**Canonical name:** `CMO_DAY3_PULSE_SPEC.md` — distinct from Faz 5 [`CMO_MEASUREMENT_COMPULSION_SPEC.md`](CMO_MEASUREMENT_COMPULSION_SPEC.md).

## North star

Answer **"İşe Yaradı mı?"** at Day 3/5/7 without measurement anxiety:

- Real KPI fraction (`847 / 500 views (169%)`) — never fake GA4 rows
- Thesis-specific honest empty states — never generic "Not measured yet"
- Mid-week pulse before Week 1 review closes the loop

## SSOT pipeline

| Module | Role |
|--------|------|
| `desktop/src/shared/measurementPulse.ts` | `evaluateDayPulse`, `resolveHonestEmptyKpiCopy`, checkpoint resolution |
| `desktop/src/shared/hookLeaderboard.ts` | Ranked hook comparison on Record hero |
| `desktop/src/shared/kpiTrendSeries.ts` | Manual KPI snapshots → sparkline |
| `desktop/src/shared/socialMetricsImport.ts` | TikTok CSV / Reels JSON / generic CSV → `manual_kpis` |
| `desktop/src/shared/executionRecord.ts` | Injects `dayPulse`, `hookLeaderboard`, `kpiTrend` into `ExecutionRecordView` |

**Rule:** UI never reads GA4, manual_kpis, ops proofs, and distribution proofs separately — always via `buildActiveExecutionRecord`.

## Day 3/5/7 Pulse row

- **Visibility:** `cadence.day_index >= checkpoint` (3, 5, or 7); hidden Day 1–2
- **Primary KPI:** value / target + `% of target` tone (`ok` ≥50%, `warn` otherwise, `missing` when unlogged)
- **Leading indicator:** best hook retention (distribution), replies (outbound/influencer), sessions (landing)
- **Action:** from `evaluateHookPerformance` + next distribution slot or next user ops task
- **Verdict:** inherits `evaluateWeek1MetricsWithGa4Priority` (`flat` | `promising` | `insufficient_data`)

### Verdict gates (hard)

| Condition | Verdict |
|-----------|---------|
| `loggedCount === 0` | `insufficient_data` |
| `primaryValue === 0` with proof | `flat` (honest zero, not promising) |
| `pctOfTarget >= 50` | `promising` |
| GA4 connected + gate maps to GA4 | `sourceUsed: ga4` |
| No GA4 connector | no fabricated snapshot rows |

## Honest empty states (thesis-specific)

| Thesis | Copy |
|--------|------|
| `viral_short_form` | Short-form needs 24–72h — log views when ready |
| `founder_social` | Founder posts need 48h — log impressions or connect analytics |
| `landing_conversion` | Connect GA4 or log sessions manually |
| `outbound_sales` | Log reply count when prospects respond |
| `product_hunt_launch` | Launch metrics land T+24h — log upvotes + signups |
| `seo_content` | Indexation takes days — log GSC clicks when available |
| `community_launch` | Community posts need engagement window — log URL + replies |
| `influencer_partnerships` | Replies take 48–72h — log warm/hot when they land |

Used in `formatExecutionResults` (`results-empty` chip) and pulse `waitMessage`.

## Hook leaderboard

- **When:** `distributionOperator` active
- **Where:** Execution Record hero (not Proof tab grid)
- **Verdicts:** `leading` (top retention/views), `kill` (3 posts &lt;20% retention), `pending` (no URL/metrics)
- **SSOT:** `computeHookKillSuggestion` + `evaluateHookPerformance`

## GA4 Pull chip

- **Component:** `Ga4SyncChip.tsx` on pulse row header
- **Not connected:** "Connect GA4" → `connectGa4()`
- **Connected:** "Pull latest" → `syncGa4Metrics()` with spinner; fail → toast, chip unchanged

## Social metrics import

- **Formats:** TikTok CSV, Instagram Reels JSON, generic CSV (`date, views, retention_3s_pct`)
- **Output:** `ManualKpi[]` with `import_note` + `snapshots[]`
- **UI:** `SocialMetricsImportPanel` on Proof tab
- **Store:** `importSocialMetrics(raw, platform, dayIndex?)`

## KPI trend sparkline

- **Min points:** 2 (else hidden)
- **Sources (priority merge):** `ManualKpi.snapshots` → ops proofs → distribution proofs → GA4
- **Snapshot triggers:** `completeOpsTask`, `completeDistributionSlot`, `importSocialMetrics`, `syncGa4Metrics`

## Eval & CI

| Gate | Path |
|------|------|
| Unit | `measurementPulse.test.ts`, `hookLeaderboard.test.ts`, `socialMetricsImport.test.ts`, `kpiTrendSeries.test.ts`, extended `executionRecord.test.ts` |
| Matrix eval | `server/evals/proof-loop-matrix.mjs` — 8 thesis × flat/promising/insufficient + zero fake GA4 |
| E2E | `desktop/e2e/day-pulse.spec.ts` |
| CI script | `npm run test:faz6-day-pulse` in `desktop/package.json` |

## Acceptance (screenshot-ready)

- [ ] Day 3/5/7 Pulse row on Record — primary KPI fraction + leading + action
- [ ] 0 fake analytics rows (eval + manual QA)
- [ ] Hook leaderboard when distribution active
- [ ] GA4 pull chip on Record hero
- [ ] Thesis-specific honest empty — no generic "Not measured yet"
- [ ] Social CSV/JSON import → manual_kpis + provenance note
- [ ] Sparkline Day 1→3→5 when 2+ snapshots exist
- [ ] `proof-loop-matrix.mjs` passes for all 8 theses
