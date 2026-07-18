-- Faz A: Stripe billing fields on profiles
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text;

create unique index if not exists profiles_stripe_customer_id_uidx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
