# Community Intel (Phase 1)

Turns the old anonymous "Community Tips" comment box on every spot page into a
**community intel system**: structured trip reports, photos, condition tags,
helpful votes, abuse flags, and a "Suggest a correction" workflow.

This is the community/freshness input side of the strategy in
`docs/REFERENCE_OPERATING_PLAN.md`. Community reports are clearly labelled
user-generated content and **never overwrite** verified editorial fields in
`data/*.json` — they are a freshness + correction signal.

## The flywheel it enables

Discover a spot → see planning intel → after visiting, add a report/photo →
report improves the page and its "Recent Intel" freshness → others vote it
helpful, flag bad content, or suggest corrections → the page stays fresh, ranks
better, and pulls in more people.

## What ships

| Piece | File |
|---|---|
| DB schema + RLS + storage + views | `db/community-intel.sql` |
| Shared client UI (all spot pages) | `assets/js/community-intel.js` |
| Create report (server-gated) | `api/reports/create.js` |
| Helpful vote (deduped) | `api/reports/vote.js` |
| Flag / report abuse | `api/reports/flag.js` |
| Suggest a correction | `api/corrections/create.js` |
| Shared server helpers | `api/_lib/community.js` |
| Page injector | `scripts/inject-community-intel.js` (`npm run inject:community`) |

Each spot page now carries a container the shared script renders into:

```html
<div id="ci-root" data-activity="fishing" data-spot="lake-superior"
     data-lang="en" data-name="Lake Superior"></div>
<script defer src="/assets/js/community-intel.js?v=1"></script>
```

Bump the `?v=` when you change the JS — `/assets/*` is cached immutably for a
year in `vercel.json`.

## Security model (frictionless, but gated)

Posting requires **no account**, but abuse is layered out:

1. **No direct DB writes.** RLS lets the anon key *read* only visible rows (via
   the `spot_reports_public` / `spot_recent_intel` views). All inserts go
   through Vercel functions using the **service role key**, which lets the
   server hash IPs, rate-limit, and screen content — none of which a browser
   client could enforce.
2. **Text screening** — honeypot field, length/link caps, banned-term and
   all-caps checks (`screenText` in `api/_lib/community.js`).
3. **Per-IP rate limits** — salted-hash IP (raw IPs never stored): 5 reports /
   10 min, 40 votes / min, 20 flags / min, 8 corrections / 10 min.
4. **NSFW image gate** — photos are classified in the browser with `nsfwjs`
   **before** upload; explicit images are blocked. If the classifier can't load,
   the photo is refused (text-only posting still works).
5. **Community flagging + auto-hide** — 3 distinct flags auto-hide a report (DB
   trigger `fn_report_flag_autohide`).

For a zero-risk posture on photos you can switch the storage insert policy in
`db/community-intel.sql` to authenticated-only, or route photo reports to
`status = 'pending'` and approve from Supabase before they show.

## Setup

1. **Apply the schema** in the Supabase SQL editor:
   ```sql
   -- paste db/community-intel.sql
   ```
   This creates the tables, RLS policies, the public views, the `spot-photos`
   storage bucket, and the flag auto-hide trigger.
2. **Set env vars in Vercel** (see `.env.example`): `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and a random `COMMUNITY_IP_SALT`. The public
   `SUPABASE_ANON_KEY` is already embedded in the client for reads.
3. Deploy. Functions are file-routed: `api/reports/create.js` →
   `/api/reports/create`, etc.

## Moderating

- Reports: `select * from spot_reports order by created_at desc;`
  Set `status` to `hidden`/`removed` to take one down.
- Flag queue: `select * from report_flags order by created_at desc;`
- Corrections queue (feeds editorial): `select * from spot_corrections where status = 'open';`
  Move through `reviewing` → `applied` / `declined` as you action them.

## Legacy `comments` table

The previous pages wrote to a bare `comments` table that was never in source
control. It's superseded by `spot_reports`; a one-line migration is noted at the
bottom of `db/community-intel.sql` if it holds real data.

## Next (Phase 2/3, not in this change)

- Optional login (reuse LandLink Supabase auth) → profile credit, badges, saved
  spots, edit/delete your own reports.
- Surface `verification_status` / `last_verified_at` / source provenance on the
  page next to community intel.
- "Recent community activity" layer on the map; weekly "fresh intel near you"
  email keyed off recent reports.
