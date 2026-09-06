# Hunting seasons harvest v1

Public, cited, bilingual, **free** hunting-season pages. Not GIS. Not Stripe. Not Scout. Not a fishing-API overload.

Season Intel waitlist stays on `/[lang]/season-intel` (this PR does not rewrite that page). Hunting hub CTA points at that waitlist URL only.

## Licence year / column

Québec sport-hunting tables publish **2026** and **2027** columns. v1 stores and displays the **2026** column. Do not mix with fishing licence years.

## Sources (HTML first)

User-Agent: `OutdoorIntel-RegHarvester/1.0 (outdoorintel.ca; regulation transparency tool)`  
Crawl-delay: **1 second**.

| | URL |
|---|---|
| Moose EN | https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/seasons-bag-limits/moose |
| Moose FR | https://www.quebec.ca/tourisme-loisirs-sport/activites-sportives-et-de-plein-air/chasse-sportive/periodes-limites/orignal |
| Deer EN | https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/seasons-bag-limits/white-tailed-deer |
| Deer FR | https://www.quebec.ca/tourisme-loisirs-sport/activites-sportives-et-de-plein-air/chasse-sportive/periodes-limites/cerf-virginie |
| Deer bag EN | https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/game/white-tailed-deer |
| Maps EN | https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/hunting-zone-maps |
| Black bear EN | https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/seasons-bag-limits/black-bear |
| Black bear FR | Discover from the FR seasons hub (`/chasse-sportive/periodes-limites/`) — do not guess a 404 slug |

FR siblings live under `/chasse-sportive/periodes-limites/` (Québec.ca FR has **no** `/fr/` prefix). Harvest FR from FR HTML — never machine-translate. Store bag and bait notes verbatim from the black-bear game page. No invented quotas.

## v1 slice (must ship)

Québec hunting zones **10 and 11, East and West: 10E / 10W / 11E / 11W**. Species: **white-tailed deer + moose**. Weapon class is the **section heading** (do not collapse bow vs firearms).

Store `draw_required` for 2026 moose-without-antlers in zones 10/11 as the **verbatim** Québec.ca notice plus a flag. Store the statewide deer bag (**2 deer / two zones**) as a verbatim notice from the game page.

Link **Forêt ouverte** and the official **zones 10 and 11 PDF** maps. Do not OCR maps. Do not scrape Forêt ouverte GIS.

## Adjacent QC hunting (7 / 8 / 13)

Same species slice (white-tailed deer + moose, 2026 column). Harvest **published splits only**:

- Zone 7 → `QC-H-7N`, `QC-H-7S` (moose table lists undivided 7; deer lists 7 North / 7 South). Do not invent 7E/7W.
- Zone 8 → `QC-H-8E`, `QC-H-8N`, `QC-H-8S`. Do not invent 8W.
- Zone 13 → `QC-H-13SW` (deer lists 13 Southwest; moose lists undivided 13). Do not invent 13E/13W.

Black bear 2026 is harvested on the **same existing QC-H-* keys only**, and only where the official black-bear table has rows. Do not invent a season if the key is absent. Do not add new hunting zones. Not small game, turkey, or all 28 zones. Not Ontario hunting / WMU 12.

## Southern QC hunting (4 / 5 / 6 / 14 / 15 / 16)

Same 2026 column, published splits only (southern / populated first):

- Zone 4 → `QC-H-4` (tables list undivided 4). Do not invent 4E/4W/4N/4S.
- Zone 5 → `QC-H-5E`, `QC-H-5W` (deer lists 5 East / 5 West; moose and bear list undivided 5). Do not invent 5N/5S.
- Zone 6 → `QC-H-6N`, `QC-H-6S` (deer lists 6 North / 6 South; moose and bear list undivided 6). Do not invent 6E/6W.
- Zone 14 → `QC-H-14` (moose and bear list undivided 14; **no deer row** on the 2026 deer table — skip deer and disclose). Do not invent 14 E/W.
- Zone 15 → `QC-H-15E`, `QC-H-15W` (deer lists 15 East / 15 West; moose and bear list undivided 15). Do not invent 15N/15S.
- Zone 16 → `QC-H-16` (moose and bear list undivided 16; **no deer row** — skip deer and disclose). Do not invent 16 E/W. Hunting `zone=16` is `QC-H-16`, never Québec fishing zone 16.

Black bear 2026 is harvested only where the official black-bear table has rows. Leave existing 7–13SW files unchanged unless `--rewrite-existing`. Not small game, turkey, or all 28 zones. Not Ontario hunting / WMU 12.

Default `--zones` includes v1 keys, adjacent splits, and these southern keys. Titles say Québec hunting. Zone 13 stores the verbatim alternating-year moose-without-antlers notice (2026 restrictive), not the zones 1–12 / 14–16 draw flag. Zones 4, 5, 6, 14, 15 and 16 use the verbatim draw notice (zones 1 to 12, 14 to 16).

## Optional (only if 10/11 is complete)

- QC hunting zones **9** (9E/9W) and **12**, deer + moose, same HTML tables.
- Ottawa-adjacent Ontario WMUs **63A, 63B, 65, 66A, 67** shipped in `docs/ONTARIO_HUNTING_HARVEST_V1.md` (`ON-H-*` keys). Southeastern neighbours **64A, 64B, 66B, 68A, 68B** shipped in `docs/ONTARIO_HUNTING_HARVEST_V2.md`. Remaining Ontario WMUs stay unharvested.
- **NEVER** harvest Ontario WMU 12 (Rainy River).
- Do not machine-translate.

## Namespace (collision-critical)

| | Fishing | Hunting |
|---|---|---|
| Files | `data/regulations/zone-*.json`, `on-fmz-*.json` | `data/hunting/qc-h-{10e,10w,11e,11w}.json` |
| Index key | `"12"`, `"ON-12"` | `"QC-H-10W"` |
| Pages | `/[lang]/fishing/regulations/zone-12` | `/[lang]/hunting/regulations/qc-h-10w` |
| API | `GET /api/regulations?zone=12` → QC **fishing** 12 | `GET /api/hunting/regulations?zone=QC-H-10W` |
| `zone=ON-12` | Ontario **fishing** FMZ 12 | **Refused** (not a hunting key; WMU 12 never harvested) |

Do **not** edit `data/regulations/zone-*.json` or `on-fmz-*.json`.  
Do **not** put hunting documents in `api/_data/regs-index.js`. New index: `api/_data/hunting-index.js`.

`GET /api/regulations?zone=12` must still be Québec fishing. Hunting moose in zone 12 must not return fishing zone 12.

## Parser

`scripts/regs/harvest-hunting-qc.mjs` (npm script `harvest:hunting-qc`). Default includes `10E,10W,11E,11W,9E,9W,12` plus adjacent `7N,7S,8E,8N,8S,13SW` plus southern `4,5E,5W,6N,6S,14,15E,15W,16`. Live 7–13SW files are left unchanged unless `--rewrite-existing`.

Parse quebec.ca HTML **tables**. Weapon class = heading immediately before the table. Skip ZEC tables. Keep 2026 column verbatim. Coverage counters are **listed vs harvested** (never inverted). `complete: true` only for the **stated slice** (deer + moose + black bear where the table has rows, 2026 column, this hunting zone) — never “all 28 hunting zones”.

## Document shape (`qc-h-10w.json`)

- `zone_id` `10W`, `zone_key` `QC-H-10W`, `slug` `qc-h-10w`, `activity: hunting`, `jurisdiction: QC`
- `seasons.en/fr[]` with `weapon_class`, `species`, `segment`, `period_2026`
- `notices` including `draw_required` (flag + verbatim) and statewide `deer_bag`
- `maps.foret_ouverte` + `pdf_en` / `pdf_fr` (links only)

## Pages / chrome

Hub: `/[lang]/hunting/regulations`  
Zone: `/[lang]/hunting/regulations/qc-h-10w`  
Hunting hub CTA → Season Intel **waitlist** URL only. Do not rewrite `season-intel.astro`. Do not edit Stripe, privacy/terms, or Footer Stripe CTAs.

## Evals

- Keep `z12-truite-fr` and `on12-walleye-en`
- Add `hunt-qc10-deer-en` / `hunt-qc10-cerf-fr`
- Add `hunt-qc10-bear-en` / `hunt-qc10-ours-fr`
- `hunt-qc12-bear-en` / hunting zone 12 must not return fishing zone 12
- Add `hunt-qc5e-deer-en` / `hunt-qc6n-orignal-fr` / `hunt-qc16-moose-en`
- `hunt-qc16-moose-en` / hunting zone 16 must not return fishing zone 16
- Refuse hunting key `ON-12`

## Verify

```bash
npm run harvest:hunting-qc
node scripts/regs/build-hunting-index.mjs
node scripts/regs/build-regs-index.mjs
npm run evals
```

Spot-check `/en/hunting/regulations/qc-h-10w` is 200 with deer + moose 2026 rows and distinct weapon-class headings.  
`GET /api/regulations?zone=10` and `zone=12` remain Québec fishing. `zone=ON-12` remains Ontario fishing FMZ 12.  
`GET /api/hunting/regulations?zone=ON-12` 404s.

## Out of scope

GIS / Forêt ouverte scrape, Sépaq draws, Fish ON-Line, Stripe, Scout, trip planner, ads, paywall, expired 2024–2026 PDF, small game, all 28 hunting zones, Ontario WMU 12.
