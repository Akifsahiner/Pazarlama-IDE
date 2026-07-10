-- Faz 12 — Market: team, feedback, shared reports.
-- Apply after 0006. Server uses service role; RLS owner-scoped.

-- ---------------------------------------------------------------------------
-- feedback_events (12D)
-- ---------------------------------------------------------------------------
create table if not exists public.feedback_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  project_id   uuid references public.projects (id) on delete set null,
  target_kind  text not null check (target_kind in ('decision', 'draft', 'run', 'plan_task')),
  target_id    text not null,
  rating       smallint not null check (rating in (-1, 1)),
  comment      text,
  skill_id     text,
  discipline   text,
  created_at   timestamptz not null default now()
);

create index if not exists feedback_events_user_created_idx
  on public.feedback_events (user_id, created_at desc);
create index if not exists feedback_events_skill_idx
  on public.feedback_events (skill_id, created_at desc);

alter table public.feedback_events enable row level security;
create policy feedback_events_owner on public.feedback_events
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- organizations + members (12B)
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  tier       text not null default 'team',
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'admin', 'editor', 'approver', 'viewer')),
  joined_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'editor', 'approver', 'viewer')),
  added_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists org_members_user_idx on public.org_members (user_id);
create index if not exists project_members_user_idx on public.project_members (user_id);

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.project_members enable row level security;

create policy organizations_owner on public.organizations
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy org_members_self on public.org_members
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy project_members_self on public.project_members
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- approval_requests (12B)
-- ---------------------------------------------------------------------------
create table if not exists public.approval_requests (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  requested_by  uuid not null references auth.users (id) on delete cascade,
  reviewer_id   uuid references auth.users (id) on delete set null,
  run_id        text,
  plan_task_id  text,
  goal          text not null,
  status        text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  note          text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists approval_requests_project_status_idx
  on public.approval_requests (project_id, status);

alter table public.approval_requests enable row level security;
create policy approval_requests_participant on public.approval_requests
  using (
    requested_by = auth.uid()
    or reviewer_id = auth.uid()
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = approval_requests.project_id
        and pm.user_id = auth.uid()
        and pm.role in ('owner', 'admin', 'editor', 'approver')
    )
  );

-- ---------------------------------------------------------------------------
-- report_shares (12B client reports)
-- ---------------------------------------------------------------------------
create table if not exists public.report_shares (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  title       text not null,
  report_md   text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists report_shares_token_idx on public.report_shares (token);

alter table public.report_shares enable row level security;
create policy report_shares_owner on public.report_shares
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tier seed: pro users keep existing quotas; free tier enforced server-side (0 AI).
