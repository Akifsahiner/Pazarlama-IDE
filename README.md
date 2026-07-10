# Marketing IDE

**Claude for Marketing & Sales** — a **local-first GTM IDE** for developers who ship from their own repo.

Open a folder or clone, generate a 30-day launch plan, run an agent that produces copy and diffs you review and apply, and use the browser operator for research — **you approve every change; you publish outreach and ads yourself.**

| What we do | What we don't |
|------------|----------------|
| Scan repo → launch plan → agent edits → diff → apply | Auto-send outreach or bulk email |
| Browser research in the operator | Meta/Google Ads publish from the app |
| Manual KPIs + optional GA4 read-only | Upload your codebase to the cloud |
| Talk-through marketing today: strategy, drafts, plan tasks — you apply diffs (L2) | Fully automated publish/send without your approval (L4+ roadmap) |

## Maturity & roadmap (Konuşarak Pazarlama Vaadi)

| Level | Experience | Status |
|-------|------------|--------|
| **L2** | Plan + tasks; Ask/Edit/Browse; manual apply; session report export | **Today** |
| **L3** | Auto composer + one-click handoff with confirm gates | **Shipped** (Faz 4–5) |
| **L4** | Single campaign thread; integrate copy to repo; done = applied value | **Shipped** (Faz 2, 6, 8) |
| **L5** | GA4 read loop; outreach/ad export; weekly evidence report | **Shipped** (Faz 9–10) |

### Faz 12 — Market (shipped)

| Epic | Scope | Status |
|------|--------|--------|
| **12A Hosted tier** | Signup → instant backend; free = scan + preview; Pro+ for AI | **Shipped** |
| **12B Team mode** | Org members, approval queue, client report sharing | **Shipped** |
| **12C Connector marketplace** | GA4 + Meta read OAuth; LinkedIn/HubSpot connect v1 | **Shipped** |
| **12D Eval loop** | Thumbs on decisions + 30-day quality dashboard | **Shipped** |

See [`docs/FAZ-12-PIYASA.md`](docs/FAZ-12-PIYASA.md) for API tables and rollout. Apply migration `server/supabase/migrations/0007_faz12_market.sql` on hosted Supabase.

In-app Meta/Google Ads **publish** and unsupervised bulk send **remain out of scope** — read connectors and export packs are the last mile today.

| Layer | Path | Role |
|-------|------|------|
| **Desktop app** | [`desktop/`](desktop/) | Electron IDE: onboarding, Plan Studio, local agent, diff/preview, browser operator |
| **Backend** | [`server/`](server/) | Cloud orchestrator: LLM SSE, Anthropic proxy for local agent billing, headless browser CU, Supabase auth |
| **Skills** | [`skills/`](skills/) | Filesystem `SKILL.md` packages copied into agent worktrees |
| **Marketing site** | [`src/`](src/) | Next.js landing page (separate from the desktop product) |

## Quick start (5 minutes)

### 1. Backend

```bash
cd server
npm ci
cp .env.example .env   # add ANTHROPIC_API_KEY (and Supabase vars for hosted mode)
npm run dev            # http://127.0.0.1:8787
```

See [`server/README.md`](server/README.md) for auth modes and persistence.

### 2. Desktop

```bash
cd desktop
npm ci
npm run dev
```

On first launch: **Welcome → Connect (or Continue offline) → Open project → Scan → Workspace**.

Offline mode scans your folder and previews a heuristic plan outline. Connect the backend for full AI plan generation and agent runs.

### 3. Golden path

1. Open a local folder (Next.js / React repo works best)
2. Wait for **Scan Theater** → **Project Reveal**
3. Click **Start launch plan** (or **Preview plan in workspace** offline)
4. Run a plan task from the timeline → review diff → apply
5. Optional: **Browser task** from Plan Studio or composer for competitor research

## Developer scripts

| Command | Where | Purpose |
|---------|-------|---------|
| `npm run typecheck` | `desktop/`, `server/` | TypeScript |
| `npm run test:shared` | `desktop/` | Shared logic unit tests |
| `npm run test:ci` | `desktop/` | typecheck + shared + trust-copy + golden-path + wow-checklist smoke |
| `npm run eval:gtm` | `server/` | GTM brain golden evals (needs `ANTHROPIC_API_KEY`) |
| `npm run build:win` | `desktop/` | Windows installer + bundled server |

## Architecture (short)

- **Local Agent Host** — Claude Agent SDK runs in Electron main; files and git stay on your machine.
- **Cloud proxy** — Desktop sends session token as `ANTHROPIC_API_KEY`; server injects the real key and meters usage.
- **Unified RunEvent bus** — Agent runs, browser CU, and feed items share one event stream for replay.

Details: [`progress.md`](progress.md), [`desktop/README.md`](desktop/README.md), [`AGENTS.md`](AGENTS.md).

## CI

GitHub Actions (`desktop-ci.yml`): desktop typecheck/build/tests, server build + skill-coverage, GTM eval (when secret present), Electron e2e smoke.

## License

Private — see repository owner.
