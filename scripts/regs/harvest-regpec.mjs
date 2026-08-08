#!/usr/bin/env node
/**
 * Regulation Resolver v1 — harvester (vision pillar 1).
 *
 * Fetches Québec's sport-fishing regulation pages (regpec, MELCCFP) for the
 * configured zones in BOTH languages and parses the two DevExpress grids —
 * zone-wide rules and per-waterbody exceptions — into structured JSON at
 * data/regulations/zone-{id}.json.
 *
 * Design rules (docs/VISION.md, "regulation-accuracy liability"):
 *  - Rule text is stored VERBATIM from the authority, per language. We parse
 *    structure (periods, species, cells), never paraphrase content.
 *  - Every file carries provenance: source URLs, authority, fetched_at, and
 *    the raw period strings exactly as published.
 *  - Anything unparseable is kept in `raw` rather than dropped.
 *
 * Usage: node scripts/regs/harvest-regpec.mjs [--zones=10,12,13]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const ZONES = (process.argv.find(a => a.startsWith('--zones=')) || '--zones=10,12,13')
  .replace('--zones=', '').split(',').map(s => s.trim());
const BASE = 'https://peche.faune.gouv.qc.ca/regpec';

const decode = s => s
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));

const text = html => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function cells(rowHtml) {
  // positional <td>s minus DevExpress indent cells
  return [...rowHtml.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)]
    .filter(m => !/dxgvIndentCell/.test(m[1]))
    .map(m => text(m[2]));
}

function dmsToDec(d, m, s, neg) {
  const v = Number(d) + Number(m) / 60 + Number(s || 0) / 3600;
  return Math.round((neg ? -v : v) * 1e5) / 1e5;
}

const GPS_RE = /(\d+)°\s*(\d+)'\s*(\d+)?"?\s*N\.?,?\s*(\d+)°\s*(\d+)'\s*(\d+)?"?\s*[OW]/;

function parseGrid(regionHtml, { withWaterbodies }) {
  const rows = [...regionHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
  const out = [];
  let period = null;
  let wb = null;

  for (const row of rows) {
    const full = text(row);
    if (!full) continue;

    const per = full.match(/P[ée]riode(?:\s*:)?\s+(.+)$/) || (full.match(/^(Du|From)\s.+\b(20\d\d)\b/) && [null, full]);
    if (/P[ée]riode|^Period/.test(full) && !/Esp[èe]ce|Species/.test(full)) {
      const m = full.match(/(?:P[ée]riode|Period)\s+(.+)$/);
      period = (m ? m[1] : full).replace(/\b1\s+er\b/g, '1er').trim();
      continue;
    }

    if (withWaterbodies) {
      const gps = full.match(GPS_RE);
      const cs = cells(row);
      // waterbody header: single meaningful cell w/ GPS coords or "(Municipalit..."
      if ((gps || /Municipalit|MRC de|TNO/.test(full)) && cs.filter(Boolean).length <= 1) {
        wb = {
          name: full.split('(')[0].trim().replace(/[.,]$/, ''),
          raw: full,
          coordinates: gps ? { lat: dmsToDec(gps[1], gps[2], gps[3], false), lng: dmsToDec(gps[4], gps[5], gps[6], true) } : null,
          rules: [],
        };
        out.push(wb);
        period = null;
        continue;
      }
    }

    const cs = cells(row);
    if (cs.length < 2) continue;
    if (/^(Esp[èe]ce|Species)$/.test(cs[0] || '')) continue; // header row
    const nonEmpty = cs.filter(Boolean);
    if (!nonEmpty.length) continue;

    const rule = {
      period,
      species: cs[0] || null,
      limit: cs[1] || null,
      length: cs[2] || null,
      gear: cs[3] || null,
      notes: cs[4] || null,
    };
    if (!rule.species) continue;
    if (withWaterbodies) {
      if (wb) wb.rules.push(rule);
    } else {
      out.push(rule);
    }
  }
  return out;
}

function parsePage(html) {
  const iZone = html.indexOf('id="GrilleReglementsZonePeche"');
  const iPlans = html.indexOf('id="GrilleReglementsPlansEau"');
  if (iZone < 0 || iPlans < 0) throw new Error('grid markers not found — regpec layout changed');
  const zoneRegion = html.slice(iZone, iPlans);
  const plansRegion = html.slice(iPlans);
  const title = text((html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1]);
  return {
    title,
    general: parseGrid(zoneRegion, { withWaterbodies: false }),
    waterbodies: parseGrid(plansRegion, { withWaterbodies: true }).filter(w => w.rules.length || w.coordinates),
  };
}

// Waterbody selector ids embedded in the page JS. The DevExpress listbox
// serializes at most its callback page size (100) — zones with more listed
// waterbodies (zone 10 lists ~159) cannot be fully enumerated from static
// HTML. v1 harvests every enumerable id and records coverage honestly;
// full enumeration via the DevExpress callback protocol is a known follow-up.
function endroIds(html) {
  const out = new Map();
  for (const m of html.matchAll(/\{'value':(\d+),'text':'((?:[^'\\]|\\.)*)'/g)) {
    const t = m[2].replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\'/g, "'");
    if (/^(Zone \d|Du |From )/.test(t)) continue;
    if (!out.has(m[1])) out.set(m[1], decode(t));
  }
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchUrl(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'OutdoorIntel-RegHarvester/1.0 (outdoorintel.ca; regulation transparency tool)' } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  await sleep(150);
  return await res.text();
}

// Parse an id_endro page: the PlansEau grid holds the selected waterbody's rules.
function parseEndroPage(html) {
  const i = html.indexOf('id="GrilleReglementsPlansEau"');
  if (i < 0) return [];
  return parseGrid(html.slice(i), { withWaterbodies: false })
    .filter(r => r.species && !/^(Esp[èe]ce|Species)/.test(r.species));
}

mkdirSync(join(REPO, 'data', 'regulations'), { recursive: true });
const fetched_at = new Date().toISOString().slice(0, 10);

for (const zone of ZONES) {
  const frUrl = `${BASE}/fr/info/reglements?id_zone=${zone}`;
  const enUrl = `${BASE}/en/info/reglements?id_zone=${zone}`;
  const frHtml = await fetchUrl(frUrl);
  const enHtml = await fetchUrl(enUrl);
  const pFr = parsePage(frHtml);
  const pEn = parsePage(enHtml);

  // listed waterbodies (names + coords rendered in the page) for coverage + coords lookup
  const listedFr = pFr.waterbodies;
  const coordsByName = new Map(listedFr.filter(w => w.coordinates).map(w => [w.name, w.coordinates]));

  const ids = endroIds(frHtml);
  const enIds = endroIds(enHtml);
  console.log(`zone ${zone}: general FR ${pFr.general.length}/EN ${pEn.general.length}; listed waterbodies ${listedFr.length}; enumerable ids ${ids.size}`);

  const waterbodies = [];
  for (const [id, nameFr] of ids) {
    const wbFrUrl = `${BASE}/fr/info/reglements?id_zone=${zone}&id_endro=${id}`;
    const wbEnUrl = `${BASE}/en/info/reglements?id_zone=${zone}&id_endro=${id}`;
    try {
      const rulesFr = parseEndroPage(await fetchUrl(wbFrUrl));
      const rulesEn = parseEndroPage(await fetchUrl(wbEnUrl));
      waterbodies.push({
        id_endro: Number(id),
        name: { fr: nameFr, en: enIds.get(id) || nameFr },
        coordinates: coordsByName.get(nameFr.split('(')[0].trim()) || null,
        rules: { fr: rulesFr, en: rulesEn },
        source: { fr: wbFrUrl, en: wbEnUrl },
      });
      if (waterbodies.length % 25 === 0) console.log(`  zone ${zone}: ${waterbodies.length}/${ids.size} waterbodies harvested`);
    } catch (e) {
      console.warn(`  zone ${zone} endro ${id} (${nameFr}): ${e.message}`);
    }
  }

  const doc = {
    zone_id: Number(zone),
    activity: 'fishing',
    jurisdiction: 'QC',
    authority: 'Ministère de l’Environnement, de la Lutte contre les changements climatiques, de la Faune et des Parcs (MELCCFP)',
    source: {
      fr: frUrl,
      en: enUrl,
      fetched_at,
      note: 'Rule text reproduced verbatim from the authority. Always verify against the source before fishing.',
    },
    coverage: {
      waterbodies_listed_by_zone_page: listedFr.length,
      waterbodies_harvested: waterbodies.length,
      complete: waterbodies.length >= listedFr.length,
      note: waterbodies.length < listedFr.length
        ? 'The authority page lists more waterbody exceptions than are enumerable from static HTML; this file covers the enumerable subset. Always check the source for a specific waterbody.'
        : 'All waterbody exceptions listed by the zone page are included.',
    },
    title: { fr: pFr.title, en: pEn.title },
    general: { fr: pFr.general, en: pEn.general },
    waterbodies,
  };
  const outPath = join(REPO, 'data', 'regulations', `zone-${zone}.json`);
  writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
  const withRules = waterbodies.filter(w => w.rules.fr.length).length;
  console.log(`zone ${zone}: ${waterbodies.length} waterbodies harvested (${withRules} with exception rules) -> ${outPath}`);
}
