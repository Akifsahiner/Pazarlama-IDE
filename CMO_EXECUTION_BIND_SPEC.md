# CMO Execution Bind — Faz 2

**Sibling specs:** [`CMO_OPS_SPEC.md`](CMO_OPS_SPEC.md), [`CMO_LANE_A_SPEC.md`](CMO_LANE_A_SPEC.md), [`CMO_COMMAND_SURFACE_SPEC.md`](CMO_COMMAND_SURFACE_SPEC.md)

## Principle

Every Week 1 **system** ops task must have a frozen `execution_plan` at cadence creation. Every **user** task gets an `expected_proof_kind` hint. No raw `startRun(task.what)` bypass for ops system tasks.

## Data model

On `CmoOpsTask` (`cmoOpsCadence.ts`):

```typescript
execution_plan?: {
  mode: LaneAExecutionMode;
  goal: string;
  skills: string[];
  mentions: Mention[];
  scout_prompt?: string;
  start_url?: string;
  lane_a_item_id?: string;
};
expected_proof_kind?: "live_url" | "kpi" | "note";
```

## Bind pipeline

1. `createOpsCadenceFromThesis` — `capWeek1Priorities` (max 5: 3 system + 2 user)
2. `createLaneAWorkspaceFromThesis` — link Lane A items by `linked_ops_task_id`
3. `bindExecutionPlansForCadence` — patch `execution_plan` on system tasks; infer proof kind on user tasks
4. Persist on `ops_cadence.tasks[]` (no separate LS key)

## Router

- `executeOpsSystemTask(taskId)` — reads bound `execution_plan` → `startLaneARun`
- `startOpsSystemTask` — E2E dry-run only; otherwise delegates to `executeOpsSystemTask`
- Command surface — `resolveCommandSurfaceAction` → run / submit proof / export / review

## Completion

| Mode | Trigger |
|------|---------|
| `repo_edit` / `content_draft` | Apply → `tryAutoCompleteSystemTask` |
| `browser_research` | Browse `run.completed` → `autoCompleteBrowserResearchOps` |
| `scout_then_edit` | Edit apply only (scout ask does not complete) |

## Week 1 scope

- `WEEK1_MAX_TASKS = 5`, `WEEK1_MAX_SYSTEM = 3`, `WEEK1_MAX_USER = 2`
- Intake templates may define more; `capWeek1Priorities` drops excess in order

## Exit criteria (Faz 2)

| Criterion | Test |
|-----------|------|
| 100% system binding | `cmoExecutionBind.test.ts` all theses |
| No bypass starts | Grep store: no `startRun(firstSystem.what)` for ops |
| User proof URLs | `ops-proof-asset-link` chip + modal gate |
| Command surface CTA | `resolveCommandSurfaceAction` never `none` when move exists |
| Prod E2E | `@cmo-prod` with `e2eDryRunExecution: false` |
