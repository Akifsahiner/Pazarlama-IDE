-- Plan task progress — per-plan, per-task execution state (living plan).

create table if not exists public.plan_task_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  plan_id       uuid not null references public.plans (id) on delete cascade,
  task_id       text not null,
  status        text not null default 'pending'
    check (status in ('pending','running','done','failed','skipped','blocked')),
  last_run_id   uuid references public.runs (id) on delete set null,
  started_at    timestamptz,
  completed_at  timestamptz,
  note          text,
  updated_at    timestamptz not null default now(),
  unique (plan_id, task_id)
);

create index if not exists plan_task_progress_plan_idx
  on public.plan_task_progress (plan_id);

create index if not exists plan_task_progress_project_idx
  on public.plan_task_progress (project_id, plan_id);

alter table public.plan_task_progress enable row level security;

create policy plan_task_progress_owner on public.plan_task_progress
  using (user_id = auth.uid()) with check (user_id = auth.uid());
