# Agent guide — Marketing IDE monorepo

## Product map

This repo is **not** a generic Next.js app. It contains:

| Directory | Product |
|-----------|---------|
| `desktop/` | **Marketing IDE desktop** — primary product (Electron) |
| `server/` | Backend proxy + GTM brain + browser CU |
| `skills/` | Agent skill packages (`SKILL.md`) |
| `src/` | Public marketing website (Next.js) — landing only |

When the user asks about "the app", they mean **`desktop/`** unless they specify the website.

## Golden path (what "done" means)

```
Open project → scan → reveal → plan (AI or preview outline) → run task → diff → apply → optional browser verify
```

Do not break: local-first files, honest metrics (no fake GA4 rows), offline preview labeling (`planPreviewMode`).

## Conventions

- **Shared types**: `desktop/src/shared/types.ts` mirrors `server/src/runs/types.ts` where applicable
- **State**: Zustand store at `desktop/src/renderer/state/store.ts` — avoid silent `.catch(() => {})`; use `reportBackgroundError`
- **Errors**: `desktop/src/renderer/lib/errorPresenter.ts` + user-visible recovery CTAs
- **Next.js web** (`src/`): read `node_modules/next/dist/docs/` — APIs may differ from training data (see nextjs-agent-rules below)

## Before editing

1. Read surrounding code; match existing patterns
2. Run `npm run typecheck` in `desktop/` (and `server/` if touched)
3. Run `npm run test:shared` for shared logic changes
4. Never read/write `server/.env` (locked) — use `.env.example` placeholders only

## CI expectations

- `desktop-ci.yml`: desktop build, typecheck, shared tests, trust-copy, golden-path smoke, server build, optional GTM eval, e2e launch test

## Architecture ADRs

See [`progress.md`](progress.md): Local Agent Host, Anthropic proxy billing, SDK skills, unified RunEvent bus.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code under `src/` (marketing site). Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
