# CMO Command Surface — P12

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P12  
**Depends on:** P1 ops cadence, P4 continuous CMO, P7 growth plane, P8–P10 operators, P11 memory

## Purpose

P12 turns the P7 command strip into the default CMO operating screen:

```text
growth truth → Darboğaz + Bugün + Neden + Done when → one action
                                         ↓
                              backstage on demand
```

The primary surface answers four questions without opening a panel. Ops, Lane A/B/C,
operator grids, memory, cycle history, and red-list evidence remain available in one
collapsed backstage region.

## Deterministic contract

Engine: `desktop/src/shared/cmoCommandSurface.ts`

| Field | Source |
|-------|--------|
| Darboğaz | `GrowthControlPlane.binding.headline` |
| Bugün | `GrowthControlPlane.today.what` |
| Neden | linked ops `why` → operator context → binding rationale → primary lever |
| Done when | `GrowthControlPlane.today.done_when` |

`GrowthTodayMove.why` is persisted for new planes. Legacy profiles may omit it; desktop
hydration supplies a safe rationale and the normal profile-load recompute rebuilds the
current move.

No LLM is used to invent rationale. No missing metric is converted into fake evidence.

## Surface ownership

`isCommandSurfaceOwnedAction` prevents `NextActionBar` from duplicating:

- ops user/system tasks
- week review, pivot, and next-cycle actions
- Lane B and Lane C daily work

Blocking non-CMO actions still win: pending apply, run/browser approval, plan work, and
active execution recovery.

## Governance

`resolveCommandSurfaceGovernance` returns at most one compact state:

1. evidence-backed replan
2. due week review
3. post-review pivot
4. measuring

Full cycle detail stays in backstage. The banner opens the existing review, replan, or
cycle action; it does not auto-start a week or auto-pivot a thesis.

## Backstage

Component: `desktop/src/renderer/features/workspace/CmoBackstage.tsx`

Order:

1. Ops
2. red list
3. Lane A ship work
4. active P8/P9 operator
5. Lane B when no operator is source of truth
6. P10 delegate operator
7. growth memory
8. continuous cycle

Existing anchor IDs are preserved so current `NextActionBar` dispatches and deep links
continue to work.

## UX surfaces

| Surface | Behavior |
|---------|----------|
| Workspace | Compact four-field command surface above canvas |
| Home | Same four fields and governance policy |
| Backstage | Closed at week start, cycle start, and project open |
| No current move | Grouped backstage fallback; no empty command card |

Runtime-only surfaces (`IntentStrip`, execution queue, pending apply) remain outside the
CMO backstage because they represent active execution, not planning clutter.

## Verification

```bash
cd desktop && npm run test:shared
cd desktop && npm run typecheck
cd desktop && npm run test:wow-checklist
node desktop/scripts/golden-path-smoke.mjs
cd server && npm run build
```

## Non-goals

- Auto-posting or auto-DM
- Runtime LLM rationale
- New navigation or drawer framework
- Hiding execution approvals
