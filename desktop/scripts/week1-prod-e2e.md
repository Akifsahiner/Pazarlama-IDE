# Week 1 production agent E2E

Nightly / manual dogfood for Faz 2 exit criteria.

## Prerequisites

- Built desktop app (`npm run build` in `desktop/`)
- Connected backend with valid `ANTHROPIC_API_KEY` on server
- `MARKETING_IDE_AGENT_SMOKE=1`

## Run

```bash
cd desktop
npm run build
set MARKETING_IDE_AGENT_SMOKE=1
npm run test:e2e:cmo-prod
```

## What it validates

- `e2eDryRunExecution: false` — no fake ops completion
- 100% system tasks have `execution_plan` at Week 1 start
- `completeOpsCadenceWithAgent` drives command surface + apply + proof modals
- Week review closes the loop

## CI

Nightly job in `.github/workflows/desktop-ci.yml` (`desktop-cmo-prod-nightly`).
