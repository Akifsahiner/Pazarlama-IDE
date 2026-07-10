-- Runs activity hub: kind, session/plan links, summary for timeline UI.

alter table public.runs
  add column if not exists kind text not null default 'edit'
    check (kind in ('edit', 'browse', 'ask'));

alter table public.runs
  add column if not exists session_id uuid references public.sessions (id) on delete set null;

alter table public.runs
  add column if not exists plan_task_id text;

alter table public.runs
  add column if not exists summary_json jsonb not null default '{}';

alter table public.runs
  add column if not exists local_run_id text;

create index if not exists runs_user_project_created_idx
  on public.runs (user_id, project_id, created_at desc);

create index if not exists runs_kind_idx on public.runs (kind);
