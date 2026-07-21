# CMO Task Contract — P19 / Part 8

**Status:** Shipped in `desktop/src/shared/marketingTaskContract.ts`  
**North star:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) — zero ambiguity on what / why / how / proof.

**Not to be confused with P8 Distribution Operator** (`cmoDistributionOperator.ts`) — that is a channel operator. P19 is the **14-field ops task contract** binding all execution surfaces.

## Purpose

Replace generic 30-day plan ambiguity with **executable operational tasks**. Every task answers "what do I do today?" without chat follow-ups.

## Fourteen contract fields

| Field | Meaning |
|-------|---------|
| what | Action title |
| why | Strategic rationale |
| owner | system \| user \| delegate |
| when | day_offset + slot + due_at |
| estimated_effort_minutes | Time budget |
| inputs | Named refs (@hero, UTM, scripts) |
| deliverable | Exact output artifact |
| done_when | Acceptance gate |
| required_proof | live_url \| kpi \| note \| browser_evidence |
| metric | Structured KPI (measurable flag) |
| measure_date | When to log metric |
| if_failed | Pivot hint if gate missed |
| depends_on | Prior task ids |
| execution_mode | Unified mode → bind target |

## Rules

- Daily focus: max 3 priorities (`getFocusTasks(cadence, 3)`)
- Only one task in `now` slot
- System tasks: frozen `execution_plan` (Lane A)
- User tasks: frozen `human_execution_asset` with copy blocks
- Delegate tasks: full `brief_md`
- Non-measurable tasks excluded from week review pivot math

## Integration

| Consumer | Role |
|----------|------|
| `buildCmoIntake` | `enrichThesisWeek1Priorities` on template output |
| `buildMechanismWeek1Tasks` | `enrichMechanismWeek1Priority` |
| `createOpsCadenceFromThesis` | `materializeOpsTaskContract` |
| `bindHumanExecutionForCadence` | `freezeHumanExecutionAssets` |
| `cmoProofLoop` | structured metric + measurable filter |
| `CmoOpsBoard` | deliverable, copy blocks, effort |
| Server schema | full Zod mirror on `cmoOpsTaskSchema` |

## Eval exit criteria

- `assertTaskContractComplete` — 8 thesis + 14 mechanism templates pass
- `eval:task-contract` — incomplete rate ≤ 1%
- `cmoExecutionSurfaceCoverage.test.ts` — 100% bind, no primary user ops_modal
- Human tasks: `copy_blocks.length >= 1` after asset freeze

## Verification

```bash
cd desktop && npm run typecheck && npm run test:shared
cd server && npm run eval:task-contract
```
