# CMO Execution Kernel — Part 10

**Status:** `desktop/src/shared/executionKernel.ts`  
**North star:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) — one reliable motor for all marketing execution.

**Not to be confused with Code P10 (Delegation Operator)** — that is `cmoDelegateOperator.ts`. Part 10 is the **unified execution kernel**.

## Purpose

Route every ops/plan task through a single persisted lifecycle engine. P19 `execution_mode` is the primary dispatch key; frozen bind payloads (`execution_plan`, `human_execution_ref`) are read-only at dispatch.

## Unified lifecycle

```
proposed → ready → running → awaiting_approval → applied → verifying → completed → measuring
         ↘ paused ↗          ↘ failed → retry → ready
         ↘ cancelled (terminal)
```

| Status | Meaning |
|--------|---------|
| `proposed` | Task exists; dependencies not satisfied |
| `ready` | Unlocked; dispatchable |
| `running` | Active run / browser / human modal |
| `awaiting_approval` | Diff or tool approval gate |
| `applied` | Patch applied or human proof submitted |
| `verifying` | Post-apply browser verify |
| `completed` | Done gate satisfied |
| `measuring` | KPI window open (`metric.measurable`) |
| `paused` | User paused mid-run |
| `cancelled` | Skipped / user cancelled |
| `failed` | Error; retry eligible |

## Source of truth

| Data | Owner |
|------|-------|
| 14-field contract | `ops_cadence.tasks[]` |
| Lifecycle + attempt | `execution_kernel.instances[]` |
| Run stream | RunEvent bus |
| Frozen human assets | bind-time only — never re-freeze on retry |

## API

- `bootstrapExecutionKernel(cadence, projectId)` — hydrate instances from ops cadence
- `dispatchExecutionTask(kernel, taskId, provenance)` — idempotent dispatch
- `completeExecutionTask(kernel, taskId, proof)` — terminal or measuring transition
- `retryExecutionTask(kernel, taskId)` — attempt++ ; no duplicate tasks/assets
- `pauseExecutionTask` / `resumeExecutionTask` / `cancelExecutionTask`
- `projectKernelToOpsCadence(kernel, cadence)` — status projection
- `replayTaskTimeline(kernel, taskId)` — read-only event slice

## Handler registry

See `executionHandlers.ts` — 13 `MarketingExecutionMode` values + `week_review` governance.

## Integration

| Consumer | Role |
|----------|------|
| `store.ts` | Thin wrappers; strangler over legacy paths |
| `executionRecord.ts` | Lifecycle from kernel instances |
| `cmoOpsCadence.ts` | `depends_on` unlock via `executionGraph.ts` |
| `cmoCommandSurface.ts` | `getNextExecutionAction()` |
| RunEvent bus | `task.*` correlation events |

## Eval exit criteria

- 0 bypass paths (grep gate)
- Reload preserves lifecycle + attempt + run_id
- Retry produces 0 duplicate tasks/assets
- 13 modes + week_review handler coverage 100%
- Founder journey rubric 40/40 (`eval:founder-journey-rubric`)
- User promise documented in [`CMO_EXECUTION_USER_PROMISE.md`](CMO_EXECUTION_USER_PROMISE.md)

## User promise

See [`CMO_EXECUTION_USER_PROMISE.md`](CMO_EXECUTION_USER_PROMISE.md) — reload, retry, fail, and pause/resume behavior contract.

## Verification

```bash
cd desktop && npm run typecheck && npm run test:shared && npm run test:faz10-trust-engine
cd server && npm run eval:execution-kernel
```
