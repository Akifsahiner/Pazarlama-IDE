# CMO Execution — User Promise

**Canonical kernel spec:** [`CMO_EXECUTION_KERNEL_SPEC.md`](CMO_EXECUTION_KERNEL_SPEC.md)

## The promise

> *"I closed and reopened the app — it continued from where I left off. Nothing was lost."*

Marketing IDE's execution kernel exists to keep that promise for every Week 1 ops task.

## What we guarantee

| Situation | User sees | System behavior |
|-----------|-----------|-----------------|
| **Reload** | Same task status, same attempt count, same run link | `execution_kernel` + `ops_cadence` hydrate from profile/localStorage |
| **Run failed** | "Failed — retry available" + Retry button | Kernel → `failed`; ops task returns to retryable state |
| **Retry** | Same frozen script/assets; new attempt | `attempt++`; no duplicate tasks or re-frozen human assets |
| **Pause / Resume** | Paused banner; Resume continues dispatch | Kernel `paused` ↔ `running`; active run interrupted on pause |
| **Skip browser-verify system task** | Error — cannot skip | `skipOpsTask` blocks browser-verify tasks |
| **Week close (Continuous Decision)** | Start next week without mandatory essay | Auto-summary when proof gates pass |

## Source of truth

- **Execution lifecycle:** `execution_kernel.instances[]`
- **14-field contract + proof:** `ops_cadence.tasks[]` (projected from kernel)
- **Run stream:** RunEvent bus (correlated by `run_id`)
- **Human copy/assets:** bind-time freeze only — never regenerated on retry

## Out of scope (honest labeling)

- **Plan Studio** — 30-day outline reference; Week 1 execution is ops cadence, not plan progress rows
- **Offline preview plans** — labeled `planPreviewMode`; not counted as shipped execution
- **Auto-post to social** — Lane B prepares; human posts

## Anti-patterns (never ship)

- Silent lifecycle loss on reload
- Duplicate Post Kit / outreach scripts after retry
- Ops status updated without kernel (bypass paths)
- Fake progress rows or invented KPIs

## Verification

```bash
cd desktop && npm run test:faz10-trust-engine && npm run test:shared
cd desktop && npm run test:e2e:execution-kernel
cd server && npm run eval:execution-kernel
```
