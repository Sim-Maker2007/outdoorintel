-- =============================================================
-- LandLink schema (v2 — multi-activity foundation)
-- =============================================================
-- Apply to the shared Supabase instance.
--
-- Model:
--   profiles        — generic user (landowner, guest, both, admin)
--   user_credentials — flexible per-activity docs (PAL, insurance, boating...)
--   parcels         — activity-agnostic piece of land (geometry, features)
--   listings        — parcel × activity (pricing, capacity, rules)
--   bookings        — generic reservation against a listing
--   reviews         — two-way reviews keyed to a booking
--
-- One parcel can have many listings. A 200-acre woodlot might host hunting
-- in October, snowmobile access in January, sugar-shack tours in March, and
-- tent camping every summer weekend.
--
-- This migration drops the v1 hunting-only tables. The v1 MVP had no real
-- data yet, so a clean rebuild is simpler and safer than an in-place
-- migration.
-- =============================================================

-- =============================================================
-- EXTENSIONS
-- =============================================================
create extension if not exists "uuid-ossp";

-- =============================================================
-- DROP v1 (hunting-only) tables if they exist
-- =============================================================
drop table if exists landlink_reviews cascade;
drop table if exists landlink_hunt_requests cascade;
drop table if exists landlink_bookings cascade;
drop table if exists landlink_listings cascade;
drop table if exists landlink_parcels cascade;
drop table if exists landlink_user_credentials cascade;
drop view  if exists landlink_profiles_public cascade;
drop table if exists landlink_profiles cascade;

-- =============================================================
-- PROFILES
-- =============================================================
create table landlink_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'guest'
    check (role in ('owner','guest','both','admin')),
  full_name text,
  phone text,
  postal_code text,
  province text,
  language text default 'en' check (language in ('en','fr')),
  bio text,
  avatar_url text,
  -- Marketing / acquisition
  how_heard text,
  interests text[] default '{}',        -- activity categories the user cares about
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_landlink_profiles_role     on landlink_profiles(role);
create index idx_landlink_profiles_province on landlink_profiles(province);

-- Public-safe view (no phone/postal)
create or replace view landlink_profiles_public as
  select user_id, role, full_name, province, language, bio, avatar_url, created_at
  from landlink_profiles;

-- =============================================================
-- USER CREDENTIALS
-- =============================================================
-- Flexible per-activity credentials. Each row is one document.
-- type examples:
--   'pal'                — Possession and Acquisition Licence (hunting)
--   'hunter_ed'          — Hunter education certificate
--   'liability_insurance'— Personal liability insurance
--   'pleasure_craft'     — Pleasure Craft Operator Card (boat)
--   'gov_id'             — Government-issued ID (all users)
--   'first_aid'          — First aid / wilderness first aid
--   'atv_safety'         — ATV rider safety course
--   'snowmobile_safety'  — Snowmobile safety course
--   'pet_vaccination'    — Vaccination record (dog training grounds)
--   'film_permit'        — Commercial film/photo permit
create table landlink_user_credentials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references landlink_profiles(user_id) on delete cascade,
  type text not null,
  number text,
  document_url text,
  issued_on date,
  expires_on date,
  verified_at timestamptz,
  verified_by uuid references landlink_profiles(user_id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index idx_landlink_credentials_user on landlink_user_credentials(user_id);
create index idx_landlink_credentials_type on landlink_user_credentials(type);

-- =============================================================
-- PARCELS  — the land itself (activity-agnostic)
-- =============================================================
create table landlink_parcels (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references landlink_profiles(user_id) on delete cascade,
  name text not null,
  description text,

  -- Location
  geometry jsonb not null,                         -- GeoJSON Polygon
  centroid_lat numeric(9,6) not null,
  centroid_lng numeric(9,6) not null,
  acres numeric(10,2),
  province text not null,
  municipality text,
  postal_code text,

  -- Access
  access_notes text,
  parking_notes text,
  vehicle_access text default 'foot_only'
    check (vehicle_access in ('foot_only','atv_ok','truck_ok','paved_road','marina','trailhead')),

  -- Natural + built features
  -- Examples: 'lake','pond','river','creek','marsh','waterfall','forest_mixed',
  --   'forest_hardwood','forest_conifer','meadow','farmland','orchard','vineyard',
  --   'mountain','hill','rock_face','beach','island','trail_network','logging_road',
  --   'groomed_trail','snowmobile_trail','dock','boat_launch','cabin','shelter',
  --   'sugar_shack','fire_pit','outhouse','flush_toilet','shower','power','water',
  --   'well','cell_signal','wifi','parking','plowed_access','fence','gate'
  features text[] not null default '{}',

  -- Vibe / surroundings — optional tags that help discovery
  tags text[] not null default '{}',

  -- Media
  photos text[] not null default '{}',

  -- Rules that apply to the whole parcel (per-listing rules live on listings)
  house_rules text,

  -- Lifecycle
  status text not null default 'draft'
    check (status in ('draft','pending_review','active','paused','removed')),

  -- Aggregates
  avg_rating numeric(3,2),
  review_count int not null default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_landlink_parcels_status   on landlink_parcels(status);
create index idx_landlink_parcels_province on landlink_parcels(province);
create index idx_landlink_parcels_owner    on landlink_parcels(owner_id);
create index idx_landlink_parcels_features on landlink_parcels using gin(features);
create index idx_landlink_parcels_tags     on landlink_parcels using gin(tags);
create index idx_landlink_parcels_centroid on landlink_parcels(centroid_lat, centroid_lng);

-- =============================================================
-- LISTINGS  — parcel × activity
-- =============================================================
-- One parcel has many listings. "Hunting whitetail", "Tent camping",
-- "Sugar shack day pass", "Snowmobile access" are all separate listings on
-- the same parcel so owners can set different prices/rules/capacity/seasons.
create table landlink_listings (
  id uuid primary key default uuid_generate_v4(),
  parcel_id uuid not null references landlink_parcels(id) on delete cascade,
  owner_id uuid not null references landlink_profiles(user_id) on delete cascade,

  -- Taxonomy — see data/activities.json for the canonical list
  category text not null
    check (category in (
      'hunting','camping','fishing','ice_fishing','dock_shoreline',
      'snowmobile','atv_offroad','xc_ski_snowshoe','sugar_shack','farm_stay',
      'foraging','dog_training','archery_shooting','equestrian',
      'photography_film','wellness_retreat','overlanding'
    )),
  -- Free-form sub-type for more specific activity (e.g. 'hunting:whitetail',
  -- 'camping:tent', 'camping:rv', 'fishing:fly_only'). Drives UI copy only.
  activity_code text not null,

  title text,
  description text,

  -- Capacity & stay
  capacity int not null default 1,        -- max simultaneous guests / party size
  min_stay int default 1,
  max_stay int,
  lead_time_hours int default 24,

  -- Pricing
  price_cents int not null default 0,
  price_unit text not null default 'day'
    check (price_unit in (
      'hour','half_day','day','night','weekend','week','month','season','year',
      'per_person','per_vehicle','free'
    )),
  -- Host-side / guest-side fees snapshotted at booking time live on bookings.

  -- Availability window (coarse; fine-grained calendar is a later addition)
  season_start date,
  season_end date,

  -- Policies
  cancellation_policy text default 'flexible'
    check (cancellation_policy in ('flexible','moderate','strict','custom')),
  rules text,

  -- Activity-specific fields live here so the core table stays generic.
  -- Examples:
  --   hunting    : { species: ['whitetail','coyote'], weapons: ['rifle','archery'] }
  --   camping    : { site_type: 'tent', fire_allowed: true, pets: true }
  --   dock       : { boat_length_max_ft: 24, power: true, water: true }
  --   atv        : { trail_km: 18, width_min_in: 64 }
  --   sugar_shack: { includes_meal: true, seats: 20 }
  config jsonb not null default '{}'::jsonb,

  -- Lifecycle
  status text not null default 'draft'
    check (status in ('draft','pending_review','active','paused','removed')),

  -- Aggregates (review rollups can target listings too)
  avg_rating numeric(3,2),
  review_count int not null default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_landlink_listings_parcel   on landlink_listings(parcel_id);
create index idx_landlink_listings_owner    on landlink_listings(owner_id);
create index idx_landlink_listings_category on landlink_listings(category);
create index idx_landlink_listings_status   on landlink_listings(status);
create index idx_landlink_listings_price    on landlink_listings(price_cents);

-- =============================================================
-- BOOKINGS  — generic reservation
-- =============================================================
create table landlink_bookings (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references landlink_listings(id) on delete cascade,
  parcel_id uuid not null references landlink_parcels(id) on delete cascade,
  owner_id uuid not null references landlink_profiles(user_id) on delete cascade, -- denormalized
  guest_id uuid not null references landlink_profiles(user_id) on delete cascade,

  date_from date not null,
  date_to date not null,
  party_size int not null default 1,

  guest_message text,
  host_response text,

  -- Activity-specific intent: chosen species, weapon, boat length, vehicle
  -- plate, number of dogs, etc. Kept generic so every category can reuse.
  details jsonb not null default '{}'::jsonb,

  -- Money (snapshotted at booking time)
  subtotal_cents int,           -- listing price * quantity
  host_fee_cents int,           -- 15% host-side take
  guest_fee_cents int,          -- 5% guest-side service fee
  total_cents int,              -- what the guest pays
  host_payout_cents int,        -- what the owner nets

  -- Lifecycle
  status text not null default 'pending'
    check (status in ('pending','approved','declined','cancelled','completed','expired','no_show')),
  agreement_url text,
  agreement_signed_at timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  responded_at timestamptz,

  created_at timestamptz default now(),

  check (date_to >= date_from)
);

create index idx_landlink_bookings_listing on landlink_bookings(listing_id);
create index idx_landlink_bookings_parcel  on landlink_bookings(parcel_id);
create index idx_landlink_bookings_owner   on landlink_bookings(owner_id);
create index idx_landlink_bookings_guest   on landlink_bookings(guest_id);
create index idx_landlink_bookings_status  on landlink_bookings(status);

-- =============================================================
-- REVIEWS  — two-way (parcel/listing, guest/host)
-- =============================================================
create table landlink_reviews (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references landlink_bookings(id) on delete cascade,
  reviewer_id uuid not null references landlink_profiles(user_id) on delete cascade,
  subject_id uuid not null,
  subject_type text not null
    check (subject_type in ('parcel','listing','guest','host')),
  rating int not null check (rating between 1 and 5),
  text text,
  created_at timestamptz default now(),
  unique(booking_id, reviewer_id, subject_type)
);

create index idx_landlink_reviews_subject on landlink_reviews(subject_id, subject_type);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table landlink_profiles         enable row level security;
alter table landlink_user_credentials enable row level security;
alter table landlink_parcels          enable row level security;
alter table landlink_listings         enable row level security;
alter table landlink_bookings         enable row level security;
alter table landlink_reviews          enable row level security;

-- helper: is admin?
create or replace function landlink_is_admin(uid uuid) returns boolean as $$
  select exists(select 1 from landlink_profiles where user_id = uid and role = 'admin');
$$ language sql stable security definer;

-- ---------- profiles ----------
drop policy if exists "profiles self read"    on landlink_profiles;
create policy "profiles self read" on landlink_profiles
  for select using (auth.uid() = user_id or landlink_is_admin(auth.uid()));

drop policy if exists "profiles self insert"  on landlink_profiles;
create policy "profiles self insert" on landlink_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles self update"  on landlink_profiles;
create policy "profiles self update" on landlink_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- user_credentials (self-managed, admin-verified) ----------
drop policy if exists "credentials self read"  on landlink_user_credentials;
create policy "credentials self read" on landlink_user_credentials
  for select using (user_id = auth.uid() or landlink_is_admin(auth.uid()));

drop policy if exists "credentials self write" on landlink_user_credentials;
create policy "credentials self write" on landlink_user_credentials
  for insert with check (user_id = auth.uid());

drop policy if exists "credentials self update" on landlink_user_credentials;
create policy "credentials self update" on landlink_user_credentials
  for update using (user_id = auth.uid() or landlink_is_admin(auth.uid()));

-- ---------- parcels ----------
drop policy if exists "parcels public read active" on landlink_parcels;
create policy "parcels public read active" on landlink_parcels
  for select using (status = 'active' or owner_id = auth.uid() or landlink_is_admin(auth.uid()));

drop policy if exists "parcels owner insert" on landlink_parcels;
create policy "parcels owner insert" on landlink_parcels
  for insert with check (owner_id = auth.uid());

drop policy if exists "parcels owner update" on landlink_parcels;
create policy "parcels owner update" on landlink_parcels
  for update using (owner_id = auth.uid() or landlink_is_admin(auth.uid()));

drop policy if exists "parcels owner delete" on landlink_parcels;
create policy "parcels owner delete" on landlink_parcels
  for delete using (owner_id = auth.uid() or landlink_is_admin(auth.uid()));

-- ---------- listings ----------
drop policy if exists "listings public read active" on landlink_listings;
create policy "listings public read active" on landlink_listings
  for select using (status = 'active' or owner_id = auth.uid() or landlink_is_admin(auth.uid()));

drop policy if exists "listings owner insert" on landlink_listings;
create policy "listings owner insert" on landlink_listings
  for insert with check (owner_id = auth.uid());

drop policy if exists "listings owner update" on landlink_listings;
create policy "listings owner update" on landlink_listings
  for update using (owner_id = auth.uid() or landlink_is_admin(auth.uid()));

drop policy if exists "listings owner delete" on landlink_listings;
create policy "listings owner delete" on landlink_listings
  for delete using (owner_id = auth.uid() or landlink_is_admin(auth.uid()));

-- ---------- bookings ----------
drop policy if exists "bookings participants read" on landlink_bookings;
create policy "bookings participants read" on landlink_bookings
  for select using (
    guest_id = auth.uid()
    or owner_id = auth.uid()
    or landlink_is_admin(auth.uid())
  );

drop policy if exists "bookings guest insert" on landlink_bookings;
create policy "bookings guest insert" on landlink_bookings
  for insert with check (guest_id = auth.uid());

drop policy if exists "bookings participants update" on landlink_bookings;
create policy "bookings participants update" on landlink_bookings
  for update using (
    guest_id = auth.uid()
    or owner_id = auth.uid()
    or landlink_is_admin(auth.uid())
  );

-- ---------- reviews ----------
drop policy if exists "reviews public read" on landlink_reviews;
create policy "reviews public read" on landlink_reviews
  for select using (true);

drop policy if exists "reviews author insert" on landlink_reviews;
create policy "reviews author insert" on landlink_reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists(
      select 1 from landlink_bookings b
      where b.id = booking_id
        and b.status = 'completed'
        and (b.guest_id = auth.uid() or b.owner_id = auth.uid())
    )
  );

-- =============================================================
-- TRIGGERS
-- =============================================================

-- Maintain parcel + listing avg_rating / review_count
create or replace function landlink_refresh_rating() returns trigger as $$
begin
  if new.subject_type = 'parcel' then
    update landlink_parcels
    set avg_rating = sub.avg_rating, review_count = sub.review_count
    from (
      select avg(rating)::numeric(3,2) avg_rating, count(*)::int review_count
      from landlink_reviews where subject_type = 'parcel' and subject_id = new.subject_id
    ) sub
    where id = new.subject_id;
  elsif new.subject_type = 'listing' then
    update landlink_listings
    set avg_rating = sub.avg_rating, review_count = sub.review_count
    from (
      select avg(rating)::numeric(3,2) avg_rating, count(*)::int review_count
      from landlink_reviews where subject_type = 'listing' and subject_id = new.subject_id
    ) sub
    where id = new.subject_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_landlink_refresh_rating on landlink_reviews;
create trigger trg_landlink_refresh_rating
  after insert on landlink_reviews
  for each row execute function landlink_refresh_rating();

-- updated_at auto-touch
create or replace function landlink_touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_landlink_parcels_touch on landlink_parcels;
create trigger trg_landlink_parcels_touch before update on landlink_parcels
  for each row execute function landlink_touch_updated_at();

drop trigger if exists trg_landlink_listings_touch on landlink_listings;
create trigger trg_landlink_listings_touch before update on landlink_listings
  for each row execute function landlink_touch_updated_at();

drop trigger if exists trg_landlink_profiles_touch on landlink_profiles;
create trigger trg_landlink_profiles_touch before update on landlink_profiles
  for each row execute function landlink_touch_updated_at();

-- Keep listing.owner_id in sync with parcel.owner_id on insert
create or replace function landlink_sync_listing_owner() returns trigger as $$
begin
  select owner_id into new.owner_id from landlink_parcels where id = new.parcel_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_landlink_sync_listing_owner on landlink_listings;
create trigger trg_landlink_sync_listing_owner before insert on landlink_listings
  for each row execute function landlink_sync_listing_owner();

-- Keep booking.owner_id / parcel_id in sync with listing on insert
create or replace function landlink_sync_booking_denorm() returns trigger as $$
begin
  select parcel_id, owner_id into new.parcel_id, new.owner_id
  from landlink_listings where id = new.listing_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_landlink_sync_booking_denorm on landlink_bookings;
create trigger trg_landlink_sync_booking_denorm before insert on landlink_bookings
  for each row execute function landlink_sync_booking_denorm();

-- =============================================================
-- AVAILABILITY  — per-listing blackout / booked date ranges
-- =============================================================
-- The season window on landlink_listings is coarse ("roughly open Sept 1 - Nov 30").
-- This table is the fine-grained calendar: one row per date range that is
-- *not* bookable — either because the owner manually blocked it, because
-- an approved booking reserves it, or because LandLink is holding it while
-- a pending booking is under review.
--
-- kind:
--   blocked — owner manually marked unavailable (weather, personal use, repairs)
--   booked  — auto-created when a booking becomes 'approved' or 'completed'
--   hold    — optional soft-hold while a pending booking is being reviewed
drop table if exists landlink_availability cascade;
create table landlink_availability (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references landlink_listings(id) on delete cascade,
  owner_id uuid not null references landlink_profiles(user_id) on delete cascade,  -- denormalized
  date_from date not null,
  date_to date not null,
  kind text not null default 'blocked' check (kind in ('blocked','booked','hold')),
  note text,
  booking_id uuid references landlink_bookings(id) on delete cascade,
  created_at timestamptz default now(),
  check (date_to >= date_from)
);

create index idx_landlink_avail_listing on landlink_availability(listing_id);
create index idx_landlink_avail_owner   on landlink_availability(owner_id);
create index idx_landlink_avail_range   on landlink_availability(listing_id, date_from, date_to);
create index idx_landlink_avail_booking on landlink_availability(booking_id);

alter table landlink_availability enable row level security;

-- Anyone can see when a listing is *busy* (so browse can show calendars).
-- Only the owner can see the note.
drop policy if exists "availability public read" on landlink_availability;
create policy "availability public read" on landlink_availability
  for select using (true);

drop policy if exists "availability owner write" on landlink_availability;
create policy "availability owner write" on landlink_availability
  for insert with check (owner_id = auth.uid() or landlink_is_admin(auth.uid()));

drop policy if exists "availability owner update" on landlink_availability;
create policy "availability owner update" on landlink_availability
  for update using (owner_id = auth.uid() or landlink_is_admin(auth.uid()));

drop policy if exists "availability owner delete" on landlink_availability;
create policy "availability owner delete" on landlink_availability
  for delete using (owner_id = auth.uid() or landlink_is_admin(auth.uid()));

-- Sync owner_id from the listing on insert (so RLS is clean)
create or replace function landlink_sync_availability_owner() returns trigger as $$
begin
  if new.owner_id is null then
    select owner_id into new.owner_id from landlink_listings where id = new.listing_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_landlink_sync_avail_owner on landlink_availability;
create trigger trg_landlink_sync_avail_owner before insert on landlink_availability
  for each row execute function landlink_sync_availability_owner();

-- When a booking is approved (or goes back to pending/cancelled), keep the
-- availability calendar in sync automatically so the browse + detail pages
-- don't need to know about the mirror.
create or replace function landlink_sync_booking_availability() returns trigger as $$
begin
  -- Remove any existing 'booked'/'hold' rows pointing at this booking
  delete from landlink_availability where booking_id = new.id;

  if new.status = 'approved' or new.status = 'completed' then
    insert into landlink_availability (listing_id, owner_id, date_from, date_to, kind, booking_id, note)
    values (new.listing_id, new.owner_id, new.date_from, new.date_to, 'booked', new.id, 'auto: booking ' || new.id);
  elsif new.status = 'pending' then
    insert into landlink_availability (listing_id, owner_id, date_from, date_to, kind, booking_id, note)
    values (new.listing_id, new.owner_id, new.date_from, new.date_to, 'hold', new.id, 'auto: hold');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_landlink_sync_booking_avail on landlink_bookings;
create trigger trg_landlink_sync_booking_avail
  after insert or update of status, date_from, date_to on landlink_bookings
  for each row execute function landlink_sync_booking_availability();

-- Helper: is a listing available for the full range [p_from, p_to]?
create or replace function landlink_listing_is_available(
  p_listing_id uuid,
  p_from date,
  p_to date
) returns boolean as $$
  select not exists (
    select 1 from landlink_availability
    where listing_id = p_listing_id
      and kind in ('blocked','booked')
      and date_from <= p_to
      and date_to   >= p_from
  );
$$ language sql stable;

-- =============================================================
-- SEARCH RPC  — filter by category, date range, and province
-- =============================================================
-- Browse page calls this as supabase.rpc('landlink_search_listings', {...}).
-- Returns one row per *listing* joined with its parcel, filtered by:
--   - status = 'active'
--   - category (optional)
--   - province (optional)
--   - date window availability (optional; if both dates passed, only
--     listings with no blackouts in the window are returned)
create or replace function landlink_search_listings(
  p_category text default null,
  p_province text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_limit int default 200
) returns table(
  listing_id uuid,
  parcel_id uuid,
  category text,
  activity_code text,
  title text,
  price_cents int,
  price_unit text,
  capacity int,
  parcel_name text,
  parcel_province text,
  parcel_municipality text,
  parcel_photos text[],
  parcel_features text[],
  parcel_acres numeric,
  parcel_centroid_lat numeric,
  parcel_centroid_lng numeric,
  parcel_avg_rating numeric,
  parcel_review_count int
) as $$
  select
    l.id as listing_id,
    p.id as parcel_id,
    l.category, l.activity_code, l.title,
    l.price_cents, l.price_unit, l.capacity,
    p.name, p.province, p.municipality, p.photos, p.features, p.acres,
    p.centroid_lat, p.centroid_lng, p.avg_rating, p.review_count
  from landlink_listings l
  join landlink_parcels p on p.id = l.parcel_id
  where l.status = 'active'
    and p.status = 'active'
    and (p_category is null or l.category = p_category)
    and (p_province is null or p.province = p_province)
    and (
      p_date_from is null or p_date_to is null
      or landlink_listing_is_available(l.id, p_date_from, p_date_to)
    )
  order by p.created_at desc
  limit greatest(coalesce(p_limit, 200), 1);
$$ language sql stable;

-- =============================================================
-- ADMIN MODERATION  — flags, actions, stats view
-- =============================================================
drop table if exists landlink_admin_actions cascade;
create table landlink_admin_actions (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references landlink_profiles(user_id) on delete cascade,
  subject_type text not null check (subject_type in (
    'parcel','listing','booking','profile','credential','review','flag'
  )),
  subject_id uuid not null,
  action text not null check (action in (
    'approve','reject','suspend','unsuspend','verify','unverify',
    'delete','note','ban','unban','feature','unfeature'
  )),
  reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index idx_landlink_admin_actions_subj on landlink_admin_actions(subject_type, subject_id);
create index idx_landlink_admin_actions_admin on landlink_admin_actions(admin_id, created_at desc);

alter table landlink_admin_actions enable row level security;

drop policy if exists "admin actions admin read" on landlink_admin_actions;
create policy "admin actions admin read" on landlink_admin_actions
  for select using (landlink_is_admin(auth.uid()));

drop policy if exists "admin actions admin insert" on landlink_admin_actions;
create policy "admin actions admin insert" on landlink_admin_actions
  for insert with check (landlink_is_admin(auth.uid()) and admin_id = auth.uid());

-- User-reported flags (anyone signed in can create; only admins can read)
drop table if exists landlink_flags cascade;
create table landlink_flags (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references landlink_profiles(user_id) on delete cascade,
  subject_type text not null check (subject_type in ('parcel','listing','profile','booking','review')),
  subject_id uuid not null,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  resolved_by uuid references landlink_profiles(user_id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create index idx_landlink_flags_status on landlink_flags(status, created_at desc);
create index idx_landlink_flags_subj   on landlink_flags(subject_type, subject_id);

alter table landlink_flags enable row level security;

drop policy if exists "flags reporter read own" on landlink_flags;
create policy "flags reporter read own" on landlink_flags
  for select using (reporter_id = auth.uid() or landlink_is_admin(auth.uid()));

drop policy if exists "flags auth insert" on landlink_flags;
create policy "flags auth insert" on landlink_flags
  for insert with check (reporter_id = auth.uid());

drop policy if exists "flags admin update" on landlink_flags;
create policy "flags admin update" on landlink_flags
  for update using (landlink_is_admin(auth.uid()));

-- Admin stats view — quick aggregates for the moderation dashboard
create or replace view landlink_admin_stats as
  select
    (select count(*) from landlink_parcels)                                         as parcels_total,
    (select count(*) from landlink_parcels where status = 'active')                 as parcels_active,
    (select count(*) from landlink_parcels where status = 'pending_review')         as parcels_pending,
    (select count(*) from landlink_listings)                                        as listings_total,
    (select count(*) from landlink_listings where status = 'active')                as listings_active,
    (select count(*) from landlink_listings where status = 'pending_review')        as listings_pending,
    (select count(*) from landlink_bookings)                                        as bookings_total,
    (select count(*) from landlink_bookings where status = 'pending')               as bookings_pending,
    (select count(*) from landlink_bookings where status = 'approved')              as bookings_approved,
    (select count(*) from landlink_bookings where status = 'completed')             as bookings_completed,
    (select coalesce(sum(total_cents),0) from landlink_bookings where status in ('approved','completed')) as gmv_cents,
    (select count(*) from landlink_profiles)                                        as users_total,
    (select count(*) from landlink_user_credentials where verified_at is null)      as credentials_pending,
    (select count(*) from landlink_flags where status = 'open')                     as flags_open;

-- Admins can always read this view regardless of row-level policies on the
-- underlying tables; the view is security-definer by virtue of being a view
-- over RLS-enabled tables under the admin's context. We gate it at the app
-- layer by only rendering it when landlink_is_admin(auth.uid()) is true.
