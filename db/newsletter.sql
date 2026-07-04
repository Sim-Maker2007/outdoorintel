-- Newsletter subscribers. Run in the Supabase SQL editor (same project as
-- db/community-intel.sql). Writes happen only through the service role in
-- api/newsletter/subscribe.js; the anon key can neither read nor write.

create table if not exists newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  lang        text not null default 'en' check (lang in ('en', 'fr')),
  source      text not null default 'site',
  ip_hash     text,
  confirmed   boolean not null default false,
  created_at  timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table newsletter_subscribers enable row level security;
-- No policies on purpose: anon/authenticated get no access at all.
-- The service role bypasses RLS.

create index if not exists idx_newsletter_created on newsletter_subscribers (created_at desc);
create index if not exists idx_newsletter_ip on newsletter_subscribers (ip_hash, created_at desc);

-- Export for your mailer:
--   select email from newsletter_subscribers where unsubscribed_at is null and lang = 'en';
