# CMO Human Execution Bind (Faz 3)

**Goal:** Every user/delegate ops task has a frozen `human_execution_ref` pointing at the Lane B item, distribution slot, influencer touch, or delegate rubric that closes it with proof.

## Pipeline

```
bindAndSyncOpsCadence (Faz 2)
  → create operators + Lane B (operator-first)
  → bindHumanExecutionForCadence
      → patch CmoOpsTask.human_execution_ref
      → back-link linked_ops_task_id on Lane B / operator rows
```

## Types

- `HumanExecutionRef` — `source`, `item_id`, `proof_surface`, optional `export_kind`
- `CmoOpsTask.human_execution_ref` — set at cadence bind; survives UI navigation

## Proof closure

| Surface | User action | Ops closure |
|---------|-------------|-------------|
| `lane_b_modal` | `completeLaneBItem` | `completeOpsTask(linked_ops_task_id)` |
| `operator_modal` | distribution / influencer / delegate proof | same |
| `ops_modal` | `openOpsProofModal` | direct |
| `outreach_csv` | export from Lane B panel | user marks ops after export |

## Command surface

`resolveCommandSurfaceAction` routes today's user task via `human_execution_ref` → `lane_b_proof`, `operator_proof`, or `export`.

Governance `replan` → primary CTA `start_next_cycle` (never `none` dead-end).

## Dev strict

`bindHumanExecutionForCadence({ strict: true })` in DEV throws when user/delegate tasks lack refs.

## Code anchors

`cmoHumanExecutionBind.ts`, `humanExecutionPlan.ts`, `humanExecutionAsset.ts`, `buildHumanExecutionAsset.ts`, `store.ts` (`bindAndSyncHumanExecution`, `openHumanTaskKitDrawer`), `cmoCommandSurface.ts`.

## Faz 5 — Human Execution Asset (Post Kit)

At cadence bind, each user/delegate task with a `human_execution_ref` also receives a frozen `human_execution_asset`:

- **SSOT:** `buildHumanExecutionAsset()` runs once at bind via `resolveHumanExecutionAssetForTask()` — retries/replan do not regenerate copy if `item_id` unchanged.
- **Kinds:** `post_kit` | `outreach_pack` | `launch_runbook` | `delegate_rubric` | `distribution_slot`
- **Fields:** `copy_blocks[]`, `platform_checklist[]`, `success_criteria`, `platform_deep_links`, optional `honesty_note`, `hook_grid_count`, `kill_suggestion`
- **UI:** Primary CTA → `HumanTaskKitDrawer` (hero-level copy, not Backstage table rows)
- **Contract lint:** `humanExecutionContractLint.ts` blocks generic "post on social" done_when at bind time

## Progressive proof (Faz 5)

Human tasks close via URL-first proof, then optional KPI:

1. **Mark posted** — URL ≥ 8 chars (required)
2. **Log metrics** — KPI optional; `measure_deferred` supported
3. **Complete** — routes to `completeLaneBItem` / operator proof / `completeOpsTask`

KPI modal/drawer step 2 is blocked until posted URL passes `validatePostedUrl()`. See `humanProofProgress.ts` and `CMO_PROOF_LOOP_SPEC.md`.
