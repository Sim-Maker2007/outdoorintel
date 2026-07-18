# LandLink

Airbnb-style marketplace connecting Canadian landowners with vetted hunters. Deployed at `landlink.outdoorintel.ca`.

## Stack

- Static HTML + Tailwind (CDN) + Leaflet + Leaflet.draw
- Supabase (Auth + Postgres with RLS) — shared instance with OutdoorIntel, tables prefixed `landlink_*`
- Vercel Functions (`/api/*`) for privileged writes, email, PDF agreements
- Resend for transactional email
- pdf-lib for access agreement generation

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

Apply `db/schema.sql` to the Supabase project. All tables are `landlink_`-prefixed and RLS-protected.

## Deployment

Separate Vercel project pointing at the `landlink/` folder in the outdoorintel repo. Domain bound to `landlink.outdoorintel.ca`.

## Structure

```
landlink/
├── en/, fr/           Static pages (Airbnb-style UI)
├── api/               Vercel serverless functions
├── public/js/         Shared client-side modules
├── public/css/        Global styles
├── data/              provinces.json (compliance config)
├── db/                schema.sql, seed.sql
└── assets/            Hero images, icons, agreement templates
```
