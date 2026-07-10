-- Marketing IDE — Marketing Brain structured project memory.
--
-- One profile per (user, project). Stored as jsonb for evolving shape; Zod
-- validates on read/write. Owner-scoped RLS like the rest of the schema.

create table if not exists public.marketing_profiles (
  user_id      uuid not null references auth.users (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  profile_json jsonb not null default '{}',
  updated_at   timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists marketing_profiles_user_idx
  on public.marketing_profiles (user_id);

alter table public.marketing_profiles enable row level security;

create policy marketing_profiles_owner on public.marketing_profiles
  using (user_id = auth.uid()) with check (user_id = auth.uid());
