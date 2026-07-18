# CMO Growth Memory (P11)

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P11  
**Depends on:** P2 proof loop, P4 continuous CMO, P7 control plane, P8/P9 operators, P10 delegation

## Purpose

Carry experiment and message truth across campaign weeks. P11 replaces the prior “replay Week 1 templates” behavior with a deterministic memory loop:

```
execute → prove → harvest → classify → preview Week N+1 → user starts → apply memory
```

No proof means `unscored`; the engine never invents a winner.

P14 adds money memory as `budget_bucket` experiments. Spend/CPA records always have
`message_ids: []`, so budget evidence cannot classify a hook, pitch, or post as a winner.

## Persistence

Engine: `desktop/src/shared/cmoGrowthMemory.ts`  
Profile: `MarketingProfile.growth_memory`  
Local fallback: `growth_memory.v1.{projectId}`

Legacy `previous_experiments` migrate into the cycle-linked ledger without deleting the old field.

## Ledger contracts

| Record | Purpose |
|--------|---------|
| `GrowthMessageRecord` | Hook, pitch, opener, post copy, or ops note with evidence |
| `GrowthExperimentRecord` | Cycle/source-linked hypothesis, metric, outcome, learning |
| `GrowthReplanRecommendation` | Mode, ops mutations, winner/loser IDs, operator hints |

Harvest is idempotent by stable cycle/source IDs.

## Deterministic classification

| Message | Winner | Loser |
|---------|--------|-------|
| P8 hook | 2+ posts meet retention target | all measured posts below 45% 3s retention |
| P9 pitch | 2+ warm/hot replies | 5+ sends and zero replies |
| Lane B / ops | KPI ≥50% target or positive numeric signal | KPI <20% target or explicit zero result |
| Missing sample | never | never; remains neutral/unscored |

## Week N+1 replan

`buildReplanPreview` runs when a week closes. It stores a human-reviewable preview:

- winner + KPI ≥50% → `double_down`
- repeated loser pattern or flat KPI → `pivot`
- winning hook/pitch IDs flow into P8/P9 constructors
- ops priorities and Lane B copy are rewritten from evidence

`startNextCmoCycle` remains a user action. It applies `pending_replan` in one click; P11 does not silently start a campaign week.

## UI

- `GrowthMemoryPanel` (`growth-memory-panel`) — winners, losers, experiment ledger
- `ReplanPreviewCard` (`replan-preview-card`) — exact next-week ops changes
- `GrowthMessageChip` (`growth-message-chip`) — P8/P9 message verdicts
- P7 strip — latest remembered winner

## Honesty and boundaries

- No runtime LLM classification
- No statistical significance claims
- No auto-posting or CRM writes
- No cross-project memory
- No winner without measured evidence
- No CPA without logged spend and attributed outcomes
- No budget reallocation without a visible preview and user-started next cycle

## Verification

`desktop/src/shared/cmoGrowthMemory.test.ts` covers harvest, thresholds, idempotency, legacy migration, replan, operator hints, Lane B mutation, and KPI rollup.
