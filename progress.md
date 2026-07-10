# Marketing IDE — Agent Engine (implementation progress)

Living notes for the "Claude arka plan motoru" build. Plan: `.cursor/plans/marketing_ide_agent_engine_01e9e817.plan.md` (do not edit the plan file).

## Architecture decisions (ADR-lite)

### ADR-1 — Local Agent Host vs server-centric
**Decision:** Agent SDK runs in a **Node child process spawned by Electron main** (Local Agent Host). Files, git, worktree, file watcher and preview server stay on the user's machine. The Fastify server is the **cloud orchestrator + browser sandbox** only.
**Why:** User explicitly wants files to stay local (no uncontrolled repo upload to cloud), matching their "Local Agent Host" diagram. Server has no access to the user's local files.
**Consequence:** Need an IPC event bridge from the child process → main → renderer. Agent SDK node deps must be externalized in Electron packaging.

### ADR-2 — Key/billing isolation via base-URL proxy
**Decision:** The Local Agent Host starts the Agent SDK with `ANTHROPIC_BASE_URL = <cloud>/anthropic` and the user's short-lived session token. The cloud proxy authenticates the user, injects the real `ANTHROPIC_API_KEY`, meters `usage_events`, and enforces quota.
**Why:** Keep the real Anthropic key server-side; enable billing/quota; never expose the key to the client.
**Risk / fallback:** Must verify the SDK honors `ANTHROPIC_BASE_URL` + custom auth (Faz 1 spike). If not viable → fallback: server-side Messages orchestrator, local host only executes tools.

### ADR-3 — SDK-native Skills
**Decision:** Marketing/Sales skills are filesystem `SKILL.md` packages under repo `skills/`. The Agent SDK discovers them via `settingSources`/`plugins` + the `skills` option; Claude selects autonomously.
**Why:** Official, sustainable path; avoids hand-rolling Cowork orchestration logic.

### ADR-4 — Unified Run Event Bus
**Decision:** All sources normalize into one `RunEvent` union with monotonic per-run `seq`; clients resume from `afterSeq`. Canonical type: `server/src/runs/types.ts`; mirror: `desktop/src/shared/types.ts`.
**Why:** Single coherent stream powers the Execution Canvas, activity timeline, and replay.

## First milestone (golden path)
`Open project → understand product → homepage audit → prepare patch → show diff → run preview → browser verification → approve → generate launch plan`

## Status log

- **Faz 0 — contracts & scaffold** (in progress)
  - `server/src/runs/types.ts` — canonical RunEvent + permission matrix. DONE
  - `desktop/src/shared/types.ts` — mirror types. DONE
  - `server/supabase/migrations/0002_runs.sql` — runs + run_events tables. DONE
  - `progress.md` + ADR-lite. DONE

- **Faz 1 — cloud proxy & Local Agent Host** (in progress)
  - SPIKE result: `@anthropic-ai/claude-agent-sdk` @ `0.3.193`. `query({ prompt, options })` → `AsyncGenerator<SDKMessage>` with `.interrupt()`. Confirmed mechanisms:
    - `options.env` replaces subprocess env → inject `ANTHROPIC_BASE_URL` + `ANTHROPIC_API_KEY` (CLI subprocess reads them). ADR-2 viable.
    - `options.canUseTool(tool, input) => PermissionResult` → maps directly to our permission matrix scopes.
    - `options.skills` + `settingSources`/`plugins` → SDK-native skill discovery (ADR-3 viable).
    - `options.cwd` → local file work in the run worktree.
    - `SDKMessage` kinds: `assistant`, `result`, `system`(init), `stream_event`(raw Anthropic), partials.
  - Decision: build proxy + host to this contract. SDK bundles a native CLI binary; runs in Electron main (Node), not renderer.

  - `server/src/routes/anthropicProxy.ts` + `auth/token.ts` — base-URL proxy, x-api-key auth, quota, metering. Exempted from requireUser + rate limit. Registered in index.ts. DONE
  - `desktop` deps: `@anthropic-ai/claude-agent-sdk@0.3.193` + `chokidar`. DONE
  - `desktop/src/main/runs/eventBus.ts` — seq + ring buffer + IPC push. DONE
  - `desktop/src/main/agentHost/{host,scopes,index}.ts` — SDK query wrapper, scope→permission gate via canUseTool, approval round-trip, interrupt. DONE
  - IPC: `agent.{startRun,interrupt,approve,since,events}` in ipc.ts/preload/handlers/DesktopApi. DONE

- **Faz 2 — Run Event Bus & Execution Canvas** (done, foldable)
  - `desktop/.../state/session.ts` — RunInfo, PendingApproval, CanvasMode + run/preview/taskgraph. DONE
  - `desktop/.../state/runEvents.ts` — pure reducer applyRunEvent + clearApproval (frame trimming, canvas hints). DONE
  - `desktop/.../state/store.ts` — run state, startRun/interruptRun/approveRun/rejectRun, onEvent subscription. DONE
  - `RunCanvas` + `IntentStrip` + `ActivityTimeline` + centered approval overlay; wired into `Canvas.tsx`; EmptyCanvas "Scan & summarize" trigger. DONE
  - First flow visible: EmptyCanvas → startRun(scan goal) → RunEvents render in Execution Canvas. typecheck PASS (server+desktop).

- **Faz 3 — file work** (done): `git/worktree.ts` (detached worktree per run), `git/diff.ts` (numstat + patch, `.claude` excluded), `fs/watcher.ts` (chokidar → file.patch_updated), `preview/server.ts` (dev server + URL parse → preview.ready), `validate/run.ts` (typecheck/lint/build). Coordinator owns prepare→watch→run→apply/discard lifecycle. IPC: apply/discard/preview/stopPreview/validate. UI: RunCanvas apply/discard bar, Preview/Validate buttons, iframe preview, PermissionMatrix.
- **Faz 4 — skills** (done): `skills/{product-intelligence,landing-page-conversion,launch-planning,launch-asset-generator}/SKILL.md`. `main/skills/install.ts` copies them into `<worktree>/.claude/skills` so the SDK discovers them (`settingSources:["project"]` + `skills` option). electron-builder `extraResources` ships `skills/` to packaged resources.
- **Faz 5 — Computer Use hardening** (done): server SYSTEM prompt now states the priority ladder (API>…>CU>takeover) + redaction/credential rules; frames carry a normalized cursor; BrowserCanvas draws cursor overlay + ping ripple; EvidenceDrawer lists findings; Take over + Stop. NOTE: pixel-level screenshot redaction is NOT implemented — protection is via credential-field guard + URL deny/allowlist + prompt. Browser↔RunEvent full merge is partial (browser still uses its own WS path; cursor/evidence added).
- **Faz 6 — golden path** (done): EmptyCanvas "Prepare this project for launch" + Composer "Agent run" mode start a local run that uses the skills end-to-end (understand → audit → edit → plan/assets). Diff/preview/validate/apply wired. afterSeq replay available via `agent.since` IPC + bus ring buffer. server+desktop typecheck+build PASS.
- **Faz 7 — sales (post-MVP scaffold)** (done): `skills/{lead-research,outreach-drafting}/SKILL.md` (drafts only, no bulk send). `server/src/connectors/types.ts` — ConnectorTool/Registry scaffold documenting credential injection OUTSIDE the agent boundary.

## Build/verify status
- `server`: typecheck + build PASS. `desktop`: typecheck + build PASS (main bundles SDK via externalize).

## Known gaps / next
- Pixel redaction of screenshots (sharp/canvas) — deferred (still remaining).
- Browser CU not yet driven autonomously mid-run (separate WS); a `browser` connector tool would let the local agent invoke it (still remaining).
- Live policy edits don't propagate to a running host (policy fixed per run; per-action approval is the live gate).
- ~~Multi-renderer Execution Canvas (Preview/TaskGraph split)~~ — DONE (R1, see Remediation).
- ~~Browser↔RunEvent correlation (browser verification inside the run)~~ — DONE (R2, see Remediation).
- ~~Active-run resume / afterSeq replay on reload~~ — DONE (R3, see Remediation).
- ~~Run persistence to `runs/run_events` tables (in-memory bus only)~~ — DONE (R4, server routes + best-effort mirror; migration wired).

## Operator — CU Live Theater + Claude for Marketing & Sales (DONE)
Plan: `.cursor/plans/cu_operator_live_theater_0b3ef1ea.plan.md`.
- **Faz 1 (server contract):** `server/src/browser/types.ts` (FrameMeta/Finding/scopes/persona); `actions.ts` verbOf/scopeOf/bestEffortBbox/parseFinding; `session.ts` rich onFrame (url/title/bbox/step/phase), thinking/acting/verifying phases, pause/resume/steer + steerQueue, FINDING parse → onFinding, navigated event, persona-aware SYSTEM; `routes/browser.ts` rich events + pause/resume/steer + persona.
- **Faz 2-5 (client):** `shared/types.ts` mirror (FrameMeta/Finding/RunReport/BrowserScope/Persona, Settings.persona); `browserSocket.ts` rich union + pause/resume/steer; `session.ts` BrowserState (url/title/step/phase/bbox/paused/frameHistory/structured findings); `store.ts` handleBrowserMessage + pushFrameHistory ring buffer + pause/resume/steer actions; new `features/workspace/operator/*` (Operator, BrowserChrome, OperatorStage, AgentCursor, PhaseBadge, StepProgress, ControlBar, Filmstrip, EvidenceDrawerV2, ApprovalModalV2, SafetyToasts, capabilities); BrowserCanvas + RunCanvas delegate to `<Operator>`; globals.css shimmer keyframe.
- **Faz 6 (positioning):** Onboarding persona step (Launch/Grow/Sell → Settings.persona); EmptyCanvas Marketing/Sales grouped quick-actions (ICP/leads/outreach sales runs); persona-aware browser prompt (server); capability chips in IntentStrip (detectSkill).
- **Faz 7 (website):** hero reframe to "Claude for Marketing & Sales" (tokens.ts heroCopy/outcomeStrip, HeroHeadline H1, layout metadata).
- **Faz 8 (verify):** server+desktop typecheck/build PASS, web build PASS, live CU smoke **SMOKE_OK** (rich frame url/step/phase + thinking/acting/verifying phases confirmed). Smoke script removed.
- Known minor: bbox best-effort (hidden for shadow/iframe); pixel redaction still deferred; take-over is pause+steer (no raw input forwarding yet).

## Desktop Design Overhaul (DONE)
Plan: `.cursor/plans/desktop_design_overhaul_e40e74e0.plan.md`.
- **Design System 2.0:** `globals.css` dark `:root` + `[data-theme="light"]` (accent/iris/emerald ramps, semantic -soft/-border, radius/shadow/space/z/motion tokens), type-scale utility classes + focus base; `design/tokens.ts`; `design/theme.ts` (applyTheme/initTheme/migrateTheme). `Settings.theme` → `dark|light|system` (migrated from classic/forest/…). Store applies theme on init + on change.
- **Primitives** `components/ui/*`: Button, Card, Badge, Field/Input/Textarea, Segmented, ProgressBar, Page, Spinner, cx. EmptyState v2 (actions), FilePreview v2 (line numbers).
- **Shell & nav:** `Splash`; `Route` type + `store.route/navigate`; `app/Shell.tsx` (Navigator + routed pages + page transition); `Navigator` rail replaces SlimRail; Workspace SlimRail removed; focus mode (hide agent panel) via store.focusMode + AgentThread toggle; CommandPalette → command center (navigate Home/Workspace/Runs/Assets + actions). Settings is now a route page (modal kept for onboarding self-host).
- **Onboarding & auth:** `Welcome` (full-bleed brand hero) → SignIn redesign (email OTP + Google/GitHub/SSO scaffold w/ backend note) → Persona (persisted to settings) → OpenProjectStep redesign (3 methods: folder drag-drop+picker, repo clone w/ validation, live URL w/ validation, recents/cloud) → `ProjectReveal` (phase "reveal": framework/routes/analytics + product summary + persona-aware first moves) → Home.
- **Pages:** HomePage (active project + suggested moves), RunsPage (run summary archive), AssetsPage (asset hub), SettingsPage (Account/Connection/Appearance theme picker/Providers/Privacy/About), HelpPage (shortcuts).
- **Verify:** desktop typecheck + build PASS; lint clean.
- Known minor/future: global file search in command center; Shiki syntax highlighting (used line-numbered mono for now); light theme can be further tuned.

## Marketing Brain Architecture (DONE)
Plan: `.cursor/plans/marketing_brain_architecture_0f844203.plan.md`.

**Faz 1 — Foundation hız + hata UX:**
- `env.ts`: `ANTHROPIC_MODEL` default `claude-sonnet-4-6` (Opus'tan), `ANTHROPIC_MODEL_FAST` boş (Sonnet fallback), `ANTHROPIC_MODEL_DEEP` boş, `LLM_TIMEOUT_MS` 60s. `retry.ts` retries 1, cap 2s, `isModelUnavailable` helper.
- `anthropic.ts` plan'i `messages.stream` ile streaming yapar, `max_tokens` 2048, fallback yalnız `isModelUnavailable`. Chat'te tool "start" emit (mevcut yalnız "done"du).
- `llm/errors.ts` `classifyError` → stable codes (rate_limited/quota_exceeded/model_error/timeout). Route'larda structured timing log (`llm_turn`, durationMs/provider/status/code).
- `desktop/lib/api.ts` `StreamHttpError` + 429'da rate_limited vs quota_exceeded ayrımı + retry-after header okuma. SSE bozuk JSON line'larını fırlatma → atla.
- `store.ts` `generatePlan` connection/provider guard'ları, plan SSE error'u thread'e ve canvas'a, Stop sonrası `(no response)` yerine "Stopped." (boş bubble silinir). Provider check `settings.provider`'a göre.
- `MessageList` boş last-bubble için **"Claude is thinking…"** + animated dots.

**Faz 2 — Marketing Profile:**
- `schemas/marketingProfile.ts` Zod (product/audience/market/GTM/experiments/meta + gaps + confidence). `desktop/shared/types.ts` aynası.
- `0003_marketing_profile.sql` (user_id+project_id PK, jsonb, RLS owner). `db/repos/marketingProfile.ts` in-memory cache + Supabase upsert + `recordExperiment` + `markExperimentOutcome`. Persistence kapalıyken in-memory fallback.
- `brain/profileBuilder.ts` `inferFromRepoScan(ProjectProfile)` (framework/routes/analytics → channels + category guess) + `computeGaps`.
- `/projects/:id/marketing-profile` GET + PATCH route.
- Desktop store `marketingProfile` + `loadMarketingProfile`/`updateMarketingProfile`; openServerProject akışında otomatik yükleme.
- `MissingInfoCard.tsx`: chat thread başında inline 1 soru (product_name/value_prop/audience/stage/differentiators), cevap upsert + sonraki gap.

**Faz 3 — Router + Model Tier:**
- `brain/router.ts` (Haiku ya da Sonnet) tool_use ile discipline/task_kind/urgency/user_goal_summary, 60s in-memory cache + 8s timeout. Hata durumunda **keyword heuristic fallback** (Brain hala route eder, sıradan answer'a düşmez).
- `brain/modelTier.ts` tek fonksiyon — kind'a göre model+max_tokens (router=256, chat=2048, decision=4096, critique=1024).

**Faz 4 — Skill paketleri (3 yüksek-değer):**
- `skills/landing-page-conversion/` + `skills/launch-planning/` + yeni `skills/ph_launch/` her biri için: `manifest.json` (applies_when/do_not_use_when/required_inputs/playbook_selector), `principles.md`, `decision-tree.json`, `playbooks/{no-audience,with-email-list,b2b-saas}.md`, `templates/*.md` (copy-paste-ready), `anti-patterns.md`, `kpis.json`. Mevcut `SKILL.md` korunur (Agent SDK için).

**Faz 5 — Skill retrieval + Brain pipeline:**
- `brain/skillRetrieval.ts` discipline → ≤2 manifest filter (applies_when/do_not_use_when), playbook_selector ile playbook seçer, principles+tree+templates+anti+kpis tek "Brain Context" string'i. Manifest cache + skills/ dizini auto-detect (cwd / ..). 0 LLM çağrısı.
- `brain/prompts.ts` `compactProfile` (alan-budget'lı JSON) + `decisionSystemPrompt` (hard rules: profile-tied claims, finished assets, specific metric, when_to_reconsider, missing_info ≤ 3).
- `schemas/decision.ts` Zod + JSON-schema (Anthropic tool input_schema): diagnosis/bottleneck/options_compared/decision/rationale/ready_to_use_assets/next_steps/success_metric/when_to_reconsider/missing_info.
- `brain/generate.ts` `messages.stream` + tool_choice forced; `inputJson` event'inde first-chunk status; `isModelUnavailable` koşulunda fallback.
- `brain/index.ts` orchestrator: profile → route → retrieve → emit lifecycle → generateDecision → recordExperiment → critic (koşullu) → emit reviewed. `agent.ts` `useBrain` (strategic intent + non-meta) yolu Brain'e devr; meta_question chat path'inde kalır.
- Desktop `MarketingDecisionCard.tsx` yapılı render: diagnosis/bottleneck/decision+rationale/options collapsible/ready-to-use assets (clipboard copy)/next steps/success metric/when to reconsider/missing_info. `MessageList.AssetEvent` asset.after JSON ise DecisionCard'a yönlenir.

**Faz 6/7/8 — UI + Critic + Experiments:** Decision card tüm asset'leri ve experiment-feedback için hazır; critic stratejik disipline'larda otomatik devrede ("Reviewed · NN/60" score); decision oluştuktan sonra `recordExperiment(pending)` profil'e yazılır → sonraki retrieval'ların `compactProfile.recent_experiments`'inde görünür.

**Faz 9 — Verify:**
- server typecheck + build PASS; desktop typecheck + build PASS; lint clean.
- Canlı agent smoke: profile boş + "Audit landing page hero" mesajı → router doğru `landing/audit` yakaladı, Brain pipeline çalıştı, **first byte 2.1sn**, total 25.9sn, **structured decision** geldi ("Pause and collect 3 critical profile inputs"), specific success_metric ("Hero CTA CTR ≥ 4% within first 500 visitors"), critic emit etti. SMOKE_OK.
- Server log her turn için: `{ route, provider, durationMs, status, code?, assets, textChars }`.

**Bilinen küçük açıklar:**
- Token sayısı `usage_events`'e hala 0 yazıyor (anthropic SDK stream usage'i deneysel; ham `tokens_in/out` rakamı ileride parse).
- Critic skor rozetini UI'da `MarketingDecisionCard` üst kısmına etiket olarak ekleme (decision tarafından emit ediliyor ama henüz desktop bunu özel olarak göstermiyor — şu an `brain.status` chip'inde "Reviewed · 52/60" görünür).

## Open questions / follow-ups
- Faz 1 spike must confirm ADR-2 base-URL proxy behavior before building on it.
- `server/.env` is locked (`.cursor/rules/env-lock.mdc`); the Anthropic key was shared in chat → recommend rotation in the Anthropic Console.
- This Next.js version has breaking changes (`AGENTS.md`); read `node_modules/next/dist/docs` before editing preview/landing code.

## Remediation (phases completion) — DONE

- R1 — Execution Canvas split: new PreviewCanvas (Diff | Live Preview | Validation tabs) + TaskGraphCanvas; Canvas routes each mode to its own renderer; RunCanvas gets a Stage/Diff&Preview/Steps switcher. (desktop renderer canvas)
- R2 — Browser↔RunEvent correlation: when a run is active, browser frames/status/findings fold into the active run (browser.frame, evidence.captured, verification.completed) so browser verification shows inside the Execution Canvas. (desktop store/session/runEvents + main)
- R3 — Active-run resume: main tracks the active run; new IPC agent.activeRun returns a snapshot; renderer rebuilds run state via afterSeq replay on reload. (desktop main + shared + preload + store)
- R4 — Run persistence: server /runs + /runs/:id/events routes + db repo (runs/run_events), best-effort mirror from the local event bus so runs survive and replay cross-device. (server + desktop main eventBus)
- R5 — Verify: server + desktop typecheck & build PASS.

Reason: user reported phases were only partially complete; closing the plan's DoD gaps (multi-renderer canvas, browser-in-run, replay, persistence).

### Result

- R1 DONE — PreviewCanvas (Diff | Live Preview | Validation) + TaskGraphCanvas created; Canvas.tsx routes run/preview/taskgraph to separate renderers; Stage/Diff&Preview/Steps switcher in all three.
- R2 DONE — store.foldBrowserIntoRun mirrors browser frames/findings into the active run (browser.frame, evidence.captured, verification.completed, issue.detected); runEvents reducer handles them.
- R3 DONE — main tracks active runs (Set), getActiveRun() + IPC agent.activeRun; store.init() rebuilds run state via replay BEFORE binding live events and guarded by !get().run (resume race fixed).
- R4 DONE — server /runs + /runs/:id/events routes + db/repos/runs.ts (user-scoped, no-op when persistence off, pngBase64 stripped); desktop eventBus.subscribe() + agentHost startMirror/finishMirror best-effort (awaits final flush before status PATCH).
- R5 DONE — server + desktop typecheck & build PASS; review panel run; blocking resume race + should-fix items fixed.
- Known minor (non-blocking): browser-folded run events are renderer-only (not persisted/replayed from main); seq for renderer-folded events shares RunInfo.lastSeq (append-order UI, not seq-sorted) — acceptable.

## Senior Product Remediation (DONE)

Plan: `.cursor/plans/senior_product_remediation_32fb5642.plan.md` (do not edit the plan file).

**P0 — Trust:** `resolveThreadApproval` removes approval bubbles and posts system status; `ApprovalCard` returns null when not pending; `ingestRunEvent` mirrors tool/file/preview events + approval dedupe; `applyRunChanges` / `applyAsset` surface clear errors and route canvas to preview/diff.

**P1 — Execution canvas:** `ExecutionStage.tsx` hero (intent, steps, latest edit); `RunCanvas` uses Stage + Operator when browser active; `applyRunEvent` routes `preview.ready` → preview canvas; `EmptyCanvas` shows plan summary + Open plan / Run Week 1 chips.

**P2 — Actionable plan:** `PlanCanvas` Run / Run Week 1 → `startRun(goal, taskId?)`; per-task status badges (`running` / `done` / `failed`); optional `deliverable`, `acceptance_criteria`, `action_type` on plan tasks (server schema + prompts).

**P3 — Chat:** `RunProgressStrip` above composer; `ingestRunEvent` thread mirror; `MarketingDecisionCard` + plan snippet (positioning + first 3 tasks) after generate; `MissingInfoCard` gaps API + dismiss after save.

**P4 — Token discipline:** see playbook below; `ConnectionBanner` at ≥80% quota; `startRun` blocks duplicate active runs.

### Token playbook (testing)

| Goal | Setting / habit |
|------|-----------------|
| Default model | `ANTHROPIC_MODEL=claude-sonnet-4-6` (server `env.ts`) |
| Opus / deep | Only when `ANTHROPIC_MODEL_DEEP` is set — strategic critique tier |
| Browser CU | `ANTHROPIC_BROWSER_MODEL` defaults to Sonnet |
| Output limits | `ANTHROPIC_MAX_TOKENS_*` in `.env` (chat/plan/decision 8192; deep 16384) |
| Timeout | `LLM_TIMEOUT_MS=120000` |
| Save tokens in UI | Run **one plan task at a time** (PlanCanvas Run), not full “Prepare launch” in one shot |
| Guardrails | Quota banner at 80%; block second `startRun` while a run is active |

**Verify:** `cd desktop && npm run typecheck` — PASS after remediation.

## Activity hub — Runs archive + Marketing Activity (G1–G5)

**Server:** `0004_runs_activity.sql` — `kind`, `session_id`, `plan_task_id`, `summary_json`, `local_run_id`; `GET /runs` list; enriched POST/PATCH with `lastSeq` + `summaryJson`; event insert updates `last_seq`.

**Desktop mirror:** `agentHost/index.ts` — POST with `projectId`, `localRunId`, `planTaskId`; IPC `agent:runRegistered`; flush PATCH `lastSeq`; `finishMirror` PATCH status + summary + `appendLocalRun`.

**Data layer:** `apiListRuns` / `apiGetRun` / `apiGetRunEvents`; store `runsArchive`, `loadRunsArchive`, `openRunReplay` (read-only), `replayRun`; local fallback `userData/activity/runs.json` via `activity.*` IPC; browse stub via `appendBrowseRun`.

**UI:** `RunsPage` timeline + filters; `RunReplayBanner` + read-only `RunCanvas`; Home recent activity strip; ContextSidebar plan versions; project open loads latest plan + runs archive.

### Manual verify checklist

1. Complete an Edit run → Runs list shows completed row → Replay → ExecutionStage read-only (no Apply).
2. Reopen project → cloud runs list loads (auth + persistence on).
3. Generate plan twice → Plan versions panel shows 2 entries → open older version.
4. Home → Recent activity → click run → replay opens in workspace.
5. Persistence off → local JSON archive still lists last runs (`Local` badge on Runs page).

**Verify:** `cd server && npm run typecheck` and `cd desktop && npm run typecheck`.
