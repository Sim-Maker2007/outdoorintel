# LandLink

Canada's marketplace for private outdoor land. Landowners list a parcel and
pick which activities they'll host; guests book the activity they need.
Deployed at `landlink.outdoorintel.ca`.

## Positioning

One parcel, many uses, year-round revenue. A single 200-acre woodlot can
earn from hunting in October, snowmobiling in January, sugaring in March,
ATV access in July, and camping every weekend in between. That multi-use
model — not a single vertical — is what keeps hosts on the platform and
keeps LandLink off the seasonal-marketplace graveyard.

## Activities supported (v2 foundation)

Hunting · Camping · Fishing · Ice fishing · Dock & shoreline access ·
Snowmobile · ATV / off-road · XC ski & snowshoe · Sugar shack · Farm stay ·
Foraging · Dog training · Archery & sport shooting · Equestrian ·
Photography & film · Wellness & retreat · Overlanding.

The canonical taxonomy lives in `data/activities.json` — adding a new
vertical is a matter of adding a row there.

## MVP wedge

Hunting and private camping, Quebec + Ontario. Everything else is wired but
the go-to-market focus is those two verticals until the core loop is proven.

## Stack

- Static HTML + Tailwind (CDN) + Leaflet + Leaflet.draw
- Supabase (Auth + Postgres with RLS) — shared instance with OutdoorIntel, tables prefixed `landlink_*`
- Vercel Functions (`/api/*`) for privileged writes, email, PDF agreements
- Resend for transactional email (planned)
- pdf-lib for access agreement generation (planned)

## Data model (v2)

```
landlink_profiles            — users (owner | guest | both | admin)
landlink_user_credentials    — per-activity documents (PAL, insurance, boating, etc.)
landlink_parcels             — the land itself (activity-agnostic)
landlink_listings            — parcel × activity (price, capacity, rules, per-activity config)
landlink_bookings            — generic reservation against a listing
landlink_reviews             — two-way reviews keyed to a booking
```

One parcel has many listings. One listing has many bookings. Activity-specific
fields (hunting species, camping site type, dock boat-length limit, etc.)
live in a `config` jsonb column so the core schema stays generic and adding
a new vertical doesn't require a migration.

### Take rate

- 15% host-side on paid bookings
- 5% guest service fee at checkout
- Free listings carry no platform fee

The math lives in `public/js/supabase-client.js::bookingMath()` — single
source of truth used by the booking UI and the server.

## Local Development

```bash
cd landlink
npm install
cp .env.example .env.local   # fill in Supabase + Resend keys
vercel dev
```

## Environment Variables

| Name | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (Vercel Functions) |
| `RESEND_API_KEY` | Transactional email |
| `LANDLINK_ADMIN_EMAIL` | Admin notification inbox |
| `LANDLINK_PUBLIC_URL` | e.g. `https://landlink.outdoorintel.ca` |

## Database

Apply `db/schema.sql` to the Supabase project. All tables are
`landlink_`-prefixed and RLS-protected. The v2 migration drops the
hunting-only v1 tables (the MVP had no real data yet, so a clean rebuild
is simpler than an in-place migration).

## Deployment

Separate Vercel project pointing at the `landlink/` folder in the
outdoorintel repo. Domain bound to `landlink.outdoorintel.ca`.

## Structure

```
landlink/
├── en/, fr/              Static pages (Airbnb-style UI)
│   ├── index            Homepage (year-round multi-activity story)
│   ├── parcels          Browse (filter by activity category)
│   ├── parcels/detail   Parcel page with listings grid
│   ├── list-your-land   6-step wizard (parcel → activities → pricing)
│   ├── dashboard        Owner + guest views
│   └── profile          Credentials-per-activity
├── api/
│   └── bookings/respond.js   Host approves/declines a booking
├── public/js/            Shared client modules (supabase, nav, taxonomy helpers)
├── public/css/           Global styles
├── data/
│   ├── activities.json   Canonical taxonomy — icons, units, credentials
│   └── provinces.json    Per-province compliance defaults
├── db/schema.sql         Full v2 schema with RLS + triggers
└── assets/               Hero images, icons, agreement templates
```
