# Marketing IDE — Desktop

Electron + React desktop app (v0.1.0). Local-first GTM workspace.

## Prerequisites

- Node.js 20+
- Windows (primary target) or macOS/Linux for dev
- Running backend — see [`../server/README.md`](../server/README.md) or use **Settings → Start local stack** in packaged builds

## Development

```bash
npm ci
npm run dev          # electron-vite dev
npm run typecheck
npm run test:ci      # recommended before PR
```

### Environment

- Default server URL: `http://127.0.0.1:8787` (dev)
- Release builds inject hosted URL via `VITE_DEFAULT_SERVER_URL` at build time
- Do not commit secrets; bundled server reads `ANTHROPIC_API_KEY` from user config

## First-run golden path

1. **Splash** → auth or **Continue offline**
2. **Open project** — folder (recommended), git clone, or live URL (lightweight scan)
3. **Scan Theater** — real file walk for folders; URL fetch for live sites
4. **Project Reveal** → **Start launch plan** / **Preview plan in workspace**
5. **Workspace** — Plan Studio tab, composer (Ctrl+L), command palette (Ctrl+K)
6. **Edit run** — agent worktree → Diff & Preview → Apply
7. **Browser task** — plan tasks tagged browser, or composer Browse mode
8. **Runs** — archived replay including browser events

## Key directories

| Path | Purpose |
|------|---------|
| `src/main/` | Electron main: agent host, git worktree, scanner, IPC |
| `src/main/agentHost/` | Local Agent Host (Claude Agent SDK) |
| `src/renderer/` | React UI: onboarding, workspace, settings |
| `src/renderer/state/store.ts` | Zustand app state |
| `src/shared/` | Types + pure logic (tested via `test:shared`) |
| `e2e/` | Playwright Electron tests |
| `scripts/` | Trust-copy regression, golden-path smoke, wow checklist |

## Bundled server (packaged app)

Settings → Connection → **Start local stack** spawns the server from app resources. Configure Anthropic key via the bundled wizard when prompted.

## Testing

```bash
npm run test:shared       # unit tests (no Electron)
npm run test:trust-copy   # no leaked secret strings in UI
npm run test:golden-path  # structural module checks
npm run test:e2e          # requires npm run build first
```

Manual QA: [`scripts/wow-checklist.md`](scripts/wow-checklist.md)

## Build release

```bash
npm run build:win
```

Output: `dist/` NSIS installer with bundled `server/` and `skills/`.
