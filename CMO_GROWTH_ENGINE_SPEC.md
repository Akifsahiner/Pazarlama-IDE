# CMO Growth Engine (P17)

**Status:** Shipped in desktop `desktop/src/shared/`  
**North star:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md) §11 P17

## Purpose

P17 embeds **14 growth mechanism records** (deterministic knowledge, not LLM picks) so Marketing IDE selects the right growth physics per product and founder — not one Cluely-like default path.

Company names live in `calibration_sources` for tests/docs only. UI shows mechanism logic, honest rationale, and anti-patterns — never a case-study browser.

## Architecture

```
cmoGrowthMechanismKnowledge.ts  → 14 full records (hidden_system_chain, anti_patterns, week1 templates)
cmoGrowthEngine.ts              → assessGrowthMechanisms, mapMechanismToThesis, applyMechanismToChannelThesis
PublicPresencePolicy            → gates founder/character/creator assets before A/B/C
buildStrategicDecision          → Safe/Balanced/Attack = three different mechanisms
buildFinalChannelThesis         → materializes mechanism week1 tasks into channel thesis
beginCmoWeek1 / startNextCmoCycle → resolveMechanismOperatorFlags → P8/P9/Lane C modes
cmoGrowthPlane                  → mechanism anti-pattern red list + mechanism chip fields
cmoGrowthMemory                 → engine_signal harvest + engine_hints on replan
```

## Non-breaking rules

- **8 channel thesis IDs unchanged**
- No LLM mechanism selection or ROI math
- Mechanism intelligence changes **generated ops/lanes**, not a new product module
- Do not auto-post to social (Lane B prepare only)

## Intake flow

1. Founder fit wizard (P13)
2. **Public presence card** (P17) — who can represent the product publicly
3. Strategic A/B/C — each option carries `primary_mechanism_id`, rationale, anti-pattern
4. Seal → `buildFinalChannelThesis` applies mechanism week1 templates

## Mechanism IDs

`founder_narrative`, `brand_character`, `entertainment_ip`, `solution_ecosystem`, `remixable_artifacts`, `intent_to_product`, `partner_ecosystem`, `product_borne_distribution`, `customer_output`, `category_education`, `proprietary_data`, `release_ritual`, `community_demand`, `owned_culture_media`

## Verification

- `npm run test:shared` includes `cmoGrowthEngine.test.ts` (≥50 routing/materialization tests)
- `npm run typecheck` in `desktop/`

## Code anchors

| File | Role |
|------|------|
| `cmoGrowthMechanismKnowledge.ts` | Corpus |
| `cmoGrowthEngine.ts` | Brain |
| `cmoStrategicOptions.ts` | A/B/C mechanism wiring |
| `PublicPresenceCard.tsx` | Intake UI |
| `GrowthMechanismPanel.tsx` | Backstage rationale |
| `growthEnginePlaybookCatalog.ts` | Anonymized vertical programs |
