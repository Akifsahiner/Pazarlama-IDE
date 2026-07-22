# Week 1 Golden Path — Developer dogfood setup

**Protocol:** [`golden-path-dogfood.md`](./golden-path-dogfood.md)  
**Facilitator sheet:** [`golden-path-dogfood-facilitator-sheet.md`](./golden-path-dogfood-facilitator-sheet.md)

Use this checklist **before** each founder session. Technical founders only — everyone should finish setup in one sitting.

---

## 1. Repo & branches

```bash
git clone https://github.com/Akifsahiner/Pazarlama-IDE.git
cd Pazarlama-IDE
git checkout main && git pull
```

Use **`main`** at or after Horizon 2 merge (`#16`).

---

## 2. Server (backend + LLM)

```bash
cd server
npm ci
cp .env.example .env
# Edit .env — minimum:
#   ANTHROPIC_API_KEY=sk-ant-...
#   DEV_NO_AUTH=1          # local dogfood without Supabase sign-in
#   PORT=8787
npm run dev
```

Health check: `curl http://127.0.0.1:8787/healthz` → `"ok": true`

**Computer Use (optional but recommended for Step 5):**

- Install Playwright browsers per [`server/README.md`](../../server/README.md)
- Without CU: verify step shows **Connect Computer Use** handoff — not false complete

---

## 3. Desktop app

```bash
cd desktop
npm ci
npm run dev
```

On first launch:

1. **Continue offline** or sign in (if not using `DEV_NO_AUTH`)
2. Settings → Connection → Server URL: `http://127.0.0.1:8787`
3. **Test connection** → green

Bundled “Start local stack” only appears in packaged builds — in dev you run server manually (step 2).

---

## 4. Test project (each session)

Prepare a **real** repo per founder:

| OK | Not OK |
|----|--------|
| Landing page or SaaS with `package.json` | Empty folder |
| npm install works | Secrets in repo |
| Optional: local dev URL for CU verify | Production-only deploy with no local preview |

Recommended: use the sample under `desktop/e2e/fixtures/sample-app/` or the founder’s own side project.

---

## 5. Track choice (Step 1 intake)

Two valid paths — pick one per session and **tell the founder**:

| Track | Flow | When to use |
|-------|------|-------------|
| **Full CMO** | Intake → seal → launch setup → Week 1 ops | Tests complete strategic path |
| **Quick start** | Ship first patch → seal banner → launch setup → Week 1 | Tests reveal → ship wedge |

Dogfood script assumes **full CMO** unless you explicitly run quick-start.

---

## 6. Hidden step: Launch setup (between seal & Week 1)

After **Seal strategic decision** (Step 2), founders must complete **Launch setup** (~2–6 min):

- Activation event label
- Measurement baseline ack (or soft-skip)
- Revenue thesis (only if 30-day win = paying customers)

Then **Start Week 1** → ops table + Execution Record command surface appear.

UI: `Launch readiness` banner on Execution Record after seal.

---

## 7. Golden path quick reference

| Step | Pass signal |
|------|-------------|
| 1 | Channel thesis visible |
| 2 | Seal done + launch setup complete |
| 3 | First system ops → diff in IDE |
| 4 | Run validation → Apply (gate or explicit override) |
| 5 | Verify pass OR clear CU-offline handoff |
| 6 | Human kit → URL/KPI proof |
| 7 | Quit app → reopen → ops/kernel/proof intact |
| 8 | Week 1 ops terminal |
| 9 | Start Week 2 — no mandatory essay |
| 10 | Exit score ≥4 target |

---

## 8. Facilitator rules

- **Silent after minute 5** — no “click here” unless blocked >10 min
- **Do not** navigate to Plan Studio during active ops week (B9)
- Screen record full session (Loom/OBS)
- File blockers: GitHub → **Dogfood blocker** issue template (B1–B9)

---

## 9. Reload test (Step 7)

After Step 6 proof is **submitted** (not mid-kit draft):

1. Quit desktop app completely
2. Reopen same project folder
3. Confirm: ops cadence tasks, execution kernel attempt/run_id, completed human proof

If data missing → tag **B7** on issue.

---

## 10. Exit rollup (after 3–5 sessions)

| Metric | Target |
|--------|--------|
| Founders scoring ≥4 | ≥3/5 |
| Steps 1–6 unaided | ≥4/5 |
| False complete (verify required) | 0/5 |
| Reload data loss | 0/5 |
| Median FST | <45 min |

**Horizon 1 dogfood PASS** → then consider Parts 21–28 and Part 20 commercial.

**Horizon 1 dogfood FAIL** → fix blockers before Part 20 or scope expansion.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| Apply button grey / stuck | Click **Run validation first** on diff footer |
| “Connect Computer Use” after apply | Settings → Connection; or accept CU-offline handoff |
| No ops table after seal | Complete launch setup → **Start Week 1** |
| Plan Studio keeps appearing | Ignore during Week 1 — use Execution Record primary CTA |
| Server 401 | Set `DEV_NO_AUTH=1` or sign in via Settings |

---

_Part 20 (commercial metrics) waits until this protocol PASS._
