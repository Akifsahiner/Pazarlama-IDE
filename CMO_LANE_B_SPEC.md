# CMO Lane B — P3 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P3  
**Depends on:** P0 channel thesis (`lane_b[]`), P1 ops cadence, P2 KPI proof loop

## Purpose

Lane B is where **humans execute** — post, DM, launch day, community distribution. The IDE does not auto-post. It prepares the playbook and tracks accountability.

```
Channel thesis lane_b[] → LaneBWorkspace (mode-specific) → mark done + URL/note → ops KPI when ready
```

## Modes (thesis-driven)

| Mode | Theses | UI |
|------|--------|-----|
| `posting_calendar` | viral_short_form, founder_social | Day grid — posts + engage |
| `outreach_tracker` | outbound_sales, influencer_partnerships | Touch list with editable targets |
| `launch_runbook` | product_hunt_launch, community_launch | T-offset checklist (T-7 → H+2) |
| `distribution_log` | landing_conversion, seo_content | Community + traffic batches |

Engine: `desktop/src/shared/cmoLaneB.ts`

## Data model

Stored on `MarketingProfile.lane_b_workspace` (+ localStorage fallback).

| Field | Meaning |
|-------|---------|
| `items[]` | Executable Lane B steps from `lane_b` + week1 user task link |
| `linked_ops_task_id` | Final measure step → opens P2 ops KPI modal |
| `proof` | URL (optional) + note — lighter than ops KPI gate |
| `target_name` / `target_handle` | Outreach tracker editable fields |

## Accountability

`validateLaneBProof()` — requires **URL or note (8+ chars)**. No fabricated metrics.

Measure rows link to **P2 ops proof** via "Ops KPI" button (`linked_ops_task_id`).

## UX

| Surface | Component |
|---------|-----------|
| Workspace / Home | `LaneBPanel` below `CmoOpsBoard` |
| Mark done | `LaneBItemProofModal` |
| Next action | `complete_lane_b_item` when ops queue clear |

## Store

| Trigger | Action |
|---------|--------|
| `beginCmoWeek1` | `createLaneBWorkspaceFromThesis` + persist |
| Mark done | `completeLaneBItem` |
| Skip | `skipLaneBItem` |
| Outreach edit | `updateLaneBTarget` |

## Verification

```bash
cd desktop && npm run test:shared   # cmoLaneB.test.ts
cd desktop && npm run typecheck
```

## Follow-ups (P4+)

- Continuous replan: measuring → intake with delta — **done in P4**
- Week 2 Lane B from pivot acceptance — **done in P4**
- Export outreach CSV from tracker rows — **done in P5** (`cmoOutreachExport.ts`)
