-- Marketing IDE — Phase 2 initial schema + Row Level Security.
--
-- Apply via the Supabase SQL editor (Dashboard → SQL → New query → paste → Run)
-- or `supabase db push` if you use the Supabase CLI.
--
-- All app tables are owned by a user (auth.users). RLS ensures a JWT can only
-- ever touch its own rows. The server uses the SERVICE ROLE key, which bypasses
-- RLS, so it is responsible for scoping every query by user_id explicitly.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user. Created lazily on first /me call.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  tier       text not null default 'free',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- projects: a connected codebase / site the user is marketing.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  source_kind  text not null check (source_kind in ('folder', 'repo', 'url')),
  source_ref   text not null,
  framework    text,
  product_type text,
  profile_json jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- plans: generated marketing launch plans.
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  plan_json  jsonb not null,
  status     text not null default 'complete',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sessions: an agent chat thread scoped to a project.
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default 'New session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- messages: ordered turns within a session. Ownership derives from the session.
-- (Never store large base64 browser frames here — the server strips them.)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions (id) on delete cascade,
  role         text not null check (role in ('user', 'agent', 'system')),
  kind         text,
  content_json jsonb not null,
  ts           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- assets: marketing deliverables produced by the agent (diffable).
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid references public.sessions (id) on delete set null,
  project_id     uuid not null references public.projects (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  type           text,
  target_file    text,
  before_text    text,
  after_text     text not null,
  applied_at     timestamptz,
  applied_commit text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- usage_events: append-only metering for tokens / browser minutes / cost.
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text,
  tokens_in  int not null default 0,
  tokens_out int not null default 0,
  browser_ms int not null default 0,
  cost_cents numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- quotas: per-user monthly limits. Created lazily on first /me call.
-- ---------------------------------------------------------------------------
create table if not exists public.quotas (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  period_start      date not null default date_trunc('month', now())::date,
  plan_limit        int not null default 20,
  agent_limit       int not null default 200,
  browser_min_limit int not null default 30
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists projects_user_id_idx       on public.projects (user_id);
create index if not exists plans_project_id_idx        on public.plans (project_id);
create index if not exists sessions_project_id_idx     on public.sessions (project_id);
create index if not exists messages_session_id_idx     on public.messages (session_id);
create index if not exists assets_project_id_idx       on public.assets (project_id);
create index if not exists usage_events_user_created_idx on public.usage_events (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security: each table is owner-scoped to auth.uid().
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.plans enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.assets enable row level security;
alter table public.usage_events enable row level security;
alter table public.quotas enable row level security;

-- profiles + quotas key on id / user_id == auth.uid()
create policy profiles_owner on public.profiles
  using (id = auth.uid()) with check (id = auth.uid());

create policy quotas_owner on public.quotas
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy projects_owner on public.projects
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy plans_owner on public.plans
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy sessions_owner on public.sessions
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages: ownership derives from the parent session.
create policy messages_owner on public.messages
  using (
    exists (
      select 1 from public.sessions s
      where s.id = messages.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = messages.session_id and s.user_id = auth.uid()
    )
  );

create policy assets_owner on public.assets
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy usage_events_owner on public.usage_events
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- NOTE: profiles and quotas rows are created on the first GET /me call by the
-- server using the service role (see server/src/db/repos/profiles.ts), so no
-- auth.users trigger is required.
