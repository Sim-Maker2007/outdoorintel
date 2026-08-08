# Outdoor Intel — End-State Vision

*Adopted 2026-08. Supersedes the strategy sections of OUTDOOR_INTEL_TRAFFIC_STRATEGY.md and
CONTENT_EXPANSION_PLAN.md; complements docs/REFERENCE_OPERATING_PLAN.md ("Accuracy Is The
Product") and docs/ASTRO_MIGRATION.md. Grounded in two market-research briefs (competitive
landscape; demand side + Québec ecosystem), 2025–26 data.*

## Purpose (one sentence)

**Outdoor Intel is the bilingual outdoor copilot for Québec: it takes anyone — beginner to
expert, in French or English — from intention to a legal, well-prepared, well-equipped trip;
and it is the verified Canadian outdoor dataset that AI assistants everywhere call.**
Ecotone (ecotonegatineau.ca) is its physical arm: the copilot's "prepare" step ends at the store.

## Strategic decisions (locked)

| Question | Decision |
|---|---|
| Geography | **Québec-first depth.** The pan-Canada registry stays as SEO surface; every new capability ships Québec-first. |
| Business model | **Freemium.** Free registry + regulation lookup + basic planner; paid Pro tier (~$30–45/yr; anchors: Ouananiche $30, Fishbrain $75, onX Elite $100 US). Gear bridge + referrals are complementary revenue and the merge rationale. |
| AI strategy | **Own the answer layer.** Expose the verified dataset (API → MCP server → assistant apps) so ChatGPT/Claude/Gemini cite Outdoor Intel for Canadian outdoor questions. |
| Store integration | **Gatineau only** (no franchise-network build for now). |

## The gap this fills (research findings)

1. **Nobody is multi-activity.** onX sells four separate apps; AllTrails refuses hunt/fish;
   iHunter is hunt-only and split per province; Ouananiche.ca (new, bilingual, "Cyril" AI,
   $30/yr) is fishing-only. A Québec outdoorsperson's year currently requires ~5 apps.
2. **Regulations are the #1 friction and nobody solves them.** Québec: 29 fishing zones +
   33 hunting zones + ~1,858 waterbody exceptions, served as an HTML-only zone-first tool
   with biennial PDFs. A cottage industry of third-party explainer sites proves the primary
   source is unusable. Nobody answers *"I'm at this lake, on this date — what can I keep?"*
3. **The tenure maze is unexplained.** ZEC vs pourvoirie (PADE exclusive rights) vs réserve
   faunique vs Crown land vs municipal launch fees: apps draw boundaries; nobody explains
   consequences. The provincial federation officially recommends foreign English apps and
   Avenza PDFs to its members.
4. **Bilingual is empty.** No bilingual multi-activity Canadian platform exists. The majors'
   AI features are English-only even where their UIs are translated.
5. **AI credibility is collapsing in the outdoors.** SAR teams publicly blame AllTrails' AI
   routes; 300+ app-linked incidents in Kananaskis; generic LLMs hallucinate trails and
   seasons. *Grounded, cited, dated* AI is now a product feature, not an engineering chore.
6. **Retail + platform works only one way.** GOHUNT (research sub + gear store recycling
   margin into membership) — US/English/hunting-only. Fishbrain retreated from owning
   commerce; REI killed its trips arm. Own the intent, not the fulfillment.
7. **~60,000 Quebecers/yr finish a certification course and fall off a cliff** — women (~29%)
   and youth (~23%) shares flat for a decade; the funnel leaks after training. Newcomers are
   the least-served, highest-potential segment (language/culture/logistics barriers — exactly
   what a bilingual step-by-step product removes).
8. **Demand concentrates on famous spots** (Sépaq hotspots +109%/10yr while other parks are
   −30%) and communities punish spot-doxxing. Dispersal to comparable alternatives is the
   defensible primitive.

## The seven pillars (in moat order)

1. **The Regulation Resolver — the wedge.** Place + date + species → what's legal (limits,
   sizes, gear, seasons, exceptions), every answer carrying source citation, jurisdiction and
   effective-date stamp, FR+EN. Built by parsing the government per-waterbody exceptions into
   structured data joined to the LCE lake database. Hardest to copy; the AI's grounding; free.
2. **The Access/Tenure Layer.** "Can I legally be here, what does it cost, who do I ask?"
   across ZEC / pourvoirie / réserve / refuge / Crown / municipal access.
   ⚠️ Founding-stage legal gate: the TFS boundary dataset's record shows CC-BY-NC-ND while
   Données Québec's common licence is CC-BY — obtain written clarification from MRNF first.
3. **The Trip Copilot (Scout, evolved).** Conversational, bilingual, grounded-ONLY (the
   existing anti-hallucination tool-loop in `api/scout/plan.js` extends over regs + tenure +
   conditions + availability). Signature move: *dispersal* — "comparable alternatives to
   where you were going" — never doxxing honey-holes. Advanced copilot = Pro.
4. **The Prepare Pipeline — the Ecotone seam.** Trip → legal-spec-aware kit list ("barbless
   only in this zone; min 55 cm — here's the right net") → gear bridge (affiliate today,
   Ecotone at announcement, one-line flip in `data/link-config.json`) + licence checklist +
   draw-deadline calendar (Sépaq lotteries, season openings — a weekly-visit reason even as
   read-only aggregation).
5. **Beginner Mode.** Post-certificate onboarding: certified → first licence → first legal
   spot within 2 h → first kit → first trip debrief. Bilingual-native, newcomer-friendly.
6. **The Answer Layer.** The verified dataset exposed as a public read-only API, then an MCP
   server, then assistant apps — so "quelle est la limite pour le doré en zone 10?" resolves
   to Outdoor Intel. AllTrails proved the channel (English/hiking only); the bilingual
   Canadian slot is empty. Distribution and moat that compound with the registry.
7. **The Community Verification Loop.** Existing reports/corrections become the trust
   engine: verify access points, conditions, fees — never secret spots ("Secret Spots Stay
   Secret" is the reference posture).

## Freemium shape

- **Free:** registry, regulation lookup, basic planner, community. The free tier must beat
  the incumbents so Québec adopts it as the default — that adoption is what makes the
  dataset and answer-layer moats real.
- **Pro:** offline maps/regs, full Trip Copilot, alerts (regulation changes, draw deadlines,
  conditions on saved spots), compliance log, unlimited saved trips.
- **Complementary:** gear bridge revenue, booking referrals; the intent data (who is
  planning what trip where) is the strategic asset a pure retailer cannot replicate.

## Non-goals

Operating trips or bookings (aggregate + refer only) · spot-doxxing or "secret spots"
content · US expansion · competing on national breadth with onX/AllTrails · owning
fulfillment.

## Why this merges organically into Ecotone

The copilot owns the upstream moment (intent, trust, planning); the store owns the
downstream one (gear in hand, licence desk, human expertise). The Prepare Pipeline is the
literal seam and is already built as the swappable gear bridge. Ecotone's `/intel` section
becomes "powered by OutdoorIntel" — the shared name is the acquisition story. Store staff
answer regulation questions with the same Resolver customers use: AI as expertise-that-
scales on the store's own turf.

## Strategic risks

- **Ouananiche going multi-activity** — they validated the bilingual AI and the price point;
  move first.
- **Provincial apps closing the gap** (Ontario's FishHuntON early 2027; BC WILD 2026-27) —
  they solve *licensing*, not *comprehension*; stay on comprehension.
- **TFS data licence** — resolve in writing before building the tenure layer.
- **Regulation-accuracy liability** — every answer cited + dated + "verify with the
  authority" framing; never unsourced generation.

## What this changes in the codebase (next builds)

- New structured `data/` layer for regulation zones/rules with zod gates (pattern:
  `src/lib/spots.mjs`); spot records gain `zone_id` / `tenure`.
- `api/scout/plan.js` gains regulation/tenure lookup tools inside the same grounded loop.
- `src/lib/gearResolver.mjs` gains legal-spec awareness (zone rules filter/annotate items —
  schema already supports modifiers).
- Answer Layer v1 = public read-only JSON endpoints on the existing `api/` surface.
- **Priority reorder:** Regulation Resolver v1 (Québec fishing, zones around Gatineau,
  cited, bilingual) is the next major build after the Astro cutover — ahead of blog
  templating and FR chrome pages.

## Validating before heavy build

1. Ship Resolver v1 for 2–3 zones around Gatineau; measure FR organic traffic against the
   explainer-site incumbents.
2. Interview Ecotone's licence-desk moment: what do customers actually ask when buying a
   licence?
3. Confirm the TFS licence; sound out Sépaq/ZEC partnership appetite for the draw calendar
   before scraping anything.
