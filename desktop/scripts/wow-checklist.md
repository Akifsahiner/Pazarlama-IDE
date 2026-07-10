# WOW + GTM Senior+ Manual Checklist (v2 — Design Overhaul)

Run after Plan Studio / GTM brain / design-system changes.

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
- [ ] Command center: "Now: {bottleneck} → Day N" (English), no fake Spend/CPA columns
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
