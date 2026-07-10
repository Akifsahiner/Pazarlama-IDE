-- Marketing IDE — Runs + Run Events (Execution Canvas / Run Event Bus).
--
-- Apply via the Supabase SQL editor or `supabase db push`.
--
-- A "run" is one agent execution (e.g. "prepare landing for launch"). Every
-- execution source (Agent SDK host, tool calls, browser sandbox, file watcher)
-- emits RunEvents with a monotonic per-run `seq`, so clients can replay from a
-- given `afterSeq` after a disconnect/reload without losing or reordering steps.
--
-- Persistence is OPTIONAL: when Supabase is not configured the server keeps runs
-- in-memory (see server/src/runs/*). These tables enable cross-device history
-- and replay when persistence is on.

-- ---------------------------------------------------------------------------
-- runs: one row per agent execution.
-- ---------------------------------------------------------------------------
create table if not exists public.runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete set null,
  goal        text not null,
  status      text not null default 'created'
              check (status in ('created','planning','running','paused','completed','failed')),
  last_seq    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- run_events: append-only, ordered event log for a run.
-- (Never store large base64 browser frames here — the server strips frame
--  payloads before persisting, mirroring the messages table convention.)
-- ---------------------------------------------------------------------------
create table if not exists public.run_events (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.runs (id) on delete cascade,
  seq         int not null,
  step_id     text,
  type        text not null,
  status      text,
  title       text not null,
  summary     text,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  unique (run_id, seq)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists runs_user_id_idx        on public.runs (user_id);
create index if not exists runs_project_id_idx      on public.runs (project_id);
create index if not exists run_events_run_seq_idx   on public.run_events (run_id, seq);

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-scoped via the parent run.
-- ---------------------------------------------------------------------------
alter table public.runs enable row level security;
alter table public.run_events enable row level security;

create policy runs_owner on public.runs
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy run_events_owner on public.run_events
  using (
    exists (
      select 1 from public.runs r
      where r.id = run_events.run_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.runs r
      where r.id = run_events.run_id and r.user_id = auth.uid()
    )
  );
