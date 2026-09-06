# Ontario hunting seasons harvest v2

Follow-on to `docs/ONTARIO_HUNTING_HARVEST_V1.md` (PR 51). Same pipeline, same honesty, next southeastern WMU cluster. Not GIS. Not Stripe. Not Scout. Not Fish ON-Line. Not Forêt ouverte. Not Sépaq. Does not rewrite Québec hunting JSON, Ontario fishing JSON, or the already-live v1 WMU files.

Season Intel waitlist stays on `/[lang]/season-intel`. Hunting hub CTA points at that waitlist URL only. Zone pages stay public — no paywall.

## Licence year / column

Ontario Hunting Regulations Summary **2026** (calendar). Do not mix with Québec hunting 2026–2027 columns or fishing licence years.

## Sources (HTML first)

Same ontario.ca HTML, User-Agent, crawl-delay, and PDF-link-only rule as v1. Harvest FR from FR HTML — never machine-translate. The Summary is **not the law**.

## Already live (do not re-harvest)

**63A, 63B, 65, 66A, 67** — `ON-H-*` keys from v1. **WMU 12 never.**

## v2 slice (must ship)

Southeastern Ontario Map 2 neighbours that sit in the same 2026 deer tables as the Ottawa-adjacent v1 cluster, with **explicit lettered rows**:

**64A, 64B, 66B, 68A, 68B**

Species: **white-tailed deer + moose + black bear**, and **only** where the official 2026 HTML table has a row (or an undivided parent / numeric range that applies). Weapon class is the **section heading** (do not collapse bows vs firearms).

**NEVER** harvest Ontario WMU 12 (Rainy River). Refuse hunting keys `ON-12`, `ON-H-12`, and `WMU-12`. Do not invent undivided `ON-H-64` / `ON-H-66` / `ON-H-68` — deer tables list lettered children.

## Published vs invented (honesty)

| WMU | Deer | Moose | Black bear |
|---|---|---|---|
| 64A | Explicit lettered rows (rifle / muzzle+bow / bows-only). | **No row.** Moose season tables list 46–50, 53–63 and explicit 65. 64 is past 63. Do not invent. | Spring range **53–64**. Fall undivided **64**. Apply parent to 64A. Disclose. |
| 64B | Explicit lettered rows. Rifle-table **footnote 1**: rifles not permitted. | **No row.** Same moose gap as 64A. Do not invent. | Same undivided **64** / range **53–64** as 64A. Apply parent. Disclose. |
| 66B | Explicit **bows-only** row (`66B` alone). No rifle or muzzle-loading deer row. Do not invent those classes. | **No row.** Moose tables do not list 66 or 66B. Do not invent. | Spring range **66–69**. Fall undivided **66**. Apply parent to 66B. Disclose. |
| 68A | Explicit lettered rows (rifle / muzzle+bow / bows-only). | **No row.** Do not invent. | Spring range **66–69**. Fall undivided **68**. Apply parent to 68A. Disclose. |
| 68B | Explicit lettered rows. Rifle-table **footnote 1**: rifles not permitted. | **No row.** Do not invent. | Same undivided **68** / range **66–69** as 68A. Apply parent. Disclose. |

Do not harvest last year’s draw / allocation / hunter-number tables as if they were 2026 seasons. Do not invent bag limits. Do not harvest turkey, small game, elk, wolf, 69A/69B (69A is split 69A1/69A2/69A3), or WMU 12.

## Namespace

Same as v1: files `data/hunting/on-h-{64a,64b,66b,68a,68b}.json`, keys `ON-H-64A`, pages `/[lang]/hunting/regulations/on-h-64a`, API `GET /api/hunting/regulations?zone=ON-H-64A`.

`zone=ON-12` and `ON-H-12` stay refused. Bare `64` / `66` / `68` stay Québec hunting (missing) so they cannot collide with Ontario.

## Parser

`scripts/regs/harvest-hunting-on.mjs` (npm script `harvest:hunting-on`). Default WMUs are v1 + v2. Harvest this slice with `--wmus=64A,64B,66B,68A,68B` so live v1 JSON is not rewritten.

## Evals

- Keep v1 hunting evals and `refuse-hunt-on-12` / `refuse-hunt-on-h-12`
- Add `hunt-on64a-deer-en` / `hunt-on68b-cerf-fr` / `hunt-on66b-bear-en`
- `hunt-on64a-moose-skipped` must invent no moose rows
- Season Intel copy: southeastern ON hunting 63A–68B moves to “What you get now”; remaining ON WMUs, QC leftovers, turkey/small game, and change-alert emails stay in “What’s coming”

## Verify

```bash
node scripts/regs/harvest-hunting-on.mjs --wmus=64A,64B,66B,68A,68B --html-dir=DIR
node scripts/regs/build-hunting-index.mjs
npm run evals
```

Spot-check `/en/hunting/regulations/on-h-64a` and `/en/hunting/regulations/on-h-66b` are 200.  
`GET /api/hunting/regulations?zone=ON-H-64A` 200.  
`GET /api/hunting/regulations?zone=ON-H-66B&species=moose` returns no invented moose.  
`GET /api/hunting/regulations?zone=ON-12` and `zone=ON-H-12` 404.

## Out of scope

GIS / Fish ON-Line scrape, Forêt ouverte, Sépaq, Stripe, Scout, trip planner, ads, paywall, turkey, small game, elk, wolf, 69A/69B, all Ontario WMUs, Ontario WMU 12, Québec fishing/hunting JSON rewrites, invented bag limits, rewriting v1 `on-h-{63a,63b,65,66a,67}.json`.
