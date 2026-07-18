-- Per-IP usage log for the AI endpoints (Scout planner, Ask-this-spot,
-- smart search, conditions, trip brief). Used only for rate limiting; stores a
-- salted IP hash, never a raw IP. Run once in the Supabase SQL editor.

create table if not exists public.ai_usage (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  endpoint   text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_ip_time_idx
  on public.ai_usage (ip_hash, created_at desc);

-- Service role writes/reads only (functions use the service key, bypassing RLS).
alter table public.ai_usage enable row level security;

-- Optional housekeeping: drop rows older than a day.
-- delete from public.ai_usage where created_at < now() - interval '1 day';
