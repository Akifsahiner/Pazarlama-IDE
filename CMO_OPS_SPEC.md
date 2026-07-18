# CMO Operating Cadence — P1 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P1  
**Depends on:** [`CMO_INTAKE_SPEC.md`](CMO_INTAKE_SPEC.md) (P0 channel thesis + `week1_priorities`)

## Purpose

Turn the channel thesis into a **daily war room**: 1–3 sequential tasks with owners, done gates, and **user accountability** (no closing Lane B tasks without proof).

This is not a generic todo list. It is the CMO’s operating rhythm:

```
Thesis → Week 1 cadence → IDE ships (system) → You execute (user) → proof → next unlock → weekly review
```

## Data model

Stored on `MarketingProfile.ops_cadence` (synced server + localStorage fallback).

| Field | Meaning |
|-------|---------|
| `tasks[]` | Up to 3 Week-1 priorities from thesis, with stable `id` (`{thesis_id}.w1.{n}`) |
| `owner` | `system` \| `user` \| `delegate` |
| `status` | `pending` → `in_progress` → `done` \| `skipped` |
| `day_slot` | `now` \| `today` \| `up_next` \| `later` (UI focus bands) |
| `proof` | Required for user/delegate completion |
| `linked_run_id` | System task tied to agent run |
| `week_review` | Due 7 days after `started_at` |

Engine: `desktop/src/shared/cmoOpsCadence.ts`

## Accountability rules (P2 preview)

User/delegate tasks **cannot** mark done without:

- At least one valid `https://` URL, **or**
- A metric snapshot containing numbers, **or**
- A substantive note (20+ chars)

If `done_when` mentions URL/link/live post, URLs are mandatory.

System tasks auto-complete on successful **apply** (`tryAutoCompleteSystemTask`) with commit SHA + file count as proof.

## UX surfaces

| Surface | Component | When |
|---------|-----------|------|
| Workspace | `CmoOpsBoard` (below NextActionBar) | `ops_cadence` active |
| Home | `CmoOpsBoard` | Same |
| Proof gate | `OpsTaskProofModal` | User taps Mark done |
| Next action | `resolveNextAction` | User task = “Your move”; system = “Start in IDE” |
| Handoff | `WorkspaceHandoffBanner` | After system task completes → user task surfaced |

## Store wiring

| Action | Method |
|--------|--------|
| Start Week 1 | `beginCmoWeek1` → `createOpsCadenceFromThesis` + campaign `executing` |
| Mark done | `completeOpsTask(taskId, proof)` |
| Skip | `skipOpsTask` (unlocks next; logged) |
| System run | `startOpsSystemTask` → `startRun` + `linked_run_id` |
| Apply hook | `applyRunChanges` → `tryAutoCompleteSystemTask` |
| Week review | `completeOpsWeekReview(summary)` |

## Sequential unlock

Task *n+1* stays locked until task *n* is `done` or `skipped`. Focus view shows max 3 unlocked tasks; **Now** is always the first incomplete unlocked task.

## Verification

```bash
cd desktop && npm run test:shared   # cmoOpsCadence.test.ts
cd desktop && npm run typecheck
node desktop/scripts/golden-path-smoke.mjs
```

Golden-path needles: `cmoOpsCadence.ts`, `CmoOpsBoard`, `completeOpsTask`, `ops_cadence`.

## Follow-ups (P3+)

- Lane C delegate export + handoff receipt — **done in P5** (`CMO_LANE_C_SPEC.md`)
- Auto day rollover + Week 2 cadence from pivot acceptance — **done in P4**

See [`CMO_PROOF_LOOP_SPEC.md`](CMO_PROOF_LOOP_SPEC.md) for P2 (DONE).
