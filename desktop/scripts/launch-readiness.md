# Marketing IDE — GTM Launch Readiness (Senior+)

Use before shipping installer or case study. All items should be green.

## Gen 0 — Trust
- [ ] Cold start splash: phased init + 8s timeout + Retry
- [ ] `npm run dev:clean` clears ports 5173/5174/8799/8787
- [ ] **Real scan progress** — IPC events every ~2s during folder scan (not fake pct)

## Gen 1–2 — GTM brain
- [ ] `npm run eval:gtm` — golden + behavioral (80+ asserts) pass
- [ ] Router returns `gtm_bottleneck` + `primary_playbook_id`
- [ ] Decision includes `tactic_you_may_not_know` + `channel_priority`
- [ ] Plan outline persists `primaryBottleneck` / `primaryPlaybookId`
- [ ] Readiness gaps show **named tactic** (not just playbook id)

## Gen 3–4 — Execution
- [ ] Plan tasks have `instructions_md`, `tactic`, `execution_mode`
- [ ] Browser task on playbook injects CU template via `resolveBrowserGoal`
- [ ] Browser findings → Session Launch Report (`kind: research`)
- [ ] Run canvas Browser tab when CU active

## Gen 5–6 — Measurement
- [ ] Command center: manual KPI fills Signups/Spend/CPA (logged badge) — not fabricated
- [ ] Reach + conversion sections + channel table with real manual actuals
- [ ] Session report: “This session…” + **Next up** deep link
- [ ] Performance surface: manual KPI rows + GA4 connect CTA (connector disclaimer)
- [ ] Sales export: CSV + outreach pack + optional webhook dispatch

## 60s demo script (case study)
1. Open Cursor-built project — **watch scan progress bar**
2. Generate plan — hero shows **primary bottleneck playbook**
3. Readiness gap → named tactic (e.g. referral waitlist loop)
4. Run waitlist Day 2 task — diff in repo
5. Browser CU teardown — Operator filmstrip + finding in report
6. Command center → copy Session Launch Report with Sıradaki

## Commands
```powershell
cd desktop
npm run dev:clean
npm run dev
```

```powershell
cd server
npm run eval:gtm
npm run build
```

```powershell
cd desktop
npm run typecheck
```
