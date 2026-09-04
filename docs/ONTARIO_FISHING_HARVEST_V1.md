# Ontario fishing-regulations harvest v1

Public, cited, bilingual, free FMZ pages — the same product shape as Québec zone pages. Season Intel waitlist stays. No Stripe, no paywall, no GIS/iHunter clone, no Scout changes, no trip planner, no Fish ON-Line scrape, no Québec JSON rewrite.

## Licence year

Ontario calendar **2026** (1 January–31 December 2026). Do not mix with Québec’s April 2026–March 2027 licence year.

## Sources (HTML first)

User-Agent: `OutdoorIntel-RegHarvester/1.0 (outdoorintel.ca; regulation transparency tool)`  
Crawl-delay: **1 second**.

| | URL |
|---|---|
| EN hub | https://www.ontario.ca/document/ontario-fishing-regulations-summary |
| FR hub | https://www.ontario.ca/fr/document/resume-des-reglements-de-la-peche |
| EN FMZ | https://www.ontario.ca/document/ontario-fishing-regulations-summary/fisheries-management-zone-{N} |
| FR FMZ | https://www.ontario.ca/fr/document/resume-des-reglements-de-la-peche/zone-de-gestion-des-peches-{N} |

HTML last updated **4 August 2026**. Never prefer the ~25 MB PDF over live HTML. Store `source.pdf_en` as a citation only. Fish ON-Line is map-only — **link out**, never scrape.

## Harvested FMZs

v1 shipped **12** (Ottawa River), **18**, **17**, **16**.

Inland expansion ships **10** (Sault Ste. Marie / Sudbury), **11** (North Bay / Nipissing), **15** (Parry Sound / Bancroft / Pembroke / Algonquin Park).

Northwest / northeast inland cottage-country expansion ships **4** (Kenora / Red Lake / Dryden / Sioux Lookout / Thunder Bay area), **5** (Fort Frances / Kenora / Dryden), **6** (Thunder Bay / Nipigon / Dryden), **7** (Geraldton / Terrace Bay / Manitouwadge / Wawa), **8** (Hearst / Chapleau / Cochrane / Timmins / Kirkland Lake).

Great Lakes expansion ships **19** (Lake Erie) and **20** (Lake Ontario / GTA south shore). FMZ 20 bass is nested (largemouth/smallmouth, early catch-and-release vs regular season) — harvest those h4 rows; do not collapse S/C. Do not invent lake-by-lake tributary regs; listed two-line / sanctuary HTML is enough.

If FMZ 16 exception/sanctuary lists fail, still ship 12+18+17 complete and FMZ 16 **zone-wide only** with `complete: false`. Never silently drop Simcoe/Couchiching (do not omit the FMZ 16 file).

FMZ 15 cites the Algonquin Park bait/gear overlay from the official HTML waterbody exceptions. Do not invent park-only rules.

**Still skipped:** Great Lakes FMZs **9, 13, 14**. Remaining inland FMZs **1, 2, 3**. Ontario hunting WMU 12 / Rainy River is never harvested.

Do not claim “complete Ontario”.

## Namespace (collision-critical)

| | Québec | Ontario |
|---|---|---|
| Files | `data/regulations/zone-{id}.json` | `data/regulations/on-fmz-{N}.json` |
| Index key | `"10"`, `"12"`, … (`zone_id`) | `"ON-12"` (`zone_key`) |
| Pages | `/[lang]/fishing/regulations/zone-10` | `/[lang]/fishing/regulations/on-fmz-12` |
| API | `zone=12` → QC 12 | `zone=ON-12` or `jurisdiction=ON&zone=12` |

`GET /api/regulations?zone=10&lang=en` must still be Québec Zone 10.  
`GET /api/regulations?zone=12` must still be Québec Zone 12.  
`GET /api/regulations?zone=5` must still be Québec Zone 5 (`ON-5` / `jurisdiction=ON&zone=5` is Ontario FMZ 5).  
Unharvested Ontario FMZ (e.g. 9) **404s** with the available ON list — it must not fall through to Québec 9.

`scripts/regs/build-regs-index.mjs` keys as `doc.zone_key || String(doc.zone_id)`, asserts unique keys, and **fails the build** if an ON document is indexed as `"12"`.

## Parser

`scripts/regs/harvest-ontario.mjs` (npm script `harvest:ontario`). Default `--zones=12,16,17,18`. Great Lakes slice: `--zones=19,20`. Northwest/northeast inland: `--zones=4,5,6,7,8`.

Parse ontario.ca **h2/h3 Season/Limits** blocks, including **h4** nested seasons (FMZ 20 bass early catch-and-release / regular) and **h4** nested FR sanctuary periods (FMZ 5/8). Keep every same-name waterbody `<p><strong>` portion (Lake of the Woods, Nipigon River). FR waterbody names may be `h3` instead of `<p><strong>` when the strong-p pass is empty. Do not reuse Québec `parseGrid`. Harvest FR from FR HTML — never machine-translate limits. Keep raw Limits strings (`S-n` and `C-n` verbatim; never collapse to a single number). Fail a zone if zone-wide h3 count is 0.

## Document shape (`on-fmz-N.json`)

- `zone_id`, `zone_key` (`ON-{N}`), `activity: fishing`, `jurisdiction: ON`, `fmz`, `licence_year: 2026`
- `authority`: Ontario Ministry of Natural Resources (MNR); Ontario Fishing Regulations Summary 2026 (not the official law)
- `source.en` / `fr` / `pdf_en` / `fish_on_line` / `fetched_at` / `html_updated` / `note`
- `coverage` counters **listed vs harvested** (never inverted). `complete: true` only when every harvested ≥ listed **and** nothing was skipped as Fish ON-Line-only
- `title.en/fr` must say FMZ/ZGP and Ontario
- `general.en/fr` rules with `period` / `species` / `limit` / `length` / `gear` / `notes` / `raw`
- `species_exceptions`, `waterbody_exceptions`, `bait_restrictions`, `fish_sanctuaries`
- FMZ 12 keeps the ON–QC Ottawa River boundary warning **verbatim** in `notices`

## Resolver

`src/lib/regResolver.mjs` must not break Québec `parsePeriod`. For Ontario, include all rules when the period is unparseable (floating weekdays such as “Friday before fourth Saturday in April”). Always include closed-all-year.

Disclaimer for ON: MNR / the Summary is not the law / verify Fish ON-Line / Crown copyright. No MELCCFP kicker on ON pages.

## Pages

Hub lists **Québec zones** and **Ontario FMZs 4/5/6/7/8/10/11/12/15/16/17/18/19/20** as separate lists and still says this is not complete Ontario. Season Intel waitlist CTA stays. ON pages link out to Fish ON-Line.

## Evals

- Keep `zone=12` as Québec (`z12-truite-fr`); keep `refuse-zone20` as unharvested Québec zone 20
- Add `on12-walleye-en` and `on12-dore-fr`
- Add `on11-nipissing-walleye` and `on15-algonquin-bait`
- Add `on19-walleye-en` / `on19-dore-fr` (Lake Erie) and `on20-walleye-en` / `on20-dore-fr` / `on20-bass-en` (Lake Ontario)
- Add `on5-shoal-walleye` (Shoal Lake walleye closed all year) and `on8-walleye-en`
- Refuse unharvested Great Lakes FMZ 9/13/14 (`refuse-on-fmz9` / `13` / `14`)
- `coverage-all-zones` filters by jurisdiction (QC complete check does not run on ON docs)
- Add `on-collide-qc12`, `on-collide-qc10`, `on-collide-qc19`, `on-collide-qc5`, and `on-collide-qc8`

## Verify

```bash
npm run harvest:ontario
node scripts/regs/build-regs-index.mjs
npm run evals
```

Spot-check FMZ 12 walleye / muskellunge / lake sturgeon against live ontario.ca HTML.  
Spot-check FMZ 17 Lake Scugog walleye **closed all year** when exceptions are harvested.  
`GET /api/regulations?zone=10` and `zone=12` remain Québec. `zone=ON-12` is Ontario FMZ 12 2026.

## Out of scope

GIS clone, Fish ON-Line scrape, fabricated limits, edits to `data/regulations/zone-*.json`, Stripe, ads, Scout, hunting WMU, paywall, “complete Ontario”.
