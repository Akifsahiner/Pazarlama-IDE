# WOW + GTM Senior+ Manual Checklist (v2 — Design Overhaul)

**Canonical strategy:** [`PRODUCT_NORTH_STAR.md`](../../PRODUCT_NORTH_STAR.md) — Software CMO; specs include P0 [`CMO_INTAKE_SPEC.md`](../../CMO_INTAKE_SPEC.md), P14 [`CMO_BUDGET_PLANE_SPEC.md`](../../CMO_BUDGET_PLANE_SPEC.md), P15 [`CMO_PRODUCT_LOOP_SPEC.md`](../../CMO_PRODUCT_LOOP_SPEC.md), and P16 [`CMO_REVENUE_PLANE_SPEC.md`](../../CMO_REVENUE_PLANE_SPEC.md).

Run after Plan Studio / GTM brain / design-system changes.

## First 60 Minutes Wedge (Faz 1)
- [ ] **Reveal primary CTA** `reveal-ship-first-win` before `firstShipAt`
- [ ] **QuickStartForkCard** — quick_start vs full_cmo (`quick-start-choose`)
- [ ] **ThesisChip** one-liner (draft intake only — no Week 1 table pre-ship)
- [ ] **beginQuickStartShip** → direct edit, max 2 skills (`FIRST_SHIP_SKILLS`)
- [ ] **ShipPipelineBar** visible during wedge run (`ship-pipeline-bar`)
- [ ] **Apply prominence** — `ship-apply-primary` on Run/Preview canvas
- [ ] **Auto preview** after apply when quick ship path
- [ ] **ShipWinCard** before/after + `home-today-shipped`
- [ ] **NO_PATCHES** recovery card when agent returns zero diffs
- [ ] **Command surface** pre-ship override `command-surface-ship-first-win`
- [ ] **Execution debug** (dev Settings) shows FST / apply rate rollup

## CMO Intake (P0)
- [ ] **openProject** runs `buildCmoIntake` — `channel_thesis` on profile
- [ ] **Reveal** shows CMO beat + thesis card before moves
- [ ] **Primary CTA** "Start Week 1" → `beginCmoWeek1` (campaign + first system run)
- [ ] **Cluely-like readme** → `viral_short_form` thesis (unit test)
- [ ] **B2B prelaunch** → `founder_social`; **sales** → `outbound_sales`
- [ ] **Home** shows CmoIntakeCard when thesis exists and no plan yet
- [ ] **week1_priorities** have stable ids (`{thesis}.w1.{n}`)

## CMO Ops Cadence (P1)
- [ ] **Start Week 1** creates `ops_cadence` on profile + localStorage
- [ ] **Workspace** shows `CmoOpsBoard` war-room table (owner / done gate / status)
- [ ] **System task** auto-completes on apply (`tryAutoCompleteSystemTask`)
- [ ] **User task** cannot close without URL/metric/note (`OpsTaskProofModal`)
- [ ] **NextActionBar** shows "Your move" for unlocked user task
- [ ] **Handoff banner** surfaces user task after system task ships
- [ ] **Week review** due after 7 days with summary capture

## CMO Proof Loop (P2)
- [ ] **User task** cannot close without numeric `kpi_value` in proof modal
- [ ] **KPI upsert** on confirm → `manual_kpis` on profile
- [ ] **Pull GA4** in proof modal when gate supports it
- [ ] **Week review** blocked until all done user tasks have KPI proof
- [ ] **Flat metrics** → `pivot_suggestion` on `ops_cadence` + `CmoPivotCard`
- [ ] **Campaign** advances to `measuring` on week review / all ops done

## CMO Lane B (P3)
- [ ] **Start Week 1** creates `lane_b_workspace` from thesis `lane_b`
- [ ] **Mode** matches thesis: posting / outreach / runbook / distribution
- [ ] **LaneBPanel** below ops board in Workspace + Home
- [ ] **Outreach tracker** — editable target name/handle per touch
- [ ] **Launch runbook** — T-offset steps (T-7, T-0, H+2)
- [ ] **Mark done** requires URL or note (Lane B proof modal)
- [ ] **Ops KPI** button on measure rows links to P2 proof modal
- [ ] **NextActionBar** surfaces next Lane B item when ops queue clear

## CMO Continuous (P4)
- [ ] **Week review** archives cycle → `cmo_continuous.cycles[]` + phase `measuring` / `pivot_ready`
- [ ] **CmoCyclePanel** shows cycle history + intake delta on Home / Workspace
- [ ] **CmoPivotCard** — "Start Week N" pivot + "Double down" (not generic re-intake only)
- [ ] **startNextCmoCycle** spawns Week N+1 ops + Lane B with `prior_ops_cadence_id`
- [ ] **buildCmoIntake** respects `force_thesis_id` + `cycle_index` for delta context
- [ ] **Campaign** `cmo_cycle_restart` → back to `executing` with Week N milestone
- [ ] **NextActionBar** `start_next_cmo_cycle` when measuring + week review complete
- [ ] **Active campaign** measuring CTA starts next week when replan ready

## CMO Lane C + hooks (P5)
- [ ] **Start Week 1 / Week N** creates `lane_c_workspace` for delegate theses (outbound, influencer, etc.)
- [ ] **DelegatePanel** below Lane B — hand off + mark delivered
- [ ] **DelegateBriefModal** — assignee required, markdown copied on handoff
- [ ] **Lane B outreach** — Export CSV button (`outreach-export-csv`) with touch rows
- [ ] **GA4 auto-sync** on `beginCmoWeek1` / `startNextCmoCycle` when OAuth connected
- [ ] **NextActionBar** surfaces Lane C brief when ops queue clear
- [ ] **Honest skip** — GA4 not connected → manual KPI message, no fake metrics

## Browser Verify (Faz 4)
- [ ] **Universal apply → verify** — `scheduleVerifyAfterApply` after full apply
- [ ] **browser_evidence** on system ops proof with validation chips
- [ ] **Ship pipeline** — `verify.completed` / `verify.failed` stages
- [ ] **Fix handoff** — failed verify → enriched edit goal

## Measurement Compulsion (Faz 5)
- [ ] **MeasurementBaselineCard** — GA4 / manual / ack paths
- [ ] **Week review KPI panel** — GA4 sync-on-open + source transparency
- [ ] **Pivot gate** — no thesis pivot without logged numeric KPI
- [ ] **MEASUREMENT_GATE_HARD** — optional hard Week 1 block

## CMO Delegation Operator (P10)
- [ ] **buildDelegateOperator** — hire blocks + lane links per thesis brief
- [ ] **DelegateOperatorPanel** — rubric day grid + lane link status
- [ ] **Daily rubric** — checklist + proof note/URL; partial vs done thresholds
- [ ] **evaluateDelegatePerformance** — promote / extend / release rules
- [ ] **GrowthCommandSurface** — rubric summary chip + Start move opens rubric proof
- [ ] **importDelegateDelivery** — outbound / influencer / distribution import paths
- [ ] **No auto-delegate** — human contractor executes; IDE tracks accountability

## CMO Growth Memory (P11)
- [ ] **harvestMemoryFromCycle** — ops/Lane B/P8/P9/delegate proof enters an idempotent ledger
- [ ] **Message verdicts** — hooks and pitches show winner / loser / neutral from measured evidence
- [ ] **GrowthMemoryPanel** — current-cycle winners, losers, and experiment history
- [ ] **ReplanPreviewCard** — exact Week N+1 priorities shown before the user starts
- [ ] **buildReplanPreview** — winner + KPI doubles down; repeated loser / flat KPI pivots
- [ ] **Memory apply** — ops, Lane B, and P8/P9 operator hints carry into Week N+1
- [ ] **Honest memory** — missing proof stays unscored; no silent auto-start

## CMO Command Surface (P12)
- [ ] **Four fields visible** — Darboğaz / Bugün / Neden / Done when without opening a panel
- [ ] **One daily CTA** — dispatches the active ops, P8, P9, or P10 proof flow
- [ ] **Backstage collapsed** — Ops + Lane A/B/C + Memory + Cycle hidden until "War room — full week plan"
- [ ] **Governance banner** — at most one review / measuring / pivot / replan state
- [ ] **NextActionBar de-dupe** — CMO-owned actions hidden; apply and approval blockers remain visible
- [ ] **Home / Workspace parity** — same model, operator gates, and backstage order
- [ ] **Honest why** — linked task or operator rationale; deterministic fallback, no LLM invention

## Execution Record Center (Part 0)
- [ ] **Record always center** — Workspace opens to `execution-record-stage`, not empty canvas
- [ ] **Bottleneck sentence** — single line `Darboğaz X → sıradaki hareket Y` above the card
- [ ] **Seven fields** — Amaç, Deney, Durum, Yapılan, Sonuç, Öğrenilen, Sonraki on the hero card
- [ ] **Honest empty KPI** — "Henüz ölçülmedi" / "Ölçüm bekleniyor"; no fabricated rows
- [ ] **Primary CTA on card** — Record hero dispatches command-surface action; no duplicate strip
- [ ] **Detail panel** — Diff / Browser / Kanıt tabs embed run/browser/proof views
- [ ] **Chat command role** — Agent panel subtitle + composer steer copy; lifecycle rail not in chat
- [ ] **Turn receipt chip** — "Record güncellendi · Yapılan → diff" links to detail tab
- [ ] **History timeline** — closed ops tasks in experiment language (not Runs archive wording)
- [ ] **Backstage overlay** — war room opens on demand from Record footer; default collapsed
- [ ] **Golden path** — reveal → run → apply updates Yapılan + diff tab; next task on Record

## Faz 3 — Morning Brief (Daily Ritual)
- [ ] **Morning brief grid** — `morning-brief-grid` shows Bottleneck / Today / Why / Done when on Execution Record
- [ ] **Day header meta** — `Day N · mechanism · ~Xm total · owner breakdown` in hero header
- [ ] **Effort budget** — max 3 focus tasks; owner breakdown (`2 IDE · 1 you`)
- [ ] **Single CTA** — NextActionBar hidden on workspace when command surface active (blocking actions excepted)
- [ ] **No duplicate CTA** — detail panel empty diff does not repeat primary button
- [ ] **Day unlock toast** — first open each calendar day: `Day N unlocked — [today]`
- [ ] **War room rename** — "War room — full week plan" (not Backstage)
- [ ] **Day 1 auto-expand** — war room opens once when Week 1 begins
- [ ] **Governance guard** — week review / pivot / product loop blocks ops dispatch until resolved
- [ ] **Footer chips** — pending ops / prepared / product P0 / operator / mechanism in `morning-brief-footer`
- [ ] **E2E @morning-brief** — record grid + CTA visible within 10s of card mount

## Faz 4 — Profesyonel Ship (Lane A Excellence)
- [ ] **Ship receipt SSOT** — Apply → `lastShipReceipt` populates Record chips (commit, files, lines, live URL)
- [ ] **Done-when checklist** — `done-when-checklist` on Diff tab with apply/verify status
- [ ] **Browser verify gate** — system tasks with live/URL done_when blocked until verify passes
- [ ] **Approval clarity** — `approval-hero-line` + pipeline `approval` stage
- [ ] **Quality lint** — CTA warn, SEO block on landing_conversion, tracking warn
- [ ] **P15 pause hero** — `product-loop-pause-banner` on Record when marketing paused
- [ ] **Proof tab receipt** — `proof-detail-view` shows commit, before/after, browser checks
- [ ] **Eval ship-receipt-matrix** — 8 thesis × apply → receipt, 0 fail
- [ ] **E2E @ship-receipt** — record + detail panel visible after Week 1 start

## CMO Founder-Fit + Strategic Options (P13)
- [ ] **Exactly 7 questions** — one FounderFitWizard question per step, no long-form intake
- [ ] **Founder-fit eligibility** — camera, risk, time, budget, and scale constraints change recommendation
- [ ] **Narrative layer** — cultural tension → one-liner → proof angle
- [ ] **A/B/C options** — safe / balanced / category attack with explicit tradeoffs
- [ ] **Honest 30-day target** — measured / assumption / stretch; missing baseline has no invented number
- [ ] **From me / from you contract** — selected option makes both sides' commitments explicit
- [ ] **Single seal gate** — beginCmoWeek1 blocked before Yes; advice disappears after seal
- [ ] **Narrative inheritance** — Lane A/B, distribution hooks, influencer pitches, and command why share the story

## CMO Budget Plane (P14)
- [ ] **Monthly boundary** — numeric USD input or visibly labeled band assumption
- [ ] **Deterministic allocation** — thesis buckets sum to 100%; rounding remainder goes to reserve
- [ ] **Estimate ≠ actual** — Lane B/C/operator UI never reports estimates as spend
- [ ] **Honest CPA** — CPA appears only with logged spend and attributed outcomes
- [ ] **Week-close truth** — allocated / spent / outcomes / CPA table archives on the cycle
- [ ] **Money memory isolation** — budget experiments never enter hook/pitch winner classification
- [ ] **Human reallocation gate** — budget mutations are previewed and apply only on next-cycle start

## CMO Product Loop / Lane D (P15)
- [ ] **Activation gate** — event, activation rate, and TTFV inputs retain measured / assumption / missing confidence
- [ ] **Product binding** — scale-not-ready, activation evidence, or onboarding gaps create Lane D instead of marketing tactics
- [ ] **P0 contract** — every PRODUCT REQUEST has acceptance criteria, growth impact, scope, pause state, and proof
- [ ] **Site/core split** — site fixes run through Lane A; core changes export issue markdown and require issue/PR URL
- [ ] **Explicit pause** — command surface says marketing paused; Lane B and distribution/influencer/delegate operators stay hidden
- [ ] **Week-close gate** — all P0s shipped or explicitly skipped; activation KPI is optional when not yet measurable
- [ ] **Memory isolation** — `product_fix` experiments have no message IDs and cannot produce hook/pitch winners
- [ ] **Human resume** — marketing resumes only after terminal P0s and an explicit founder action

## CMO Revenue Plane (P16)
- [ ] **Revenue intake** — `RevenueSetupCard` after product activation; `beginCmoWeek1` blocked without `revenue_profile`
- [ ] **Pricing thesis** — deterministic model + confidence; scan gaps for pricing/checkout/billing/events
- [ ] **Focus not pause** — revenue binding creates monetization P0s; marketing is **not** blanket-paused (unlike P15)
- [ ] **Honest funnel** — conversion rates only when both stage counts are measured
- [ ] **Honest CAC/LTV** — CAC and LTV:CAC only with logged spend + measured outcomes
- [ ] **Week-close truth** — `revenue_snapshot` archives on cycle; paying-customer nudge in week review
- [ ] **Revenue memory isolation** — `revenue_signal` experiments have no message IDs
- [ ] **Paid-scale guard** — red list blocks paid ads when checkout missing and spend is active

## CMO Growth Mechanism Intelligence (P17)
- [ ] **Public presence card** — after founder fit, before A/B/C; toggles who can represent the product
- [ ] **Mechanism-driven A/B/C** — Safe/Balanced/Attack map to different mechanisms, not thesis alone
- [ ] **Mechanism week1 diversity** — `applyMechanismToChannelThesis` replaces generic priorities with corpus templates
- [ ] **Anti-pattern red list** — growth plane rejects superficial copies (mascot dances, empty Discord, etc.)
- [ ] **Command surface chip** — mechanism label + honest why-string on daily surface
- [ ] **Operator flags** — distribution/influencer/delegate/character_mode from sealed mechanism
- [ ] **Engine memory** — `engine_signal` experiments harvested on week close; `engine_hints` on replan preview
- [ ] **No case-study browser** — company names stay in corpus calibration metadata only

## CMO Lane A (P6)
- [ ] **Start Week 1 / Week N** creates `lane_a_workspace` from thesis `lane_a[]`
- [ ] **bindExecutionPlansForCadence** — 100% system tasks get frozen `execution_plan` at cadence create
- [ ] **executeOpsSystemTask** — no raw `startRun(task.what)` bypass for ops system tasks
- [ ] **Week 1 cap** — max 5 tasks (3 system + 2 user) via `capWeek1Priorities`
- [ ] **resolveCommandSurfaceAction** — primary CTA is Start in IDE / Submit proof / export (never dead)
- [ ] **User proof chip** — `ops-proof-asset-link` on ops board after live URL proof
- [ ] **week1FocusMode** — command surface + canvas default; backstage collapsed until opened
- [ ] **@cmo-prod E2E** — nightly agent smoke with `e2eDryRunExecution: false`
- [ ] **resolveLaneARunPlan** — thesis skills + hero mentions + execution mode
- [ ] **startLaneARun** — scout→edit, browser research, or edit with skills
- [ ] **LaneAPanel** above Lane B — Start in IDE + ship proof (commit)
- [ ] **Apply** auto-completes linked system ops task + Lane A item
- [ ] **beginCmoWeek1** first system task uses scout when hero exists

## CMO Growth Control Plane (P7)
- [ ] **buildGrowthControlPlane** — equation, binding, red list, thesis alignment (deterministic)
- [ ] **GrowthCommandSurface** — P12 renders Darboğaz / Bugün / Neden / Done when
- [ ] **Backstage collapsed** — Ops + Lane A/B/C hidden until explicitly opened
- [ ] **Cycle governance** — compact banner on surface; full panel in backstage
- [ ] **NextActionBar** hides command-surface-owned CMO CTAs
- [ ] **Recompute** on intake, week start, KPI/GA4 updates, ops complete
- [ ] **Missing metrics** show confidence `missing` — no fake GA4 rows

## CMO Distribution Operator (P8)
- [ ] **buildDistributionOperator** — viral → 7-day hook grid + daily volume; founder → 14-day grid
- [ ] **DistributionOperatorPanel** — hook × day grid, volume counter, script scaffolds
- [ ] **Retention proof** — post URL + 3s retention % + 24h views on measure (no vibes)
- [ ] **evaluateHookPerformance** — scale / kill / double_down rules from hook matrix
- [ ] **GrowthCommandSurface** — volume chip in command footer; Start move opens proof modal
- [ ] **Lane B synced** — operator is source of truth; legacy Lane B hidden when operator active
- [ ] **No auto-post** — human posts only; retention-first proof

## CMO Influencer Operator (P9)
- [ ] **buildInfluencerOperator** — influencer thesis → 15 touches, 3 pitches A/B/C, weekly DM targets
- [ ] **InfluencerOperatorPanel** — pipeline board, volume counter, pitch scaffolds, CSV export
- [ ] **Reply proof** — handle + thread URL + warm/hot interest on reply (no vibes)
- [ ] **Deal proof** — UTM + promo code + disclosure ack on brief_sent
- [ ] **evaluatePitchPerformance** — scale / kill / double_down rules from pitch matrix
- [ ] **GrowthCommandSurface** — outreach chip in command footer; Start move opens proof/deal modal
- [ ] **Lane B synced** — operator is source of truth; legacy Lane B hidden when operator active
- [ ] **No auto-DM** — human sends only; reply-first proof

## First hour (minutes 0–60)
- [ ] **Ghost monorepo reveal**: Stack shows `apps/console ✓`, hero route chip highlighted, landing file path visible
- [ ] **Primary CTA**: "Review hero & ship change" → scout ask with `@heroPath` mention (connected) or direct edit (offline)
- [ ] **Scout answer**: Agent cites `path:line` (e.g. `apps/console/app/page.tsx:12`) + TurnReceipt; edit auto-starts (~450ms) without "Run in project" click
- [ ] **First edit**: No confirm modal during first hour (`firstHourActive`) — diff → apply → Shipped receipt with commit SHA
- [ ] **Success metric**: ≥1 applied change in first session (`firstShipAt` persisted)
- [ ] Reveal secondary CTA: Launch plan / preview outline (plan is not primary when hero route exists)
- [ ] Connect from reveal opens Settings → Connection dialog (scan progress preserved)
- [ ] Offline scan does not silently auto-preview plan — user chooses when to start
- [ ] Plan preview initializes progress → NextActionBar shows "Day 1" immediately
- [ ] Home dashboard shows First hour card (not duplicate Suggested moves) when plan exists
- [ ] First hour card shows "Ship one patch from reveal" until first apply

## First five minutes (cinematic onboarding)
- [ ] Splash shows phased progress bar; startup error shows Retry / Continue offline (reachable)
- [ ] Welcome → Sign in → Focus → Project: directional slide transitions, logo never jumps size
- [ ] Progress rail shows every step (Welcome included); dev mode hides Sign in step
- [ ] Auth resolving shows skeleton (never a wrong "Open a project" title flash)
- [ ] Google/email sign-in ends with a success beat (check + email) before advancing
- [ ] Focus step asks once — restarting the app skips it (`personaChosen` persisted)
- [ ] Folder scan → **ScanTheater** full-screen: live discovery log + progress bar
- [ ] Scan failure appears in onboarding (red alert), not just chat
- [ ] ProjectReveal staggers in: source badge → name → stats (4) → route chips → moves
- [ ] Relaunch with a project open → straight to workspace + "Welcome back" toast

## Plan Studio (mission control)
- [ ] Generation: per-playbook loading (only the in-flight card pulses), `whyIncluded` under stubs
- [ ] Finalizing phase: readiness bars stream in and fill
- [ ] Plan lands with **crystallize** moment (blur → sharp)
- [ ] Single vertical narrative — no inner tab bar: Progress → Hero+chips → **LaunchTimeline** → Playbooks → Strategy sheet → Progress/report
- [ ] LaunchTimeline: playbook lanes, colored day nodes, week headers show done/total, "Next" marker
- [ ] Timeline node click → focuses the task in the detail panel
- [ ] Blocked task names its blocker: "Blocked by: X (Day N)"
- [ ] Task buttons differ by mode: Browser / Draft / Repo; failed task shows inline **Retry**
- [ ] Playbook complete → green "Completed" card state; all done → plan-complete banner
- [ ] Command center: "Now: {bottleneck} → Day N" (English); Spend/CPA only from logged P14 evidence
- [ ] Session report: designed card + Next up CTA (no raw `<pre>` dump)

## Conversation (tier-1 chat)
- [ ] Time divider appears after >10 min gaps; bubbles show time on hover
- [ ] Hover any message → copy button
- [ ] Scrolling up stops auto-scroll; FAB appears; new tokens don't yank the view
- [ ] Composer grows with content (up to cap); Ctrl+1/2/3 switches modes
- [ ] "More" menu exposes all 8 quick actions
- [ ] Approval shows ONE decision surface (stage overlay / operator modal); chat shows pointer chip only
- [ ] No empty bordered box above messages when there is no question

## Operator
- [ ] Cursor click ripple + type caret animate (actionVerb wired)
- [ ] "Pause & steer" label (no fake Take over)
- [ ] Safe-actions toggle visible while idle
- [ ] Findings drawer starts collapsed with count pill
- [ ] Filmstrip: pinned shows "Step N/M"; trimmed frames labeled, not "▢"
- [ ] Idle: designed EmptyState with "Start a browser task"; offline: gate with Settings CTA
- [ ] Task failure: EmptyState/banner with **Retry task**

## Trust & Setup Contract
- [ ] **Prod build**: connector feed empty (no demo rows without dev toggle)
- [ ] **Dev + demo toggle**: DemoDataBanner visible; feed rows show Demo badge; hide clears feed
- [ ] **Local mode**: project scan + outline preview work; Composer/Plan/Operator show ConnectGate
- [ ] **Degraded**: consumer banner (no raw `ANTHROPIC_API_KEY` in chat); recovery via Connect/Settings
- [ ] **Bundled server**: Settings → Start local stack → Test → connected (API key wizard if needed)
- [ ] **Hosted release**: default server URL is hosted API, not localhost
- [ ] **Pending gate count**: demo approval rows do not inflate "Needs you"

## Measurement & Sales Export Contract
- [ ] **Manual KPI**: Plan Studio → Log waitlist signups → Command Center Signups column shows value
- [ ] **Experiment outcome**: Pending experiment → Record outcome + metric → Performance win rate updates
- [ ] **Connector feed**: No default demo rows; GA4 CTA placeholder in connections feed
- [ ] **Performance empty state**: Connect GA4 CTA + manual KPI path (no fabricated rows)
- [ ] **Sales copy**: No "reaches your leads" — "Research & draft — you send"
- [ ] **Export CSV**: Sales persona → Export leads CSV after research
- [ ] **Outreach pack**: Copy pack + mailto opens mail client
- [ ] **Webhook**: Settings URL → Send to webhook with confirmation

## Advice → Ship (ROI contract)
- [ ] **Ask "rewrite hero"** → TurnReceipt + "Run in project" visible in thread
- [ ] **Edit complete** → receipt shows proposed files + line stats
- [ ] **Apply** → commit SHA visible in-thread TurnReceipt (Shipped)
- [ ] **Home** → Recent activity shows last ship summary
- [ ] **Reveal** → "Review hero & ship change" scouts `@heroPath` or starts edit; `inferIntegrateRoute` picks `apps/console/app/page.tsx`

## Developer parity (Cursor-grade ergonomics)
- [ ] **Ctrl+K file search** — type a path fragment → open file preview
- [ ] **Recent projects in palette** — reopen without onboarding
- [ ] **Open in Cursor / VS Code** — palette command opens project folder
- [ ] **Git branch in status bar** — branch + short SHA when repo is git
- [ ] **Isolated worktree badge** — visible during active edit run
- [ ] **Review all diffs** — run footer → multi-file diff before apply
- [ ] **CI green** — `desktop-ci` workflow: typecheck + shared tests + trust copy

## System states
- [ ] Backend down: banner has Retry + Settings actions
- [ ] Quota error → Settings/usage link, not a dead end
- [ ] Failed run in stage shows the real reason + Retry run
- [ ] Performance surface: no fabricated GA4/Meta rows ("coming soon" truthfully)
- [ ] Assets page: filter (All/Applied/Pending), Draft badge for thread-only assets, empty CTA

## IA single-story checks
- [ ] Settings exists once (route w/ category rail; dialog reuses same sections)
- [ ] Connection status only in StatusBar (not TitleBar)
- [ ] Session history opens via chat header button or Ctrl+H, overlays (doesn't evict) the rail
- [ ] Session delete asks for confirmation; rows show relative time + message preview
- [ ] Work surfaces reachable from tab bar + ProjectRail only (EmptyCanvas has composer/palette CTAs, not duplicate chip rows)
- [ ] Navigator avatar opens account menu (email, settings, sign out)

## Cross-link fidelity
- [ ] Chat `plan-task://` link → Plan Studio opens correct playbook + task highlighted + scroll
- [ ] Chat `surface://plan-playbook/{id}` → next actionable task (not first task)
- [ ] Run started from a plan task shows PlanContextStrip with "Back to plan"

## Progress truth
- [ ] Skip task offline → reload → status still skipped
- [ ] Server GET returns `playbookId` + `updatedAt`

## Regression guards (run in desktop/)
```powershell
npm run typecheck
npm run test:shared
# Production-facing strings must not appear in renderer error paths:
rg "ANTHROPIC_API_KEY in server" src/renderer --glob "!**/HelpPage.tsx"
rg "Google Ads account read" src --glob "!**/feedMock.ts"
# No new ad-hoc sizes/radii in touched files:
Get-ChildItem src/renderer -Recurse -Include *.tsx | Select-String 'text-\[1[1-3](\.\d+)?px\]' | Measure-Object
```

## 60s WOW recording (v2 script)
Splash → ScanTheater live discovery → Intelligence Reveal → generate plan (readiness streams, crystallize) → LaunchTimeline → run a task from the timeline → Operator cursor theater → copy Session Launch Report. Viewer should say: *"This is a launch mission control, not a chatbot."*
