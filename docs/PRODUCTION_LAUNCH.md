# Production launch checklist

Marketing IDE commercial launch: Paddle billing, token metering, pricing site, desktop download.

## 1. Supabase (database + auth)

1. Create production Supabase project.
2. Run migrations in order: `server/supabase/migrations/0001_init.sql` through `0009_billing_paddle_cost_budget.sql`.
3. Enable Google OAuth (or email magic link) in Supabase Auth.
4. Set redirect URL: `marketingide://auth/callback` for desktop deep link.

## 2. Paddle

1. Create Paddle account (sandbox first, then production).
2. Create products:
   - **Pro** — $20/month recurring
   - **Team** — $49/month recurring
3. Copy price IDs to `PADDLE_PRICE_PRO` and `PADDLE_PRICE_TEAM`.
4. Webhook endpoint: `https://api.marketingide.app/billing/webhook`
   - Events: `subscription.activated`, `subscription.updated`, `subscription.canceled`, `transaction.completed`
5. Set `PADDLE_WEBHOOK_SECRET` from Paddle dashboard.
6. Customer portal: enable in Paddle → customers can manage subscription from desktop Settings.

## 3. Server deploy

1. Copy `server/.env.example` → `server/.env` (never commit).
2. Required vars: `SUPABASE_*`, `ANTHROPIC_API_KEY`, `PADDLE_*`, `CORS_ORIGINS`.
3. Deploy to `api.marketingide.app` (Railway, Fly.io, or similar).
4. Verify:
   - `GET /me` returns tier + quota + `cost_budget_cents`
   - `POST /billing/checkout` returns Paddle checkout URL (authenticated)
   - Webhook signature verification passes (Paddle simulator)

## 4. Website (Vercel)

1. Deploy `src/` (Next.js marketing site) to `marketingide.app`.
2. Pages live: `/`, `/download`, `/pricing`.
3. Update `src/lib/download.ts` if release asset names change.

## 5. Desktop release

1. Tag release on GitHub → CI builds installers.
2. Verify deep links:
   - `marketingide://auth/callback` — sign-in
   - `marketingide://billing/success` — refresh tier after Paddle checkout
3. Default server URL in desktop settings → production API.

## 6. Metering model (Cursor-style)

| Tier | Monthly subscription | Included API budget | Turn limits |
|------|---------------------|---------------------|-------------|
| Free | $0 | $0 | 0 AI |
| Pro | $20 | ~$15 | 20 plans / 200 agent / 30 browser min |
| Team | $49 | ~$40 | 60 / 600 / 90 |

- Token cost estimated at Anthropic list rates (`server/src/billing/pricing.ts`).
- When `cost_cents >= cost_budget_cents`, API returns `429 cost_budget_exceeded`.
- Margin: subscription price minus included API budget.

## 7. Smoke test (founder)

1. Download app → sign in → free tier (scan only).
2. Upgrade to Pro via Settings → Paddle checkout → return to app → tier updates.
3. Run plan + agent → usage bars move in Settings → Usage.
4. Hit limit → clear upgrade message (not silent failure).

## 8. Dogfood gate

Do **not** start Part 20 cohort until golden-path dogfood PASS. This doc covers commercial infra only.
