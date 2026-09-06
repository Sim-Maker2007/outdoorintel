# Ontario hunting seasons harvest v1

Public, cited, bilingual, **free** hunting-season pages for a **partial** Ontario WMU slice. Not GIS. Not Stripe. Not Scout. Not Fish ON-Line. Not Forêt ouverte. Not Sépaq. Does not rewrite Québec hunting JSON or Ontario fishing JSON.

Season Intel waitlist stays on `/[lang]/season-intel`. Hunting hub CTA points at that waitlist URL only. Zone pages stay public — no paywall.

## Licence year / column

Ontario Hunting Regulations Summary **2026** (calendar). Do not mix with Québec hunting 2026–2027 columns or fishing licence years.

## Sources (HTML first)

User-Agent: `OutdoorIntel-RegHarvester/1.0 (outdoorintel.ca; regulation transparency tool)`  
Crawl-delay: **1 second**.

| | URL |
|---|---|
| EN hub | https://www.ontario.ca/document/ontario-hunting-regulations-summary |
| FR hub | https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse |
| Deer EN | https://www.ontario.ca/document/ontario-hunting-regulations-summary/white-tailed-deer |
| Deer FR | https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/chevreuil-cerf-de-virginie |
| Moose EN | https://www.ontario.ca/document/ontario-hunting-regulations-summary/moose |
| Moose FR | https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/orignal |
| Bear EN | https://www.ontario.ca/document/ontario-hunting-regulations-summary/black-bear |
| Bear FR | https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/ours-noir |
| How to use EN | https://www.ontario.ca/document/ontario-hunting-regulations-summary/how-use-this-summary |
| How to use FR | https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/comment-utiliser-ce-resume |
| WMU maps EN | https://www.ontario.ca/document/ontario-hunting-regulations-summary/wildlife-management-unit-map-2-southeastern-ontario |
| WMU maps FR | https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/carte-2-des-unites-de-gestion-de-la-faune-sud-est-de |
| WMU finder | https://www.ontario.ca/page/find-wildlife-management-unit-wmu-map |

PDF citations (link only, never OCR):

- EN: https://ontario.ca/files/2026-03/mnr-2026-ontario-hunting-regulations-summary-en-2026-03-10.pdf
- FR: https://ontario.ca/files/2026-03/mnr-2026-ontario-hunting-regulations-summary-fr-2026-03-10.pdf

Harvest FR from FR HTML — never machine-translate. The Summary is **not the law**. Store that notice verbatim from the how-to-use page.

## v1 slice (must ship)

Ottawa-adjacent Wildlife Management Units named in `docs/HUNTING_SEASONS_HARVEST_V1.md`:

**63A, 63B, 65, 66A, 67**

Follow-on southeastern neighbours **64A, 64B, 66B, 68A, 68B** are harvested in `docs/ONTARIO_HUNTING_HARVEST_V2.md`. Do not re-harvest this v1 slice when extending coverage.

Species: **white-tailed deer + moose + black bear**, and **only** where the official 2026 HTML table has a row (or an undivided parent / numeric range that applies). Weapon class is the **section heading** (do not collapse bows vs firearms).

**NEVER** harvest Ontario WMU 12 (Rainy River). Refuse hunting keys `ON-12`, `ON-H-12`, and `WMU-12`.

## Published vs invented (honesty)

| WMU | Deer | Moose | Black bear |
|---|---|---|---|
| 63A, 63B | Explicit lettered rows (rifle / muzzle+bow / bows-only) | Official moose tables list undivided **63** / range **53–63** (no 63A/63B row). Apply undivided parent to these keys — same rule as QC undivided 10 → `QC-H-10W`. Disclose. | Official bear tables list undivided **63** in spring `53–64` and fall `54–63`. Apply parent. Disclose. |
| 65 | Explicit rows. Rifle-table **footnote 1**: rifles not permitted. Dogs not permitted (verbatim list includes 65). | Explicit **controlled hunter numbers** rows (bows only) + “Moose hunting in WMU 65” notice. | **No row.** Spring lists `53–64, 66–69` (skips 65). Fall lists `54–63` and `64, 66, 67` (skips 65). Do not invent. |
| 66A | Explicit lettered rows | **No row.** Moose season tables stop at 53–63; allocation lists undivided 66, not 66A. Do not invent. | Undivided **66** in spring `66–69` and fall `66, 67`. Apply parent to 66A. Disclose. |
| 67 | Explicit rows | **No row** on 2026 moose season tables. Do not invent. | Explicit **67** in spring `66–69` and fall `66, 67`. |

Do not harvest last year’s draw / allocation result tables as if they were 2026 seasons. Do not invent bag limits. Do not harvest turkey, small game, elk, wolf, or other WMUs.

## Namespace (collision-critical)

| | Ontario fishing | Québec hunting | Ontario hunting |
|---|---|---|---|
| Files | `data/regulations/on-fmz-*.json` | `data/hunting/qc-h-*.json` | `data/hunting/on-h-{63a,63b,65,66a,67}.json` |
| Index key | `"ON-12"` | `"QC-H-12"` | `"ON-H-63A"` |
| Pages | `/[lang]/fishing/regulations/on-fmz-12` | `/[lang]/hunting/regulations/qc-h-12` | `/[lang]/hunting/regulations/on-h-63a` |
| API | `GET /api/regulations?zone=ON-12` | `GET /api/hunting/regulations?zone=12` → `QC-H-12` | `GET /api/hunting/regulations?zone=ON-H-63A` |

`zone=ON-12` on the hunting API is **refused** (fishing key; not WMU 12).  
`zone=63A` → `ON-H-63A`. `zone=WMU-65` / `ON-H-65` → `ON-H-65`. Bare `65` stays Québec hunting `QC-H-65` (missing) so it cannot collide with Ontario.

Do **not** edit `data/regulations/zone-*.json` or `on-fmz-*.json`.  
Do **not** put hunting documents in `api/_data/regs-index.js`.

## Parser

`scripts/regs/harvest-hunting-on.mjs` (npm script `harvest:hunting-on`).

Parse ontario.ca **HTML tables**. Weapon class = heading immediately before the table. Keep resident / non-resident columns as `segment`. Split `<br>`-separated periods into separate rows. Keep “None” / “Aucune” verbatim (`open: false`). Coverage counters are **listed vs harvested** (never inverted). `complete: true` only for the **stated slice** (this WMU, deer + moose + bear where the table has rows, 2026).

## Document shape (`on-h-63a.json`)

- `zone_id` `63A`, `zone_key` `ON-H-63A`, `slug` `on-h-63a`, `activity: hunting`, `jurisdiction: ON`, `wmu` `63A`
- `seasons.en/fr[]` with `weapon_class`, `species`, `segment`, `period_2026` (verbatim cell), `year: 2026`
- `notices` including Summary-is-not-the-law plus applicable footnotes / WMU 65 moose text
- `maps` = official WMU map **links only** (no OCR, no Fish ON-Line scrape)

## Pages / chrome

Hub: `/[lang]/hunting/regulations` lists Québec and Ontario separately.  
Zone: `/[lang]/hunting/regulations/on-h-63a`  
Hunting hub CTA → Season Intel waitlist URL only. Do not edit Stripe, privacy/terms, or Footer Stripe CTAs.

## Evals

- Keep `z12-truite-fr`, `on12-walleye-en`, `refuse-hunt-on-12`
- Add `hunt-on63a-deer-en` / `hunt-on67-cerf-fr` / `hunt-on65-moose-en` / `hunt-on66a-bear-en`
- `hunt-on65-bear` must invent no bear rows
- Hunting `ON-H-63A` must not be QC hunting or fishing `ON-12`
- Refuse `ON-H-12`
- Season Intel copy: Ottawa-adjacent ON hunting moves to “What you get now”; remaining ON WMUs, QC leftovers, turkey/small game, and change-alert emails stay in “What’s coming”

## Verify

```bash
npm run harvest:hunting-on
node scripts/regs/build-hunting-index.mjs
npm run evals
```

Spot-check `/en/hunting/regulations/on-h-63a` and `/en/hunting/regulations/on-h-65` are 200.  
`GET /api/hunting/regulations?zone=ON-H-63A` 200.  
`GET /api/hunting/regulations?zone=ON-12` and `zone=ON-H-12` 404.  
`GET /api/hunting/regulations?zone=12` remains QC-H-12.  
`GET /api/regulations?zone=ON-12` remains Ontario fishing FMZ 12.

## Out of scope

GIS / Fish ON-Line scrape, Forêt ouverte, Sépaq, Stripe, Scout, trip planner, ads, paywall, turkey, small game, elk, wolf, all Ontario WMUs, Ontario WMU 12, Québec fishing/hunting JSON rewrites, invented bag limits.
