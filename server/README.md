# Marketing IDE — Server

Fastify 5 + TypeScript (ESM, Node 22). LLM proxy, computer-use browser agent,
and (Phase 2) hosted identity + persistence backed by Supabase.

## Scripts

```bash
npm run dev        # tsx watch
npm run typecheck  # tsc --noEmit
npm run build      # tsc -> dist/
npm start          # node dist/index.js
```

## Auth modes

Resolved per request, in this order (see `src/auth/jwt.ts`):

1. `DEV_NO_AUTH=1` → bypass; requests run as a fixed dev user.
2. `SUPABASE_JWT_SECRET` set → require a valid Supabase access token
   (`Authorization: Bearer <jwt>`, HS256, audience + expiry checked).
3. `API_TOKEN` set (and no JWT secret) → legacy shared bearer token (self-host).
4. None of the above → open dev (fixed dev user).

`/healthz` is always public; `/browser` (WebSocket) authenticates in-handler.

## Persistence (Phase 2 / Supabase)

Persistence is **optional**. With no `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`,
the server runs fully in-memory: routes still respond but skip all DB writes,
and `/me` returns zeroed usage with default quotas.

### Required env (from Supabase Dashboard → Settings → API)

| Env | Where to find it |
| --- | --- |
| `SUPABASE_URL` | "Project URL" |
| `SUPABASE_ANON_KEY` | "Project API keys" → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | "Project API keys" → `service_role` (secret) |
| `SUPABASE_JWT_SECRET` | "JWT Settings" → "JWT Secret" |
| `SUPABASE_JWT_AUD` | `authenticated` (Supabase default) |

> The server talks to Postgres over the PostgREST REST API using the service
> role key (which bypasses RLS), so every query is scoped by `user_id`
> explicitly. No `pg` driver / extra dependency is required.

### Apply the migration

Open the Supabase SQL editor (Dashboard → SQL → New query), paste the contents
of `supabase/migrations/0001_init.sql`, and run it. This creates the tables
(`profiles`, `projects`, `plans`, `sessions`, `messages`, `assets`,
`usage_events`, `quotas`), indexes, and owner-scoped RLS policies.

`profiles` and `quotas` rows are created lazily on the first `GET /me` call by
the service role, so no `auth.users` trigger is needed.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/healthz` | public |
| GET | `/me` | ensures profile/quota, returns usage |
| GET/POST | `/projects`, `/projects/:id` (PATCH/DELETE) | owner-scoped |
| GET/POST | `/sessions`, `/sessions/:id` (PATCH/DELETE) | `?projectId=` filter |
| GET | `/sessions/:id/messages` | ownership verified |
| POST | `/plan` | SSE; `{ projectId?, profile?, provider? }` |
| POST | `/agent` | SSE; `{ sessionId?, profile?, message, history?, provider? }` |
| GET | `/assets?projectId=` | list assets for a project |
| POST | `/assets/:id/apply` | record `{ appliedCommit, appliedPath? }` after desktop apply |
| POST | `/projects/:id/scan` | server-side repo/url ingest → updates `profile_json` |
| GET | `/plans?projectId=` | list plans (latest first) |
| WS | `/browser` | computer-use session; auth via `{ type:'auth', token }` or `?token=` |

## Computer Use (local setup)

The browser agent runs **headless Chromium on the server** via Playwright and Anthropic's
`computer-use-2025-11-24` beta. The desktop app only shows live screenshots and approval prompts.

### One-time setup

```bash
cd server
npm install
npm run browser:install   # downloads Chromium (~150MB)
```

Create `server/.env` (gitignored) with at least:

```env
DEV_NO_AUTH=1
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BROWSER_MODEL=claude-sonnet-4-6
```

### Run and verify

```bash
npm run dev
curl http://127.0.0.1:8787/healthz
```

Expect `"anthropic": true` and `"playwright": true`.

### Desktop smoke test

1. Start the desktop app (`cd desktop && npm run dev`).
2. Connect to `http://127.0.0.1:8787` (Settings → server URL).
3. Open a project and run a browser task, e.g. *"Search Google for Product Hunt"*.
4. Confirm live frames in the browser canvas, approval cards for clicks/types, and **Stop** works.

### Safety knobs

| Env | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_BROWSER_MODEL` | `claude-sonnet-4-6` | Model for the tool loop |
| `BROWSER_MAX_STEPS` | `40` | Hard cap on agent steps |
| `BROWSER_APPROVAL_TIMEOUT_MS` | `120000` | Auto-reject pending approvals |
| `BROWSER_STRICT_ALLOWLIST` | off | When `1`, only `BROWSER_ALLOW_HOSTS` may load |
| `BROWSER_ALLOW_HOSTS` | google, reddit, … | Suffix list for strict mode |

Credential fields, payment sites, and common login hosts are always blocked. Mutating actions
(clicks, typing) require user approval unless the desktop **Auto-approve** toggle is on.

## Docker

```bash
cd server
docker build -t marketing-ide-server .
docker run --rm -p 8787:8787 \
  -e HOST=0.0.0.0 \
  -e ANTHROPIC_API_KEY=sk-... \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e SUPABASE_JWT_SECRET=... \
  marketing-ide-server
```

Use Fly.io or Railway with the same env vars. Set `CORS_ORIGINS` if a web client sends an Origin header.

## Deploy env matrix

| Variable | Required | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes (hosted) | Computer Use + default LLM |
| `OPENAI_API_KEY` | no | Optional second provider |
| `SUPABASE_URL` | yes (hosted) | Postgres + Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (hosted) | Server DB writes |
| `SUPABASE_JWT_SECRET` | yes (hosted) | Verify user JWTs |
| `SUPABASE_ANON_KEY` | yes | Exposed via `/config` for desktop OTP |
| `HOST` | prod | `0.0.0.0` |
| `PORT` | no | default `8787` |
| `CORS_ORIGINS` | optional | comma-separated allowlist |
| `DEV_NO_AUTH` | dev only | never in production |
