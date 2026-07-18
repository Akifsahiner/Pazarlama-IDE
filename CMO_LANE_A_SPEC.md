# CMO Lane A — P6 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P6  
**Depends on:** P0 channel thesis (`lane_a[]`), P1 ops cadence (system tasks), edit run + apply pipeline

## Purpose

Lane A is where **the IDE ships** — landing copy, tracking events, SEO technical, research artifacts, and draft packs in the repo. Unlike Lane B (human posts) and Lane C (delegate briefs), Lane A runs through the **agent + worktree → apply** loop.

```
Thesis lane_a[] → LaneAWorkspace → resolveLaneARunPlan → edit / browse / scout → apply → ops auto-complete
```

Engine: `desktop/src/shared/cmoLaneA.ts`

## Execution modes

| Mode | When | Runtime |
|------|------|---------|
| `repo_edit` | Hero, tracking, SEO in repo | `runs.start` edit intent + skills |
| `browser_research` | Competitor / SERP / audit tasks | `runBrowserTask` |
| `content_draft` | Scripts, post grids, sequences | Edit run → `marketing/` drafts |
| `scout_then_edit` | Week 1 hero ship (first hour) | Scout ask → auto-handoff edit |

## Thesis skills

Each channel thesis maps to 2–3 SDK skills (installed in worktree `.claude/skills`):

- `landing_conversion` → `landing-page-conversion`, `analytics-measurement`
- `viral_short_form` → `short-form-video`, `launch-asset-generator`
- `seo_content` → `seo-content-engine`, `product-intelligence`
- `outbound_sales` → `lead-research`, `outreach-drafting`
- …see `THESIS_SKILLS` in `cmoLaneA.ts`

## Data model

Stored on `MarketingProfile.lane_a_workspace` (+ localStorage `lane_a_workspace.v1`).

| Field | Meaning |
|-------|---------|
| `items[]` | From `thesis.lane_a[]`, linked to system ops tasks by index |
| `linked_ops_task_id` | Ops task this item tracks |
| `linked_run_id` | Active agent run |
| `skills` | Skills passed to orchestrator |
| `proof` | Commit SHA + files applied on ship |

## Store wiring

| Action | Method |
|--------|--------|
| Start Week 1 / Week N | `createLaneAWorkspaceFromThesis` + `syncLaneAState` |
| Start system task | `startOpsSystemTask` → `resolveLaneARunPlan` → `startLaneARun` |
| Apply hook | `autoCompleteOpsOnApply` → `completeLaneAItemOnApply` |
| First system on Week 1 | `beginCmoWeek1` with `preferScout: true` |

## UX surfaces

| Surface | Component | When |
|---------|-----------|------|
| Workspace / Home | `LaneAPanel` (`lane-a-panel`) | `lane_a_workspace` active |
| Ops board | `CmoOpsBoard` Start in IDE | Delegates to `startOpsSystemTask` |
| NextActionBar | `run_ops_system_task` | Unlocked system ops task |

## Verification

```bash
cd desktop && npm run test:shared   # cmoLaneA.test.ts
cd desktop && npm run typecheck
npm run test:wow-checklist
node desktop/scripts/golden-path-smoke.mjs
```

## Feature gate (§12)

1. Right growth thesis skills — **yes** (per thesis map)  
2. Reduces ambiguity — **yes** (Lane A panel + mode labels)  
3. Lane A ship — **yes**  
4. Metric within 7 days — via linked ops user KPI tasks  
5. World-class CMO — repo ship before human distribution  
