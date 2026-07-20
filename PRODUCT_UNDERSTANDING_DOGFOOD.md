# Product Understanding — Dogfood Protocol

Human gate for Part 6 **"no fabricated claims"** criterion. CI proves wiring; this proves founders can answer **"Why?"** in under 10 seconds.

## Pass bar

- **5 projects** (distinct product classes if possible)
- **≥4/5** sessions: zero unsourced `measured` claims in exported graph
- **≥4/5** sessions: founder finds evidence for thesis headline within 10s via Why panel

## Session script

1. Open local project folder (not URL-only).
2. Complete scan → intake thesis visible on Home/Reveal.
3. Expand **Why this thesis** on `CmoIntakeCard`.
4. Before strategic seal, review **Evidence before you seal**.
5. Export graph: Settings → Quality → Developer tools → copy `product_understanding` JSON (when exposed) or profile export.

## Log template

| Session | Class | unsourced measured claims | time-to-why (sec) | FAB blockers seen | Pass |
|---------|-------|---------------------------|-------------------|-------------------|------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

**Batch pass:** ___ / 5 (need ≥4)

## Failure triggers

- Thesis rationale with no linked evidence
- `measured` claim with empty `evidence[]`
- Competitor names without URL or user ref
- Brain decision citing `missing` dimension as fact

## Code anchors

- `auditClaimFabrication()` — automated gate
- `GOLDEN_JOURNEY_DOGFOOD.md` — timing companion (Part 5)
