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

## v1 FMZs

Ship **12** (Ottawa River, highest value), **18**, **17**, **16** only.

If FMZ 16 exception/sanctuary lists fail, still ship 12+18+17 complete and FMZ 16 **zone-wide only** with `complete: false`. Never silently drop Simcoe/Couchiching (do not omit the FMZ 16 file).

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
Unharvested Ontario FMZ (e.g. 5) **404s** with the available ON list — it must not fall through to Québec 5.

`scripts/regs/build-regs-index.mjs` keys as `doc.zone_key || String(doc.zone_id)`, asserts unique keys, and **fails the build** if an ON document is indexed as `"12"`.

## Parser

`scripts/regs/harvest-ontario.mjs` (npm script `harvest:ontario`). Default `--zones=12,16,17,18`.

Parse ontario.ca **h2/h3 Season/Limits** blocks. Do not reuse Québec `parseGrid`. Harvest FR from FR HTML — never machine-translate limits. Keep raw Limits strings (`S-n` and `C-n` verbatim; never collapse to a single number). Fail a zone if zone-wide h3 count is 0.

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

Hub lists **Québec zones** and **Ontario FMZs 12/16/17/18** as separate lists. Season Intel waitlist CTA stays. ON pages link out to Fish ON-Line.

## Evals

- Keep `zone=12` as Québec (`z12-truite-fr`)
- Add `on12-walleye-en` and `on12-dore-fr`
- Refuse Ontario FMZ 5 (not QC 5): `refuse-on-fmz5`
- `coverage-all-zones` filters by jurisdiction (QC complete check does not run on ON docs)
- Add `on-collide-qc12`

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
