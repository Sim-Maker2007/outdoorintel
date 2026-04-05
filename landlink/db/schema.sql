-- LandLink schema
-- Apply to the shared Supabase instance (vbvsgwiyzjsmxawxyisn).
-- All tables prefixed landlink_ to avoid colliding with existing OutdoorIntel tables.

-- =============================================================
-- EXTENSIONS
-- =============================================================
create extension if not exists "uuid-ossp";

-- =============================================================
-- PROFILES
-- =============================================================
create table if not exists landlink_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'hunter' check (role in ('landowner','hunter','both','admin')),
  full_name text,
  phone text,
  postal_code text,
  province text,
  language text default 'en' check (language in ('en','fr')),
  pal_number text,
  pal_image_url text,
  pal_verified_at timestamptz,
  hunter_ed_url text,
  insurance_url text,
  insurance_expires date,
  bio text,
  experience_years int,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_landlink_profiles_role on landlink_profiles(role);
create index if not exists idx_landlink_profiles_province on landlink_profiles(province);

-- =============================================================
-- PARCELS
-- =============================================================
create table if not exists landlink_parcels (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references landlink_profiles(user_id) on delete cascade,
  name text not null,
  description text,
  geometry jsonb not null,                       -- GeoJSON Polygon
  centroid_lat numeric(9,6) not null,
  centroid_lng numeric(9,6) not null,
  acres numeric(10,2),
  province text not null,
  municipality text,
  access_notes text,
  species text[] not null default '{}',          -- ['whitetail','goose','coyote',...]
  weapons text[] not null default '{}',          -- ['archery','rifle','shotgun','muzzleloader','crossbow']
  max_hunters int not null default 1,
  vehicle_access text default 'foot_only'        -- 'foot_only'|'atv_ok'|'truck_ok'
    check (vehicle_access in ('foot_only','atv_ok','truck_ok')),
  season_start date,
  season_end date,
  price_cents int not null default 0,
  price_unit text not null default 'season'
    check (price_unit in ('day','weekend','week','season','free')),
  status text not null default 'draft'
    check (status in ('draft','pending_review','active','paused','removed')),
  photos text[] default '{}',
  house_rules text,
  avg_rating numeric(3,2),
  review_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_landlink_parcels_status on landlink_parcels(status);
create index if not exists idx_landlink_parcels_province on landlink_parcels(province);
create index if not exists idx_landlink_parcels_owner on landlink_parcels(owner_id);
create index if not exists idx_landlink_parcels_species on landlink_parcels using gin(species);
create index if not exists idx_landlink_parcels_centroid on landlink_parcels(centroid_lat, centroid_lng);

-- =============================================================
-- HUNT REQUESTS
-- =============================================================
create table if not exists landlink_hunt_requests (
  id uuid primary key default uuid_generate_v4(),
  parcel_id uuid not null references landlink_parcels(id) on delete cascade,
  hunter_id uuid not null references landlink_profiles(user_id) on delete cascade,
  date_from date not null,
  date_to date not null,
  party_size int not null default 1,
  species text[] not null default '{}',
  weapon text,
  message text,
  status text not null default 'pending'
    check (status in ('pending','approved','declined','cancelled','completed','expired')),
  landowner_response text,
  agreement_url text,
  agreement_signed_at timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  total_cents int,
  created_at timestamptz default now(),
  responded_at timestamptz,
  check (date_to >= date_from)
);

create index if not exists idx_landlink_requests_parcel on landlink_hunt_requests(parcel_id);
create index if not exists idx_landlink_requests_hunter on landlink_hunt_requests(hunter_id);
create index if not exists idx_landlink_requests_status on landlink_hunt_requests(status);

-- =============================================================
-- REVIEWS
-- =============================================================
create table if not exists landlink_reviews (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references landlink_hunt_requests(id) on delete cascade,
  reviewer_id uuid not null references landlink_profiles(user_id) on delete cascade,
  subject_id uuid not null,
  subject_type text not null check (subject_type in ('parcel','hunter','landowner')),
  rating int not null check (rating between 1 and 5),
  text text,
  created_at timestamptz default now(),
  unique(request_id, reviewer_id, subject_type)
);

create index if not exists idx_landlink_reviews_subject on landlink_reviews(subject_id, subject_type);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table landlink_profiles enable row level security;
alter table landlink_parcels enable row level security;
alter table landlink_hunt_requests enable row level security;
alter table landlink_reviews enable row level security;

-- helper: is admin?
create or replace function landlink_is_admin(uid uuid) returns boolean as $$
  select exists(select 1 from landlink_profiles where user_id = uid and role = 'admin');
$$ language sql stable security definer;

-- ---------- profiles ----------
-- Anyone can read the public-safe columns of profiles via a view; raw table limited.
drop policy if exists "profiles self read" on landlink_profiles;
create policy "profiles self read" on landlink_profiles
  for select using (auth.uid() = user_id or landlink_is_admin(auth.uid()));

drop policy if exists "profiles self insert" on landlink_profiles;
create policy "profiles self insert" on landlink_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles self update" on landlink_profiles;
create policy "profiles self update" on landlink_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- public-safe view (exposes only non-sensitive fields)
create or replace view landlink_profiles_public as
  select user_id, role, full_name, province, language, bio,
         experience_years, avatar_url,
         (pal_verified_at is not null) as pal_verified,
         created_at
  from landlink_profiles;

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

-- ---------- hunt_requests ----------
drop policy if exists "requests participants read" on landlink_hunt_requests;
create policy "requests participants read" on landlink_hunt_requests
  for select using (
    hunter_id = auth.uid()
    or exists(select 1 from landlink_parcels p where p.id = parcel_id and p.owner_id = auth.uid())
    or landlink_is_admin(auth.uid())
  );

drop policy if exists "requests hunter insert" on landlink_hunt_requests;
create policy "requests hunter insert" on landlink_hunt_requests
  for insert with check (hunter_id = auth.uid());

drop policy if exists "requests participants update" on landlink_hunt_requests;
create policy "requests participants update" on landlink_hunt_requests
  for update using (
    hunter_id = auth.uid()
    or exists(select 1 from landlink_parcels p where p.id = parcel_id and p.owner_id = auth.uid())
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
      select 1 from landlink_hunt_requests r
      where r.id = request_id
        and r.status = 'completed'
        and (r.hunter_id = auth.uid()
             or exists(select 1 from landlink_parcels p where p.id = r.parcel_id and p.owner_id = auth.uid()))
    )
  );

-- =============================================================
-- TRIGGERS
-- =============================================================
-- Maintain parcel avg_rating / review_count
create or replace function landlink_refresh_parcel_rating() returns trigger as $$
begin
  if new.subject_type = 'parcel' then
    update landlink_parcels
    set avg_rating = sub.avg_rating,
        review_count = sub.review_count
    from (
      select subject_id, avg(rating)::numeric(3,2) avg_rating, count(*)::int review_count
      from landlink_reviews
      where subject_type = 'parcel' and subject_id = new.subject_id
      group by subject_id
    ) sub
    where id = sub.subject_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_landlink_refresh_parcel_rating on landlink_reviews;
create trigger trg_landlink_refresh_parcel_rating
  after insert on landlink_reviews
  for each row execute function landlink_refresh_parcel_rating();

-- updated_at auto-touch
create or replace function landlink_touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_landlink_parcels_touch on landlink_parcels;
create trigger trg_landlink_parcels_touch before update on landlink_parcels
  for each row execute function landlink_touch_updated_at();

drop trigger if exists trg_landlink_profiles_touch on landlink_profiles;
create trigger trg_landlink_profiles_touch before update on landlink_profiles
  for each row execute function landlink_touch_updated_at();
