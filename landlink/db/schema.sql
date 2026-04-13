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
