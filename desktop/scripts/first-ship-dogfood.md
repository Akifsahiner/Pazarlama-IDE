# First Ship — 10-user dogfood script (Faz 1 exit)

## Goal

Median **First Ship Time (FST) < 45 min**, **apply rate ≥ 70%**, visible diff + preview URL at exit.

## Setup

1. Fresh project open (local folder with landing page).
2. Quick Start track (default).
3. Connected backend with agent enabled.

## Steps (facilitator silent unless blocked)

| Step | User action | Record |
|------|-------------|--------|
| 1 | Open project, wait for reveal | Time scan complete |
| 2 | Click **Ship first win** | Time CTA found |
| 3 | Wait for agent diff | Run success Y/N |
| 4 | Apply at least one file | Apply Y/N |
| 5 | Open preview / verify | Preview URL Y/N |
| 6 | Rate session 1–5 "would pay for this session?" | Score |

## Metrics

- **FST** = first apply timestamp − project open timestamp (from Settings → Execution debug in DEV, or manual stopwatch).
- **Apply rate** = users who applied ≥1 file / users who completed run with patches.

## Exit criteria

- Median FST < 45 min
- ≥ 7/10 applied
- ≥ 6/10 would pay ≥ 4

## Notes

- Do **not** use `e2eDryRunExecution` — real agent only.
- Full CMO intake is **after** first ship unless user chose Full CMO fork.
