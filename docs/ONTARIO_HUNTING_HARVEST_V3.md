# Ontario hunting seasons harvest v3

Follow-on to `docs/ONTARIO_HUNTING_HARVEST_V2.md` (PR 53) and v1 (PR 51). Same pipeline, same honesty, next southeastern WMU cluster. Not GIS. Not Stripe. Not Scout. Not Fish ON-Line. Not Forêt ouverte. Not Sépaq. Does not rewrite Québec hunting JSON, Ontario fishing JSON, or the already-live v1/v2 WMU files.

Season Intel waitlist stays on `/[lang]/season-intel`. Hunting hub CTA points at that waitlist URL only. Zone pages stay public — no paywall.

## Licence year / column

Ontario Hunting Regulations Summary **2026** (calendar). Do not mix with Québec hunting 2026–2027 columns or fishing licence years.

## Sources (HTML first)

Same ontario.ca HTML, User-Agent, crawl-delay, and PDF-link-only rule as v1. Harvest FR from FR HTML — never machine-translate. The Summary is **not the law**.

## Already live (do not re-harvest)

**63A, 63B, 64A, 64B, 65, 66A, 66B, 67, 68A, 68B** — `ON-H-*` keys from v1 and v2. **WMU 12 never.**

## v3 slice (must ship)

Southeastern Ontario Map 2 neighbours **69A** and **69B**. Official 2026 deer tables do **not** list undivided `69A`. They list splits **69A1, 69A2, 69A3**. Harvest those keys plus **69B**. Do not invent `ON-H-69A`.

Species: **white-tailed deer + moose + black bear**, and **only** where the official 2026 HTML table has a row (or an undivided parent / numeric range that applies). Weapon class is the **section heading** (do not collapse bows vs firearms).

**NEVER** harvest Ontario WMU 12 (Rainy River). Refuse hunting keys `ON-12`, `ON-H-12`, and `WMU-12`. Do not invent undivided `ON-H-69A`. Lettered `69A` is not a parent of `69A1`.

## Published vs invented (honesty)

| WMU | Deer | Moose | Black bear |
|---|---|---|---|
| 69A1 | Explicit **bows-only** row (`69A1, 69A3, 72B`, Oct 1–Dec 31). No rifle or muzzle-loading deer row. Do not invent those classes. Not undivided 69A. | **No row.** Moose tables list 46–50, 53–63 and explicit 65. Do not invent. | Spring range **66–69**. Fall undivided **69**. Apply parent to 69A1. Disclose. |
| 69A2 | Explicit **bows-only** rows (`69A2, 70`) plus **controlled deer hunt** Nov 30–Dec 6, hunt code **301**. No rifle-table or muzzle-loading deer row. Do not invent those classes. | **No row.** Do not invent. | Same undivided **69** / range **66–69**. Apply parent. Disclose. |
| 69A3 | Same bows-only row as 69A1. No rifle or muzzle-loading deer row invented. | **No row.** Do not invent. | Same undivided **69** / range **66–69**. Apply parent. Disclose. |
| 69B | Explicit lettered rows (rifle / muzzle+bow / bows-only). Rifle-table **footnote 1**: rifles not permitted. | **No row.** Do not invent. | Same undivided **69** / range **66–69**. Apply parent. Disclose. |

Do not harvest last year’s draw / allocation / hunter-number tables as if they were 2026 seasons. Do not invent bag limits. Do not harvest turkey, small game, elk, wolf, undivided 69A, or WMU 12.

## Namespace

Files `data/hunting/on-h-{69a1,69a2,69a3,69b}.json`, keys `ON-H-69A1`, pages `/[lang]/hunting/regulations/on-h-69a1`, API `GET /api/hunting/regulations?zone=ON-H-69A1`. Bare `69A1` and `WMU-69A1` resolve to Ontario. `zone=ON-H-69A` is missing (not invented). Bare `69` stays Québec hunting (missing).

`zone=ON-12` and `ON-H-12` stay refused.

## Parser

`scripts/regs/harvest-hunting-on.mjs` (npm script `harvest:hunting-on`). Default WMUs are v1 + v2 + v3. Harvest this slice with `--wmus=69A1,69A2,69A3,69B` so live v1/v2 JSON is not rewritten.

WMU cell tokens include split ids (`69A1`). Undivided parent `69` / range `66–69` applies to lettered and split children. Exact `69A` does not apply to `69A1`. 2026 controlled deer hunt season tables are harvested (hunt code kept as a note); last-year draw/allocation tables stay skipped.

## Evals

- Keep v1/v2 hunting evals and `refuse-hunt-on-12` / `refuse-hunt-on-h-12`
- Add `hunt-on69a1-deer-en` / `hunt-on69a3-cerf-fr` / `hunt-on69a2-deer-en` / `hunt-on69b-deer-en` / `hunt-on69b-bear-en`
- `hunt-on69a1-moose-skipped` must invent no moose rows
- Parser: 69A1/69A2/69A3 exact; 69A is not a parent of 69A1; undivided 69 / range 66–69 applies; no `ON-H-69A` in the index
- Season Intel copy: southeastern ON hunting 63A–69B (69A as splits) moves to “What you get now”; remaining ON WMUs, QC leftovers, turkey/small game, and change-alert emails stay in “What’s coming”

## Verify

```bash
node scripts/regs/harvest-hunting-on.mjs --wmus=69A1,69A2,69A3,69B --html-dir=DIR
node scripts/regs/build-hunting-index.mjs
npm run evals
```

Spot-check `/en/hunting/regulations/on-h-69a1` and `/en/hunting/regulations/on-h-69a2` are 200.  
`GET /api/hunting/regulations?zone=ON-H-69A1` 200.  
`GET /api/hunting/regulations?zone=ON-H-69A` missing (not invented).  
`GET /api/hunting/regulations?zone=ON-H-69A1&species=moose` returns no invented moose.  
`GET /api/hunting/regulations?zone=ON-12` and `zone=ON-H-12` 404.

## Out of scope

GIS / Fish ON-Line scrape, Forêt ouverte, Sépaq, Stripe, Scout, trip planner, ads, paywall, turkey, small game, elk, wolf, undivided 69A, all Ontario WMUs, Ontario WMU 12, Québec fishing/hunting JSON rewrites, invented bag limits, rewriting v1/v2 `on-h-{63a,63b,64a,64b,65,66a,66b,67,68a,68b}.json`.
