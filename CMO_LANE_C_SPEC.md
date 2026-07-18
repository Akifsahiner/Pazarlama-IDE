# CMO Lane C — P5 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §8 (Lane C column) · §11 P5  
**Depends on:** P0 thesis, P1 ops, P3 Lane B (outreach tracker), P4 cycle restart

## Purpose

**Lane C** is where work is **delegated** — SDR, VA, writer, creator, agency. The IDE prepares briefs and tracks delivery; it does not impersonate the delegate.

```
Channel matrix Lane C → CmoDelegateWorkspace → handoff markdown + assignee → proof on delivery
```

Engine: `desktop/src/shared/cmoLaneC.ts`  
**P10 scale features:** [`CMO_DELEGATE_OPERATOR_SPEC.md`](CMO_DELEGATE_OPERATOR_SPEC.md)

## Thesis coverage

| Thesis | Delegate roles |
|--------|----------------|
| `outbound_sales` | VA list enrichment + SDR send batch |
| `influencer_partnerships` | VA creator research + agency DM wave |
| `seo_content` | Writer publish pillar |
| `viral_short_form` | Creator film hook variants |
| `founder_social` | VA schedule posts |
| `product_hunt_launch` | VA supporter list |

Theses without Lane C (`landing_conversion`, `community_launch`) return `null` workspace.

## Data model

`MarketingProfile.lane_c_workspace` (+ `localStorage lane_c_workspace.v1`).

| Field | Meaning |
|-------|---------|
| `briefs[]` | Role-specific deliverables with acceptance criteria |
| `assignee_name` / `assignee_contact` | Set on handoff |
| `handed_off_at` | Accountability timestamp |
| `proof` | URL or note on delivery |
| `linked_lane_b_mode` | Links brief to outreach CSV export |

## Handoff flow

1. **Draft** — brief visible in `DelegatePanel`
2. **Hand off** — assignee + optional note → `handed_off` + markdown copied
3. **Mark delivered** — proof URL/note → `done`

`buildDelegateHandoffMarkdown()` — paste into Slack/email/Notion for contractor.

## P5 additions (same release)

### Outreach CSV export

`desktop/src/shared/cmoOutreachExport.ts`

- `outreachTrackerToCsv()` — Lane B touch rows → CSV
- Export button on `LaneBPanel` when `mode === outreach_tracker"`
- Filename: `outreach-{project}-w{N}-{date}.csv`

### GA4 auto-sync on cycle start

`desktop/src/shared/cmoMeasurement.ts`

- `planGa4SyncOnCycleStart()` — honest skip when not connected
- `beginCmoWeek1` + `startNextCmoCycle` call `maybeSyncGa4OnCycleStart(weekIndex)`

## UX

| Surface | Component |
|---------|-----------|
| Workspace / Home | `DelegatePanel` below Lane B |
| Handoff / proof | `DelegateBriefModal` |
| Outreach export | `LaneBPanel` Export CSV button |
| Next action | `open_delegate_brief` when brief pending |

## Store

| Trigger | Action |
|---------|--------|
| `beginCmoWeek1` | `createDelegateWorkspaceFromThesis` + `maybeSyncGa4OnCycleStart(1)` |
| `startNextCmoCycle` | New delegate workspace + GA4 sync Week N |
| Hand off | `handOffDelegateBrief` |
| Delivered | `completeDelegateBrief` |

## Verification

```bash
cd desktop && npm run test:shared   # cmoLaneC.test.ts
cd desktop && npm run typecheck
node desktop/scripts/golden-path-smoke.mjs
cd server && npm run build
```

## Accountability

- No auto-posting, no fake delegate completion
- Handoff requires assignee name (2+ chars)
- Delivery requires URL or 8+ char note — same honesty bar as Lane B
