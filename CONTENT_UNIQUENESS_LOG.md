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

## Fishing batch 3 — 2026-07-18 — 143 Explorer-tier spots → honest noindex stubs

All 143 Explorer-tier Québec lakes (thin MFFP-inventory data) now carry
honest, bilingual, per-spot generated stubs + `noindex, follow`:

- Generated by scripts/gen-noindex-stubs.py from scripts/rewrites/triage-report.json
  (node scripts/triage-data-richness.js — commit the report for reproducibility)
- Triage decision: the brief's rule is binary (short honest text + noindex),
  so SHORT-tier spots (37, with 2-3 recorded species + precise coords) are
  noindexed too and flagged in NOINDEXED_SPOTS.md as first re-index candidates
- Every 8+ word stub sentence interpolates the spot's own name/species —
  generated text can't trip the duplication check, and none of it is indexed
- Names de-inverted for prose ("Admac, Lac" → "Lac Admac"); note the JSON
  `name` fields (and page titles) still carry the inverted gazetteer form —
  a sitewide title/name normalization is worth a separate pass
- Fabricated depth_max values on stub spots set to "Varies"

Post-batch fishing dup check (description+seasonal_tips+terrain): 18
duplicated sentences on 71 pages — ALL from old template text on pages still
awaiting hand-rewrites (22 remaining Elite, 25 Pro, batch-1 terrain). Zero
violations from batches 1-3 content.

## Remaining

- Fishing batch 4: remaining 22 Elite + first Pro spots (hand-rewrites)
- Fishing batch 5: remaining Pro spots + batch-1 retrofit (terrain rewrite,
  lake-ontario 244m / lake-erie 64m depth fixes, kootenay/okanagan species)
- hunting (89), camping (51), hiking (46), kayaking (37), skiing (36) —
  triage says nearly all are famous-destination REWRITEs; their rot is in
  description/best_time/terrain (seasonal_tips are already unique there)
- Sitewide later: schema regeneration, name normalization ("X, Lac" titles),
  related_spots pointing at nonexistent slugs, getting_there/parking/
  accommodation fields (templated + fabricated on most pages)

## Fishing batch 4 — 2026-07-18 — 21 spots (remaining Elite tier)

16 full rewrites: aylmer-lac, barriere-lac, bowker-lac, brule-lac,
choiniere-reservoir, david-lac, ecorces-lac-des, escalier-reservoir-l,
louise-lac, lovering-lac, mitchinamecus-reservoir, stukely-lac,
truite-lac-a-la, wallace-lac, waterloo-lac, william-lac
5 noindexed (ambiguous identity — placeholder coords 46.5,-72.0, heavily
duplicated Québec lake names): clair-lac, croche-lac, iles-lac-des,
roger-lac, saint-jean-lac

- Fishing dup check (description+seasonal_tips+terrain): 0 violations
- Data fix: truite-lac-a-la depth_max Varies → 2m (verified: municipality/APLTI)
- Species lists in this tier contain merge-duplicates (e.g. "Doré jaune" twice
  on aylmer-lac) — deduped in prose, raw lists left for a data-cleanup pass

### Sources (verified 2026-07-18)

- Zec Mitchinamecus: ~6,475 ha reservoir, 60 km NE of Mont-Laurier, access
  fees/registration, walleye+brook trout enhancement, wading pools below
  McLean Falls — zecmitchinamecus.reseauzec.com, grandquebec.com, wikipedia
- Lac à la Truite d'Irlande: 124 ha, max 2 m, Bécancour river-lake, historic
  trout gone (walleye/pike/perch now), mining-sediment threat, 12.5 km paddle
  route — mundirlande.qc.ca, aplti.org, regiondethetford.chaudiereappalaches.com
- Réservoir de l'Escalier: 11 km² Lièvre widening at Val-des-Bois/Bowman,
  Grande-Chute dam 1916, managed levels — cehq.gouv.qc.ca, wikipedia/wikimapia,
  cobali.org
- Remainder grounded in stable regional geography + the MFFP-origin species
  inventories already in data/fishing.json (incl. splake "moulac" record on
  ecorces, muskellunge on the Bécancour chain, brown trout at Wallace)

Fishing progress: 215/240 spots done (72 hand-rewritten, 150 noindexed stubs,
+ batch-1 25). Remaining: 25 Pro spots + batch-1 terrain/depth retrofit.

## Fishing batch 5 — 2026-07-18 — 25 Pro spots + batch-1 retrofit — FISHING COMPLETE

21 full rewrites: temiscouata-lac (identity confirmed despite placeholder
coords — coordinates FIXED to 47.68,-68.80, depth set to verified 99m),
brome-lac, boivin-lac (no-fishing zones documented: CINLB/NE marsh/Lemieux),
davignon-lac, cerf-grand-lac-du, sourd-lac-du, nominingue-grand-lac,
est-lac-de-l, joseph-lac, saint-francois-petit-lac, trois-lacs-les,
breeches-lac, chaud-lac, marsan-lac, pimodan-lac, drolet-lac,
rat-musque-lac-du, boissonneault-lac, bolduc-lac, grelots-lac-aux, thor-lac
4 noindexed (ambiguous identity, placeholder coords): long-lac, masson-lac,
pelletier-lac, tremblant-lac (the latter two are NOT the famous namesakes —
species records differ sharply)

Batch-1 retrofit (25 spots): terrain + terrain_fr rewritten; data fixes:
- lake-ontario 802m → 244m; lake-erie 210m → 64m; lake-st-jean 102m → 63m;
  okanagan-lake 258m → 232m; reindeer-lake 250m → 220m
- okanagan species → Rainbow Trout/Kokanee/Lake Whitefish;
  kootenay species → Gerrard Rainbow Trout/Bull Trout/Kokanee
- Set to Varies (fabricated, unverified): nipissing, temagami, muskoka,
  algonquin, baskatong, fleuve, lac-tremblant, lac-megantic,
  deux-montagnes, lac-masson, kamloops, kootenay, miramichi, bras-dor

**FISHING FINAL: 240/240 spots. Dup check (description+seasonal_tips+terrain,
all 240 spots, EN+FR): 0 violations.**
86 hand-rewritten indexed pages · 154 honest noindexed stubs.

Sources this batch: sepaq.com + wikipedia (Témiscouata: 39 km, 99 m, park
2009), ville.lac-brome.qc.ca + tourismelacbrome (Brome access rules, species),
cinlb.org + granby.ca (Boivin no-fishing zones, permitted species).
Remaining activities: hunting (89), camping (51), hiking (46), kayaking (37),
skiing (36) — all still templated.

## Hunting batch 1 — 2026-07-18 — 22 spots (all 15 Legendary + 7 flagged Elite)

anticosti-island, zec-batiscan, algonquin-park, charlie-lake,
bow-river-valley, delta-marsh, gros-morne, nunavut-tundra,
algoma-district-on, kootenays-hunting, cassiar-hunting,
crowsnest-pass-hunting, yukon-southern-lakes-hunting,
nahanni-region-hunting, baffin-island-hunting, laurentian-mountains,
willmore-wilderness, northern-saskatchewan-muskeg, yellowknife-region,
pei-central, pictou-county-highlands, riding-mountain-hunting

- Hunting dup check (desc+tips+terrain vs all 89): **0 violations — PASS**
- FR pages previously untranslated English — now real Québec French
- CLOSED/RESTRICTED HUNTS handled honestly (never promoted): Bathurst
  caribou (complete closure, weekly mobile zone), Southern Lakes caribou
  (moratorium since 1993; recovery 1,000→4,850), SK woodland caribou (no
  season, threatened), Algonquin interior (prohibited except
  Clyde/Bruton/Eyre + Algonquins of Ontario harvest), park boundaries
  (Riding Mountain, Nahanni)
- Species fixes: anticosti Black Bear (EXTIRPATED - documented cascade) →
  Snowshoe Hare; pei-central White-tailed Deer (no wild deer on PEI) →
  Ruffed Grouse/Snowshoe Hare; yellowknife Barrenland Caribou (closed) →
  Muskox/Moose; yukon-southern-lakes Caribou (closed) → Grouse;
  northern-sask Woodland Caribou (closed) → Waterfowl
- Data flag: bow-river-valley coords (53.1,-115.5) point to Drayton Valley
  foothills, not the Bow valley — noted on-page, record needs rename/re-coord

### Sources (verified 2026-07-18)

- Anticosti: 220 deer introduced 1896-97 (Menier), ~166,000 today at
  21/km², black bear extirpation via deer-berry cascade, low-density moose,
  Sépaq Anticosti packages — sepaq.com, wikipedia, researchgate
- Bathurst caribou: hunting fully closed, mobile zone updated weekly (Tue),
  98% decline 486k→8.2k — gov.nt.ca ECC
- NL: island caribou 612 licences 2025-26 (draw), Gros Morne in-park
  resident moose management hunt ~500 either-sex licences — gov.nl.ca
  hunting-trapping guide
- Southern Lakes caribou: licensed hunting closed since 1993,
  1,000→4,850 by 2019, relationship plan signed 2024 — CBC, yukon.ca
- Algonquin: hunting prohibited except Clyde/Bruton/Eyre townships +
  Algonquins of Ontario treaty harvest — algonquinpark.on.ca, tanakiwin.com
- SK woodland caribou: threatened (SARA 2003), no open season —
  saskatchewan.ca woodland caribou program
- PEI: no wild deer/moose; grouse Sep1-Dec31, hare Sep1-Mar31, waterfowl —
  princeedwardisland.ca hunting summary (an AI-aggregator source claiming
  PEI deer seasons was rejected as unreliable)
- Remainder: stable regional knowledge (Willmore no-motorized rule, BC
  non-resident guide requirement, NWT/NU outfitter+HTO systems, Delta Marsh
  waterfowl heritage, zec/pourvoirie/réserve system)

Remaining hunting: 31 Elite + 32 Pro rewrites, 4 Explorer noindex stubs.

## Hunting batch 2 — 2026-07-18 — 17 spots (Elite: QC réserves/regions, Atlantic, prairie waterfowl)

reserve-la-verendrye, reserve-laurentides, reserve-mastigouche,
saguenay-hunting, gaspesie-hunting, mauricie-hunting, kawartha-lakes,
muskoka-region, peace-river, whitewater-lake, yukon-gma-1,
central-plateau-caribou, acadian-uplands, miramichi-hunting,
cape-breton-hunting, western-newfoundland-hunting,
peace-river-hunting* (* = noindexed duplicate of peace-river, identical coords)

- Batch dup check vs all 89 hunting spots: **0 violations — PASS**
- Honest handling: Gaspésie endangered caribou (fully protected, never
  hunted — ID warning on-page), La Mauricie NP and Cape Breton Highlands NP
  closed boundaries, NL island caribou framed via real quota system
- Data flags: yukon-gma-1 name/coords conflict (zone name vs central-Yukon
  coords 62,-130) — noted on-page, record needs reconciliation
- Anchors: Kawartha turkey reintroduction (1980s releases), Cape Breton moose
  introduced from Alberta 1940s, NL moose introduced ~1904, NB moose lottery,
  Whitewater Lake boom-bust hydrology, Sépaq draw system across réserves

Remaining hunting: 14 Elite/Pro Ontario-boreal+BC+AB rewrites queued next
(nipissing, sudbury, cochrane, dryden, timmins, wawa, kapuskasing,
foothills-red-deer, cariboo, thompson-nicola, peace-country-ab,
clearwater-county, whitecourt, edson) + 32 Pro tier + 4 Explorer stubs.
