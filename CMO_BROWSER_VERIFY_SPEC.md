# CMO Browser Verify — Faz 4 Spec

**Parent:** [`PRODUCT_NORTH_STAR.md`](PRODUCT_NORTH_STAR.md)  
**Depends on:** [`CMO_EXECUTION_BIND_SPEC.md`](CMO_EXECUTION_BIND_SPEC.md), apply + ship pipeline

## Purpose

Close the **ship → see live** loop:

```
applyRunChanges → preview.ready → startVerifyAfterApply → Computer Use checklist
  → VALIDATION lines → browser_evidence on ops proof → verify.completed ship stage
```

A world-class CMO does not mark “hero shipped” without seeing the live CTA.

## Verify contract

### Checklist

`buildVerifyChecklistFromTask(task, thesis)` derives items from `done_when` + thesis:

- Hero CTA visible
- Page title updated
- Tracking snippet present
- Primary page loads without error

### CU prompt footer

Server browser session requires lines:

```
VALIDATION: <label> | pass|fail | <detail>
```

Parsed by `parseValidation()` → `RunReport.validations[]`.

### Pass rate

`verifyPassRate(result)` — default gate **100%** for auto-close system ops.

## Apply trigger

**Universal** (not quick-ship only): after full apply when `capabilityMatrix.canBrowse && previewUrl`:

1. `scheduleVerifyAfterApply` — debounce 10 min per URL
2. `startVerifyAfterApply` — orchestrator `verify` intent → `browser.verify_checklist`

When CU unavailable: feed gate + handoff “Connect Computer Use to verify live”.

## Evidence bridge

`CmoOpsProof.browser_evidence`:

```ts
{ run_id, url, screenshot_path?, validations[], findings?, verified_at }
```

Screenshot: `userData/evidence/{projectId}/{runId}.png` via `IPC.evidence.saveScreenshot`.

`attachBrowserEvidenceToSystemTask()` auto-closes system task when pass threshold met.

System tasks with `expected_proof_kind: "browser_evidence"` defer `tryAutoCompleteSystemTask` until verify completes.

## Ship pipeline

| Event | Stage |
|-------|-------|
| `verify.completed` | `done` |
| `verify.failed` | `failed` + `buildShipRecovery("verify_failed")` |

## Mid-run verify (Week 3)

Edit agent may call `browser_verify` connector (read_inspect scope) → same orchestrator path, events on RunEvent bus.

## Exit criteria

- Fixture matrix ≥80% pass (`verify-fixture-smoke.mjs`)
- E2E `@browser-verify` — mock validations → ops proof chip + ship pipeline done

## Code anchors

| Module | Path |
|--------|------|
| Checklist + parse | `desktop/src/shared/browserVerify.ts` |
| Server parse | `server/src/browser/actions.ts`, `session.ts` |
| Orchestrator | `desktop/src/main/orchestration/orchestrator.ts` |
| Store wiring | `desktop/src/renderer/state/store.ts` |
| Evidence store | `desktop/src/main/evidence/storeEvidence.ts` |
| UI chips | `desktop/src/renderer/features/workspace/CmoOpsBoard.tsx` |
