# Content Uniqueness Log

Tracking the rewrite of templated spot content (Helpful Content recovery).
Checker: `node scripts/check-content-uniqueness.js` — rule: no sentence of 8+
words on more than 2 spot pages. Rewrites applied via
`python3 scripts/apply-rewrites.py {activity} scripts/rewrites/*.json`
(keeps `data/*.json` and EN/FR HTML in sync; FR text is stored in new
`description_fr` / `seasonal_tips_fr` JSON fields).

## Baseline (2026-07-04, before any rewrites)

- All content fields, all 499 spots: **476 duplicated sentences, 499 pages affected**
- `description` + `seasonal_tips` only: **90 duplicated sentences, 486 pages affected**
- 240/240 fishing EN pages shared the "nestled within" skeleton
- FR pages carried **untranslated English** in About/Seasonal sections

## Fishing batch 1 — 2026-07-04 — 25 spots (Legendary tier)

lake-superior, lake-huron, lake-ontario, lake-erie, lake-nipissing,
lake-temagami, muskoka-lakes, algonquin-park-lakes, lake-st-jean,
baskatong-reservoir, fleuve-saint-laurent, lac-tremblant, lac-megantic,
lac-des-deux-montagnes, lac-masson, kamloops-lake, shuswap-lake,
okanagan-lake, kootenay-lake, great-slave-lake, winnipeg-lake,
reindeer-lake, miramichi-river, bras-dor-lake, lake-minnewanka

- Duplication check (batch vs. all 499 spots, EN+FR, description+seasonal_tips): **0 violations — PASS**
- EN descriptions all 120–200 words; FR is a real Québec-French translation, not literal
- Spots noindexed: **none** (all 25 had enough verifiable material)

### Sources used (facts verified 2026-07-04)

- Baskatong: Mercier dam 1927, 413 km², 35+ species, AFC management —
  afcbaskatong.com, en.wikipedia.org/wiki/Baskatong_Reservoir
- Lac Saint-Jean: AFC managed by CLAP since 1996, access authorization
  required age 14+ — claplacsaintjean.com, quebec.ca
- Reindeer Lake: Deep Bay impact crater, 13 km wide, 220 m deep, deepest
  water in Saskatchewan, ~99 Ma — en.wikipedia.org/wiki/Deep_Bay_crater
- Bras d'Or: UNESCO biosphere designation June 2011 —
  unesco.org/en/mab/bras-dor-lake
- Other facts limited to stable, well-established knowledge (e.g. Superior =
  largest freshwater lake by area; Great Slave = deepest in North America,
  614 m; Adams River sockeye dominant years incl. 2026; Gerrard rainbows
  spawn in the Lardeau; NB salmon angling fly-only; Banff requires a Parks
  Canada permit). Where a JSON number could not be trusted (see below) the
  prose avoids it. Regulations are referenced generically with
  "check current regulations" rather than quoting limits that change.

### Data-quality issues found (NOT fixed — flagged for follow-up)

These `depth_max` values in data/fishing.json are wrong and still display in
the page stats; prose avoids repeating them:

- lake-ontario "802m" (actual max ≈ 244 m)
- lake-erie "210m" (actual max ≈ 64 m)
- lake-nipissing "120m" (famously shallow lake)
- likely wrong: lake-temagami 165m, muskoka-lakes 110m, lake-st-jean 102m,
  baskatong 120m, lac-tremblant 180m, kamloops-lake 300m, kootenay-lake 280m,
  okanagan-lake 258m, bras-dor 302m, fleuve-saint-laurent 300m, reindeer 250m

Other issues:

- `getting_there` is templated/fabricated on many pages (e.g. Lake Superior:
  "From Ottawa, head east — 1.5-2 hours"). Same for `parking`,
  `accommodation`, `nearby_services`, `best_time`, `regulations` — these
  fields still fail the site-wide duplication check and should be rewritten
  or removed in a later pass.
- `primary_species` questionable: kootenay-lake and okanagan-lake list
  "Lake Trout" as a primary species; kamloops-lake lists "Lake Trout".
- related_spots references slugs that don't exist (e.g. lake-superior →
  "nipigon-river").
- The brief's "Lake Simcoe" and "Lake of the Woods" do not exist in
  data/fishing.json — candidates for new pages, not rewrites.

## Remaining

- Fishing batches 2–10 (215 spots; next: remaining 14 Legendary, then Elite/Pro,
  then the 143 "Explorer" Quebec lakes — many of those are thin-data
  candidates for noindex per the triage rule)
- hunting (90), camping (52), hiking (47), kayaking (38), skiing (37)
- 146 spots site-wide share identical seasonal_tips (baseline grep)
