-- Season Intel members (Stripe subscription). Run in the Supabase SQL editor
-- (same project as db/newsletter.sql). Writes happen only through the service
-- role in api/stripe/webhook.js and api/stripe/session.js.
--
-- If this table is not created yet, checkout still works: webhooks log the
-- event and /api/stripe/session sets a signed HttpOnly cookie. A durable
-- member store is the follow-up once live Stripe keys exist.

create table if not exists season_intel_members (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null unique,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text not null default 'active',
  lang                   text not null default 'en' check (lang in ('en', 'fr')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table season_intel_members enable row level security;
-- No policies on purpose: anon/authenticated get no access at all.
-- The service role bypasses RLS.

create index if not exists idx_si_members_customer on season_intel_members (stripe_customer_id);
create index if not exists idx_si_members_sub on season_intel_members (stripe_subscription_id);
create index if not exists idx_si_members_status on season_intel_members (status);
