# Content Uniqueness Log

Tracking the rewrite of templated spot content (Helpful Content recovery).
Checker: `node scripts/check-content-uniqueness.js` — rule: no sentence of 8+
words on more than 2 spot pages. Rewrites applied via
`python3 scripts/apply-rewrites.py {activity} scripts/rewrites/*.json`
(keeps `data/*.json` and EN/FR HTML in sync; FR text is stored in new
`description_fr` / `seasonal_tips_fr` JSON fields).

## Baseline (2026-07-18, before any rewrites)

- All content fields, all 499 spots: **476 duplicated sentences, 499 pages affected**
- `description` + `seasonal_tips` only: **90 duplicated sentences, 486 pages affected**
- 240/240 fishing EN pages shared the "nestled within" skeleton
- FR pages carried **untranslated English** in About/Seasonal sections

## Fishing batch 1 — 2026-07-18 — 25 spots (Legendary tier)

lake-superior, lake-huron, lake-ontario, lake-erie, lake-nipissing,
lake-temagami, muskoka-lakes, algonquin-park-lakes, lake-st-jean,
baskatong-reservoir, fleuve-saint-laurent, lac-tremblant, lac-megantic,
lac-des-deux-montagnes, lac-masson, kamloops-lake, shuswap-lake,
okanagan-lake, kootenay-lake, great-slave-lake, winnipeg-lake,
reindeer-lake, miramichi-river, bras-dor-lake, lake-minnewanka

- Duplication check (batch vs. all 499 spots, EN+FR, description+seasonal_tips): **0 violations — PASS**
- EN descriptions all 120–200 words; FR is a real Québec-French translation, not literal
- Spots noindexed: **none** (all 25 had enough verifiable material)

### Sources used (facts verified 2026-07-18)

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

## Fishing batch 2 — 2026-07-18 — 26 spots (14 Legendary + 11 Elite + 1 duplicate)

lake-louise, athabasca-lake, athabasca-lake-sk, cedar-lake, grand-lake-nb,
shubenacadie-river, dalvay-lake, grand-lake-nl, gander-river, red-indian-lake,
teslin-lake, kluane-lake, hay-river, bathurst-lake*, megantic-lac*,
memphremagog-lac, magog-lac, massawippi-lac, brompton-lac, champlain-lac,
richelieu-riviere, chaudiere-riviere, saint-francois-grand-lac,
poisson-blanc-lac-du, kiamika-reservoir, simon-lac    (* = noindexed)

- Duplication check (fishing, description+seasonal_tips+terrain vs all 240): **0 violations — PASS**
- Scope expanded per owner request ("real and verified data"): batch 2 also
  rewrites `terrain` (+`terrain_fr`) and FIXES wrong structured data
- Spots noindexed: **bathurst-lake** (no verifiable data exists),
  **megantic-lac** (duplicate record of lac-megantic — same waterbody)

### Data fixes applied (verified values)

- lake-louise: coordinates 53.6,-116.2 → 51.42,-116.22 (was plotting near
  Whitecourt, 250 km from Banff); depth 70m confirmed correct
- athabasca-lake: depth 201m → 124m; coords → 58.71,-111.15 (Fort Chipewyan
  end); athabasca-lake-sk: depth 397m → 124m; coords → 59.32,-107.18
  (north-shore end). Both entries are the same lake — differentiated as
  west-end/delta and east-end/trophy pages rather than duplicated
- cedar-lake: depth 80m → 10m; coords 55.2,-99.3 → 53.3,-100.0;
  species "Pike, Walleye, Lake Trout" → "Walleye, Northern Pike, Whitefish"
- grand-lake-nb: species "Lake Trout, Walleye, Smallmouth Bass" (false) →
  "Smallmouth Bass, Chain Pickerel, White Perch"; depth 78m → Varies
- teslin-lake: depth 300m → 213m
- Set to "Varies" (old value fabricated, no verified replacement):
  shubenacadie-river 40m, dalvay-lake 15m, grand-lake-nl 120m,
  gander-river 30m, red-indian-lake 210m, kluane-lake 158m, hay-river 50m,
  bathurst-lake 380m

### Sources used (facts verified 2026-07-18)

- Cedar Lake: 1,350 km², ~10 m max, Grand Rapids GS regulation, commercial
  fishery since 1931-32 — gov.mb.ca fisheries summary, anglersatlas.com
- Grand Lake NB: largest NB lake, 40 km E of Fredericton, species —
  experiencenewbrunswick.com, anglersatlas.com, gnb.ca angling regs
- Shubenacadie: iBoF salmon angling CLOSED (SFA 19-23 except 3 Cape Breton
  rivers); striped bass spring gear window + slot — dfo-mpo.gc.ca,
  novascotia.ca Anglers' Handbook
- Red Indian Lake: officially renamed Beothuk Lake; 2nd largest on island,
  64 km; Millertown derby (ouananiche/brookies) — wikipedia
  (Beothuk Lake), newfoundlandlabrador.com, townofmillertown.com
- Grand Lake NL: 543 km², largest on island, ouananiche; Howley — lake.com,
  anglingnewfoundlandlabrador.com (depth sources conflict: 288 m vs 475 m
  — left unstated)
- Lake Athabasca: max 124 m; world-record 46.3 kg lake trout 1961 (gillnet);
  Athabasca Sand Dunes ~100 km, most northerly major active dunes —
  wikipedia, britannica.com, lakepedia.com
- Lake Louise: Parks Canada permit (AB licence invalid), C&R except
  Minnewanka lakers, barbless/no bait; lake trout, whitefish, burbot,
  grayling — parks.canada.ca Banff fishing, banfflakelouise.com
- PEI NP / Dalvay: park fishing licence required; night fishing prohibited —
  parks.canada.ca PEI fishing, laws-lois.justice.gc.ca (National Parks
  Fishing Regulations)
- Teslin: ~213 m deep; Yukon monitoring: avg laker 49 cm/14 yr, one aged
  42 yr — yukon.ca 2016 Teslin lake trout monitoring, ehcanadatravel.com
- Kluane: Slims River (A'ay Chù) rerouted by Kaskawulsh Glacier retreat,
  2016, lake level dropped — widely documented (Nature Geoscience coverage)
- Elite Québec spots: MFFP-origin species inventories already in
  data/fishing.json (precise coordinates, real species lists) + stable
  regional facts (Frontenac park, Poisson Blanc regional park, Saint-Ours
  fish ladder, copper redhorse protection on the Richelieu, etc.)

### Notes

- Schema.org JSON-LD blocks still embed truncated OLD descriptions on
  rewritten pages (redesign generator bakes description into schema; we
  don't touch schema per original scope). Regenerate schema in one pass
  with whatever tool built it.
- Batch 1 spots have NOT yet had terrain rewritten or depths fixed
  (batch 1 predates the expanded scope). Queued: lake-ontario 802m→244m,
  lake-erie 210m→64m, kootenay/okanagan/kamloops species, terrain for all 25.
- `verification_status` fields (added by the redesign) left untouched —
  criteria unknown; owner may want rewritten+verified spots flipped from
  "needs_review".

## Remaining

- Fishing batches 2–10 (215 spots; next: remaining 14 Legendary, then Elite/Pro,
  then the 143 "Explorer" Quebec lakes — many of those are thin-data
  candidates for noindex per the triage rule)
- hunting (90), camping (52), hiking (47), kayaking (38), skiing (37)
- 146 spots site-wide share identical seasonal_tips (baseline grep)
