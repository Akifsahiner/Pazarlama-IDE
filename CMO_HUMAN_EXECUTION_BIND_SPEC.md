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

`cmoHumanExecutionBind.ts`, `humanExecutionPlan.ts`, `store.ts` (`bindAndSyncHumanExecution`, `openHumanExecutionProof`), `cmoCommandSurface.ts`.
