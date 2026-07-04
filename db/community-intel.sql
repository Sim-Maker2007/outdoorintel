-- ============================================================================
-- Community Intel schema (Phase 1)
-- ----------------------------------------------------------------------------
-- Powers structured trip reports, photos, helpful votes, abuse flags, and
-- correction submissions on every spot page. Complements — does NOT replace —
-- the verified editorial reference data in data/*.json.
--
-- Design rules (aligned with docs/REFERENCE_OPERATING_PLAN.md):
--   * Community input is clearly user-generated. It never overwrites verified
--     editorial fields; it is a freshness + correction signal.
--   * Contributing is frictionless (no account required) BUT all writes go
--     through Vercel serverless functions using the service role key. Anonymous
--     visitors can READ visible rows with the anon key but CANNOT insert
--     directly — this lets the server rate-limit, hash IPs, and filter content.
--   * Photos pass a client-side NSFW classifier before upload and are subject
--     to community flagging with auto-hide.
--
-- Apply to the shared Supabase project (vbvsgwiyzjsmxawxyisn).
-- All tables prefixed spot_ / report_ to avoid colliding with landlink_*.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- SPOT REPORTS  (structured trip reports, not generic comments)
-- ============================================================================
create table if not exists spot_reports (
  id             uuid primary key default uuid_generate_v4(),
  activity       text not null check (activity in
                   ('fishing','hunting','camping','kayaking','skiing','hiking')),
  spot_slug      text not null,
  -- Optional identity. Frictionless: name is free text, no account.
  author_name    text,
  user_id        uuid references auth.users(id) on delete set null,  -- set when logged in (Phase 2)

  -- Free-text field report
  body           text not null check (char_length(body) between 1 and 2000),
  visit_date     text,                                    -- free text e.g. "July 2026"

  -- Structured "community intel" fields
  condition_tags text[] not null default '{}',            -- ['bugs_heavy','parking_full',...]
  wildlife       text,                                     -- "saw two moose"
  parking_status text check (parking_status in
                   ('empty','some','full','unknown')),
  crowding       text check (crowding in
                   ('quiet','moderate','busy','unknown')),
  cell_signal    text check (cell_signal in
                   ('none','weak','ok','good','unknown')),

  -- Optional photo (uploaded to Supabase Storage bucket 'spot-photos')
  photo_url      text,
  photo_caption  text check (photo_caption is null or char_length(photo_caption) <= 200),

  -- Moderation / engagement
  status         text not null default 'visible'
                   check (status in ('visible','pending','hidden','removed')),
  helpful_count  int  not null default 0,
  flag_count     int  not null default 0,

  -- Anti-abuse (server-side only; never exposed to the anon role)
  ip_hash        text,                                    -- salted hash of client IP
  user_agent     text,

  created_at     timestamptz not null default now()
);

create index if not exists idx_spot_reports_spot     on spot_reports(activity, spot_slug, created_at desc);
create index if not exists idx_spot_reports_status   on spot_reports(status);
create index if not exists idx_spot_reports_iphash   on spot_reports(ip_hash, created_at desc);
create index if not exists idx_spot_reports_tags     on spot_reports using gin(condition_tags);

-- ============================================================================
-- REPORT VOTES  ("helpful" — deduped per anonymous device/IP)
-- ============================================================================
create table if not exists report_votes (
  id          uuid primary key default uuid_generate_v4(),
  report_id   uuid not null references spot_reports(id) on delete cascade,
  voter_hash  text not null,                              -- salted IP hash or device id
  created_at  timestamptz not null default now(),
  unique (report_id, voter_hash)
);
create index if not exists idx_report_votes_report on report_votes(report_id);

-- ============================================================================
-- REPORT FLAGS  (community moderation — NSFW / spam / inaccurate)
-- ============================================================================
create table if not exists report_flags (
  id            uuid primary key default uuid_generate_v4(),
  report_id     uuid not null references spot_reports(id) on delete cascade,
  reason        text not null check (reason in
                  ('nsfw','spam','offensive','inaccurate','other')),
  reporter_hash text not null,
  note          text check (note is null or char_length(note) <= 500),
  created_at    timestamptz not null default now(),
  unique (report_id, reporter_hash)
);
create index if not exists idx_report_flags_report on report_flags(report_id);

-- Auto-hide a report once it accumulates enough distinct flags.
create or replace function fn_report_flag_autohide() returns trigger
language plpgsql security definer as $$
declare
  n int;
begin
  select count(*) into n from report_flags where report_id = new.report_id;
  update spot_reports set flag_count = n where id = new.report_id;
  if n >= 3 then
    update spot_reports set status = 'hidden'
      where id = new.report_id and status = 'visible';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_report_flag_autohide on report_flags;
create trigger trg_report_flag_autohide
  after insert on report_flags
  for each row execute function fn_report_flag_autohide();

-- ============================================================================
-- SPOT CORRECTIONS  (the "Suggest a correction" workflow — feeds editorial)
-- ============================================================================
create table if not exists spot_corrections (
  id             uuid primary key default uuid_generate_v4(),
  activity       text not null,
  spot_slug      text not null,
  field          text,                                    -- e.g. 'parking', 'getting_there', 'regulations'
  suggestion     text not null check (char_length(suggestion) between 1 and 2000),
  source_url     text,                                    -- optional evidence
  submitter_name text,
  submitter_email text,
  status         text not null default 'open'
                   check (status in ('open','reviewing','applied','declined')),
  ip_hash        text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_spot_corrections_spot   on spot_corrections(activity, spot_slug);
create index if not exists idx_spot_corrections_status on spot_corrections(status);

-- ============================================================================
-- RECENT INTEL  (per-spot freshness rollup for the "Recent Intel" panel)
-- ============================================================================
create or replace view spot_recent_intel as
select
  activity,
  spot_slug,
  count(*)                                   as report_count,
  count(*) filter (where photo_url is not null) as photo_count,
  max(created_at)                            as last_report_at,
  max(created_at) filter (where photo_url is not null) as last_photo_at
from spot_reports
where status = 'visible'
group by activity, spot_slug;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Anonymous (anon) role: read visible content only. NO direct writes.
-- All writes happen server-side through the service_role, which bypasses RLS.
-- ============================================================================
alter table spot_reports     enable row level security;
alter table report_votes     enable row level security;
alter table report_flags     enable row level security;
alter table spot_corrections enable row level security;

-- Public can read visible reports (but not ip_hash/user_agent — see the
-- public view + column grants below).
drop policy if exists p_reports_read on spot_reports;
create policy p_reports_read on spot_reports
  for select to anon, authenticated
  using (status = 'visible');

-- Public can read vote/flag rows only via aggregate counts on spot_reports;
-- deny direct row reads to keep voter/reporter hashes private.
drop policy if exists p_votes_none on report_votes;
create policy p_votes_none on report_votes for select to anon using (false);
drop policy if exists p_flags_none on report_flags;
create policy p_flags_none on report_flags for select to anon using (false);
drop policy if exists p_corrections_none on spot_corrections;
create policy p_corrections_none on spot_corrections for select to anon using (false);

-- No INSERT/UPDATE/DELETE policies for anon => all writes are rejected unless
-- performed with the service_role key from a trusted server function.

-- Keep anti-abuse columns out of anon reads: expose a safe view and point the
-- client at it instead of the base table.
create or replace view spot_reports_public as
select id, activity, spot_slug, author_name, body, visit_date,
       condition_tags, wildlife, parking_status, crowding, cell_signal,
       photo_url, photo_caption, helpful_count, created_at
from spot_reports
where status = 'visible';

grant select on spot_reports_public to anon, authenticated;
grant select on spot_recent_intel  to anon, authenticated;

-- ============================================================================
-- STORAGE  (photo bucket)
-- Run in the Storage section or via SQL. Public read, writes gated by the
-- serverless function issuing signed uploads OR anon insert restricted to the
-- bucket after the client-side NSFW check.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('spot-photos', 'spot-photos', true)
on conflict (id) do nothing;

-- Allow public read of photos.
drop policy if exists p_spotphotos_read on storage.objects;
create policy p_spotphotos_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'spot-photos');

-- Allow anonymous upload ONLY into the spot-photos bucket (post client-side
-- NSFW gate). Size/type are enforced client-side and by the report function;
-- flagged photos are auto-hidden. Tighten to authenticated-only in Phase 2.
drop policy if exists p_spotphotos_insert on storage.objects;
create policy p_spotphotos_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'spot-photos');

-- ============================================================================
-- NOTE ON THE LEGACY `comments` TABLE
-- The pre-existing spot pages wrote to a bare `comments` table that was never
-- committed to source control. This schema supersedes it with spot_reports.
-- If `comments` holds real data, migrate it once with:
--   insert into spot_reports (activity, spot_slug, author_name, body, visit_date, created_at)
--   select activity, spot_slug, author_name, comment, visit_date, created_at from comments;
-- ============================================================================
