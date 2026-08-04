# Astro Migration (Merge-Readiness Phases 0–2)

Status: **spot pages templated (998 of 1,168 pages), parity green, not yet cut over.**
Production still serves the committed `en/` + `fr/` HTML; the Astro build is
verified locally/preview-only until the cutover step below is taken deliberately.

## What changed

- **Astro 7 at the repo root** (`astro.config.mjs`, `src/`). `build.format: 'file'`
  emits `dist/en/fishing/lake-superior.html`, byte-identical URL layout under
  Vercel `cleanUrls`. The root `api/` functions and `landlink/` are untouched.
- **All 998 spot pages** (`/en|fr/{activity}/{slug}`) render from `data/*.json`
  through `src/pages/[lang]/[activity]/[slug].astro`. Everything else
  (directories, provinces, guides, blogs, misc, root pages, assets) is copied
  verbatim into `dist/` by `scripts/build/merge-legacy.mjs` — the site output is
  always complete, and pages migrate incrementally by adding templates.
- **The injector pattern is frozen.** Do not run root-level `inject-*.js` or
  `generate-*.js` scripts anymore; their features live in `src/components/` and
  the page template. They stay in the tree until post-cutover cleanup.
- **Data is the single source of truth.** Phase 0 backfills moved the last
  HTML-only state into `data/*.json`: `noindex`/`noindex_reason` (154 stubs),
  `schema_description`/`schema_keywords` (legacy TouristAttraction text),
  `gear` (per-spot checklists), and re-synced `related_spots` to the links
  actually rendered today. `src/lib/spots.mjs` zod-validates every record at
  build time (build-blocking gate on top of `npm run quality`).

## Build & verify

```
npm run build            # spots index -> astro build -> merge legacy -> parity (warn)
npm run parity:compare   # strict gate: exits 1 on any unexplained hard diff
node scripts/parity/compare.mjs --show-body-diff=/en/fishing/lake-superior
```

The baseline (`scripts/parity/baseline.json`, committed) froze every page's SEO
signals before templating. `compare.mjs` hard-gates URL inventory, title, metas,
robots, canonical, hreflang, og/twitter, geo, JSON-LD, GA4; body text is a soft
signal. `scripts/parity/allowlist.json` documents the 22 pages whose head
signals intentionally differ (province-name normalization applied to data after
the legacy pages were generated, plus the junk `fishing/spot-directory` record).

Accepted body-diff classes (all "data corrected after last page generation" —
the rebuild publishes the newer, truthful text): terrain rewrites (~490 pages),
species list fixes, province renames, two pages that lose an empty
"Nearby Spots" heading.

## The gear bridge (announcement-day flip)

- `data/gear-map.json` — 125-item catalog; every item carries BOTH targets:
  `affiliate` (Amazon search, tag `outdoorintel2-20`) and `ecotone`
  (ecotonegatineau.ca boutique bucket/search + UTM).
- `data/link-config.json` — the switch. `link_source: "affiliate"` today.
  **Announcement day: set `link_source: "ecotone"`, commit, push.** Vercel
  rebuilds all pages with Ecotone links and the retail-partner disclosure.
  Rollback = revert the commit.
- `src/lib/gearResolver.mjs` is isomorphic — the future planner island and
  Scout output consume the same resolver.

## Cutover (deliberate, later)

1. Merge to main with Vercel still serving static; confirm the deploy preview.
2. In Vercel project settings (or `vercel.json`): build command
   `npm run build`, output directory `dist`.
3. Keep the previous deployment one click from re-promotion; watch Search
   Console/GA4 for 4 weeks.
4. Only after the soak: delete `en/`/`fr/` spot pages, retire the injectors,
   and shrink `merge-legacy.mjs` as more templates come online.

## Known traps

- **Do not run `npm run build:province-indexes` (or bare `npm run quality`,
  which chains it) without checking `en|fr/provinces/index.html` afterwards** —
  that generator predates the design system and regresses the pages to the
  Tailwind-CDN look. Reverting the two files with git restores them. Port the
  generator to an Astro template before unfreezing it.
- Nested template literals inside `${}` break the Astro compiler — hoist them
  to a frontmatter const (see `popupHtml` in the spot template).
- FR chrome deliberately links to `/en/map`, `/en/trip-planner`, `/en/about`,
  `/en/licenses` (those FR pages don't exist yet — parity). Flip
  `chromeLinks()` in `src/lib/labels.mjs` when the FR pages ship.

## Still to template (trailing, passthrough meanwhile)

Directories, province hubs, guides, blog posts (~50–80 article extraction),
field notes, scout page, root homepage/404, and the map/trip-planner pages
(the planner page is the Phase 3 flagship work).
