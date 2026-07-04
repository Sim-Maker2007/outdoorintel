# Outdoor Intel Reference Operating Plan

Outdoor Intel should become the Canadian outdoor intelligence layer, not just a large directory. The site earns reference status when a visitor can trust it before driving, booking, paddling, hiking, fishing, hunting, or skiing.

## 1. Accuracy Is The Product

- Treat inaccurate directions, regulation links, parking notes, and safety claims as product bugs.
- Pause broad content expansion until the highest-traffic and highest-risk pages have been reviewed.
- Keep generated or low-confidence pages useful for discovery, but do not present them as fully field-tested.
- Every new page must pass data validation before publishing.

## 2. Provenance On Every Spot

Each spot should carry:

- `source_url`
- `source_label`
- `official_regulation_url`
- `last_verified_at`
- `verification_status`
- `confidence`
- `review_notes`

Public pages should show the source, verification state, and a clear path for corrections.

## 3. Make The Map The Moat

The long-term defensible product is the map/trip planner, enriched with Canadian outdoor context:

- official regulation and permit links
- closures, fire bans, avalanche/ice/water advisories
- weather at the spot and along the route
- route-aware service stops
- saved trip plans and correction submissions

Generic articles can be copied. A maintained Canadian outdoor planning graph is much harder to copy.

## 4. Build Pipeline Before More Scale

Minimum quality gate:

- `npm run data:normalize`
- `npm run data:validate`
- `npm run data:audit`
- link checks for canonical/hreflang/sitemap targets
- schema checks for spot data
- review report for generated copy signals

HTML generation should eventually move into a static site pipeline such as Astro, Eleventy, or Next static export.

## 5. Trust Surface

The site needs visible trust infrastructure:

- editorial and verification policy
- correction policy
- affiliate disclosure
- source methodology
- update cadence
- author/contributor bios once available

Trust pages should be linked from the homepage, About page, and shared footer.

## 6. Own Canada First

The strongest position is bilingual Canadian outdoor intelligence:

- English and French coverage
- province/territory-specific regulations
- Canadian safety context
- official Canadian source links
- local correction workflow

Avoid vague global claims. Win the Canadian reference category first.

## 90-Day Sequence

### Days 1-14

- Normalize province/territory names and activity data.
- Add provenance fields across every spot.
- Fix public positioning and factual claims.
- Add validation and audit scripts.
- Create trust/source pages.

### Days 15-45

- Manually verify the top 100 pages.
- Replace generated directions, parking, services, and safety content.
- Set verified pages to `verification_status: "verified"` with `last_verified_at`.
- Add source blocks to spot pages.

### Days 45-90

- Rework map and trip planner around verified state, source quality, permits, conditions, and route context.
- Add a correction workflow.
- Add public changelog/update history for verified pages.
- Start controlled content expansion only after quality gates stay green.
