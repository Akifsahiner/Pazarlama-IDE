-- Paddle billing fields + monthly included API cost budget (Cursor-style metering).
alter table public.profiles
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text,
  add column if not exists paddle_price_id text;

create unique index if not exists profiles_paddle_customer_id_uidx
  on public.profiles (paddle_customer_id)
  where paddle_customer_id is not null;

alter table public.quotas
  add column if not exists cost_budget_cents numeric(10, 2) not null default 0;
