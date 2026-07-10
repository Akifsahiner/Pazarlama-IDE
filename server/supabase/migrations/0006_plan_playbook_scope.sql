-- Optional playbook scope on task progress (Plan Studio v2)
alter table public.plan_task_progress
  add column if not exists playbook_id text;

create index if not exists plan_task_progress_playbook_idx
  on public.plan_task_progress (plan_id, playbook_id);
