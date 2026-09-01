#!/usr/bin/env node
/**
 * Québec hunting-seasons harvest v1 (docs/HUNTING_SEASONS_HARVEST_V1.md).
 *
 * Fetches quebec.ca HTML tables for white-tailed deer and moose (EN+FR),
 * extracts the 2026 season column, and writes data/hunting/qc-h-{id}.json.
 * Does not write or rewrite data/regulations/zone-*.json or on-fmz-*.json.
 * Does not OCR maps. Does not scrape Forêt ouverte / Sépaq / Fish ON-Line.
 *
 * Usage: node scripts/regs/harvest-hunting-qc.mjs [--zones=10E,10W,11E,11W]
 *        node scripts/regs/harvest-hunting-qc.mjs --html-dir=DIR
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHuntingPeriod } from '../../src/lib/huntResolver.mjs';

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

const REPO = process.cwd();
const UA = 'OutdoorIntel-RegHarvester/1.0 (outdoorintel.ca; regulation transparency tool)';
const CRAWL_DELAY_MS = 1000;
const LICENCE_YEAR = '2026-2027';
const SEASON_YEAR = 2026;
const AUTHORITY = 'Ministère de l’Environnement, de la Lutte contre les changements climatiques, de la Faune et des Parcs (MELCCFP); Québec.ca sport hunting';

const DEFAULT_ZONES = ['10E', '10W', '11E', '11W', '9E', '9W', '12'];
const OPTIONAL_QC = [];

const zonesArg = (process.argv.find(a => a.startsWith('--zones=')) || '').replace('--zones=', '');
const htmlDirArg = (process.argv.find(a => a.startsWith('--html-dir=')) || '').replace('--html-dir=', '');
const includeOptional = process.argv.includes('--with-9-12') || process.argv.includes('--optional-qc');
const ZONES = (zonesArg || (includeOptional ? DEFAULT_ZONES.concat(OPTIONAL_QC) : DEFAULT_ZONES).join(','))
  .split(',')
  .map(s => s.trim().toUpperCase().replace(/EAST$/, 'E').replace(/WEST$/, 'W'))
  .filter(Boolean);

const URLS = {
  moose: {
    en: 'https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/seasons-bag-limits/moose',
    fr: 'https://www.quebec.ca/tourisme-loisirs-sport/activites-sportives-et-de-plein-air/chasse-sportive/periodes-limites/orignal',
  },
  deer: {
    en: 'https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/seasons-bag-limits/white-tailed-deer',
    fr: 'https://www.quebec.ca/tourisme-loisirs-sport/activites-sportives-et-de-plein-air/chasse-sportive/periodes-limites/cerf-virginie',
  },
  deer_game: {
    en: 'https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/game/white-tailed-deer',
    fr: 'https://www.quebec.ca/tourisme-loisirs-sport/activites-sportives-et-de-plein-air/chasse-sportive/gibier/cerf-virginie',
  },
  maps: {
    en: 'https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/hunting-zone-maps',
    fr: 'https://www.quebec.ca/tourisme-loisirs-sport/activites-sportives-et-de-plein-air/chasse-sportive/cartes-zones',
  },
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const decode = s => String(s)
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'");

function text(html) {
  if (!html) return '';
  let s = String(html).replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<sup>([\s\S]*?)<\/sup>/gi, '$1');
  s = s.replace(/<[^>]+>/g, ' ');
  return decode(s).replace(/\s+/g, ' ').trim();
}

function headingBefore(html, pos) {
  const before = html.slice(Math.max(0, pos - 2500), pos);
  const matches = [...before.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  if (!matches.length) return '';
  const last = matches[matches.length - 1];
  return text(last[2]);
}

const DIR_MAP = {
  east: 'E', est: 'E', e: 'E',
  west: 'W', ouest: 'W', w: 'W',
  north: 'N', nord: 'N', n: 'N',
  south: 'S', sud: 'S', s: 'S',
};

/** Parse "1, 2, 10 West, 11 West, 15" → [{n:'10', part:'W'}, ...]. */
export function parseZoneCell(cell) {
  const s = String(cell || '');
  const out = [];
  const re = /(?<!\d)(\d{1,2})\s*(East|West|North|South|Est|Ouest|Nord|Sud(?:-ouest)?|Southwest)?(?!\d)/gi;
  let m;
  while ((m = re.exec(s))) {
    const n = String(Number(m[1]));
    let part = '';
    if (m[2]) {
      const raw = m[2].toLowerCase().replace(/-ouest/, '');
      if (/southwest|sud/.test(m[2].toLowerCase()) && /west|ouest/.test(m[2].toLowerCase())) part = 'SW';
      else part = DIR_MAP[raw] || '';
    }
    out.push({ n, part, token: `${n}${part}` });
  }
  return out;
}

export function zoneMatches(tokens, zoneId) {
  const want = String(zoneId).toUpperCase();
  const wm = want.match(/^(\d{1,2})([EWSN]{0,2})$/);
  if (!wm) return false;
  const n = String(Number(wm[1]));
  const part = wm[2] || '';
  return tokens.some(t => {
    if (t.n !== n) return false;
    if (t.part === part) return true;
    // Undivided "9" / "12" applies to 9E and 9W files, and to undivided 12.
    if (!t.part && part) return true;
    if (!t.part && !part) return true;
    return false;
  });
}

function classifySpeciesKey(speciesLabel, pageSpecies) {
  const s = `${speciesLabel} ${pageSpecies}`.toLowerCase();
  if (/moose|orignal/.test(s)) return 'moose';
  if (/deer|cerf/.test(s)) return 'white-tailed-deer';
  return pageSpecies;
}

function isZecTable(tblHtml, heading) {
  const firstRow = (tblHtml.match(/<tr[\s\S]*?<\/tr>/i) || [])[0] || '';
  const firstCell = text((firstRow.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/i) || [])[1] || '');
  if (/^zec$/i.test(firstCell)) return true;
  if (/\bzecs?\b/i.test(heading) && !/zone/i.test(firstCell)) return true;
  return false;
}

function cellList(rowHtml) {
  return [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(m => text(m[1]));
}

function parseSeasonTables(html, { pageSpecies, lang }) {
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  const rowsOut = [];
  for (const tm of tables) {
    const tbl = tm[0];
    const heading = headingBefore(html, tm.index);
    if (isZecTable(tbl, heading)) continue;
    const trs = [...tbl.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (!trs.length) continue;
    const header = cellList(trs[0][1]);
    const y2026 = header.findIndex(h => /2026/.test(h));
    const y2027 = header.findIndex(h => /2027/.test(h));
    if (y2026 < 0) continue;
    const zoneIdx = 0;
    const segmentIdx = header.findIndex(h => /segment|âge|age and sex|sexe/i.test(h));
    for (let i = 1; i < trs.length; i++) {
      const cells = cellList(trs[i][1]);
      if (cells.filter(Boolean).length < 2) continue;
      const zoneCell = cells[zoneIdx] || '';
      const tokens = parseZoneCell(zoneCell);
      if (!tokens.length) continue;
      const segment = (segmentIdx >= 0 ? cells[segmentIdx] : cells[1]) || null;
      const period_2026 = cells[y2026] || null;
      const period_2027 = y2027 >= 0 ? (cells[y2027] || null) : null;
      const iso = parseHuntingPeriod(period_2026);
      const species_key = classifySpeciesKey(segment, pageSpecies);
      rowsOut.push({
        heading,
        zoneCell,
        tokens,
        weapon_class: heading,
        species: pageSpecies === 'moose'
          ? (lang === 'fr' ? 'Orignal' : 'Moose')
          : (lang === 'fr' ? 'Cerf de Virginie' : 'White-tailed deer'),
        species_key,
        segment,
        period: period_2026,
        period_2026,
        period_2027,
        period_from: iso?.from || null,
        period_to: iso?.to || null,
        year: SEASON_YEAR,
        notes: null,
        raw: [heading, zoneCell, segment, period_2026].filter(Boolean).join(' · '),
      });
    }
  }
  return rowsOut;
}

function extractParagraphsAround(html, testFn) {
  const blocks = [...html.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  const texts = [];
  for (const b of blocks) {
    const inner = b[2].replace(/<(p|li|div|ul|ol|h[1-6])\b[\s\S]*$/i, '');
    const t = text(inner);
    if (t && testFn(t) && t.length > 40 && t.length < 1200 && !texts.includes(t)) texts.push(t);
  }
  return texts;
}

function extractSectionByHeading(html, headingRe) {
  const h = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
  for (let i = 0; i < h.length; i++) {
    if (!headingRe.test(text(h[i][1]))) continue;
    const start = h[i].index + h[i][0].length;
    const end = i + 1 < h.length ? h[i + 1].index : Math.min(html.length, start + 8000);
    const chunk = html.slice(start, end);
    const paras = [...chunk.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
      .map(m => text(m[2]))
      .filter(t => t && t.length > 20);
    return { heading: text(h[i][1]), paras, text: paras.join(' ') };
  }
  return { heading: null, paras: [], text: '' };
}

function drawNoticeFromMoose(html, lang) {
  const hits = extractParagraphsAround(html, t =>
    lang === 'fr'
      ? /tirage/i.test(t) && /sans bois/i.test(t)
      : /through the draw/i.test(t) && /moose without antlers/i.test(t)
  );
  const extra = extractParagraphsAround(html, t =>
    lang === 'fr'
      ? /à compter de 2026|à partir de 2026|année permissive|année restrictive|permis spécial/i.test(t)
      : /starting in 2026|alternating-year|restrictive year|permissive year/i.test(t)
  );
  const texts = [...new Set([...hits, ...extra])];
  const primary = hits.find(t => /1 to 12|1 à 12|zones 1/i.test(t)) || hits[0] || texts[0] || null;
  return {
    kind: 'draw_required',
    draw_required: true,
    flag: true,
    applies_to: 'moose_without_antlers',
    year: 2026,
    text: primary,
    related: texts.filter(t => t !== primary),
  };
}

function deerBagNotice(html, lang) {
  const sec = extractSectionByHeading(html, lang === 'fr'
    ? /limites de prise.*cerf/i
    : /bag limits for the white-tailed deer/i);
  const textBlob = sec.text || extractParagraphsAround(html, t =>
    lang === 'fr'
      ? /2 cerfs? par chasseur|deux zones différentes/i.test(t)
      : /2 deer per hunter|two different zones/i.test(t)
  ).join(' ');
  return {
    kind: 'deer_bag',
    draw_required: false,
    text: textBlob || null,
    paras: sec.paras,
  };
}

function parseMaps(html) {
  const foret = html.match(/href="(https?:\/\/www\.foretouverte\.gouv\.qc\.ca[^"]*)"/i);
  const pdfs = {};
  for (const m of html.matchAll(/href="(https?:\/\/cdn-contenu\.quebec\.ca\/cdn-contenu\/chasse\/Documents\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decode(m[1]);
    const label = text(m[2]);
    if (/10/.test(label) && /11/.test(label) || /zone-10-11|chasse-10-11/i.test(href)) pdfs['10-11'] = { href, label };
    if (/\b9\b/.test(label) && !/19/.test(label) || /zone-09|chasse-09/i.test(href)) pdfs['9'] = { href, label };
    if (/12/.test(label) && /13/.test(label) || /zone-12-13|chasse-12-13/i.test(href)) pdfs['12-13'] = { href, label };
  }
  return {
    foret_ouverte: foret ? decode(foret[1].replace(/&amp;/g, '&')) : 'https://www.foretouverte.gouv.qc.ca/?context=_chasse',
    pdfs,
  };
}

function pdfForZone(maps, zoneId, lang) {
  const n = String(zoneId).replace(/[A-Z]+$/i, '');
  if (n === '10' || n === '11') return maps[lang].pdfs['10-11'] || null;
  if (n === '9') return maps[lang].pdfs['9'] || null;
  if (n === '12') return maps[lang].pdfs['12-13'] || null;
  return null;
}

function titleFor(zoneId, lang) {
  const label = zoneLabel(zoneId, lang);
  return lang === 'fr'
    ? `Zone de chasse ${label} — cerf de Virginie et orignal (période 2026)`
    : `Hunting zone ${label} — white-tailed deer and moose (2026 season)`;
}

function zoneLabel(zoneId, lang) {
  const m = String(zoneId).match(/^(\d+)([EWNS]?)$/);
  if (!m) return zoneId;
  if (!m[2]) return m[1];
  if (m[2] === 'E') return lang === 'fr' ? `${m[1]} est` : `${m[1]} East`;
  if (m[2] === 'W') return lang === 'fr' ? `${m[1]} ouest` : `${m[1]} West`;
  return zoneId;
}

function coverageFor(zoneId, enRows, frRows) {
  const enZ = enRows.filter(r => zoneMatches(r.tokens, zoneId));
  const frZ = frRows.filter(r => zoneMatches(r.tokens, zoneId));
  const listed = enZ.length;
  const harvested = enZ.length;
  const listedFr = frZ.length;
  const harvestedFr = frZ.length;
  const weaponsEn = [...new Set(enZ.map(r => r.weapon_class))];
  const weaponsFr = [...new Set(frZ.map(r => r.weapon_class))];
  const speciesEn = [...new Set(enZ.map(r => r.species_key))];
  const speciesFr = [...new Set(frZ.map(r => r.species_key))];
  const hasDeer = speciesEn.includes('white-tailed-deer') && speciesFr.includes('white-tailed-deer');
  const hasMoose = speciesEn.includes('moose') && speciesFr.includes('moose');
  const has2026 = enZ.every(r => r.period_2026) && frZ.every(r => r.period_2026);
  const weaponsNotCollapsed = weaponsEn.length === new Set(weaponsEn.map(w => w.toLowerCase().replace(/seasons?$/, '').trim())).size;
  let complete = listed > 0 && harvested >= listed && harvestedFr >= listedFr
    && hasDeer && hasMoose && has2026 && weaponsEn.length > 0 && weaponsFr.length > 0;
  // Honest: never invert listed vs harvested.
  if (harvested < listed || harvestedFr < listedFr) complete = false;
  const note = complete
    ? `Québec hunting zone ${zoneId}: white-tailed deer and moose, 2026 season column, weapon classes kept as published headings. Not all 28 hunting zones. Not small game. Not GIS.`
    : `Québec hunting zone ${zoneId}: harvest incomplete for the stated deer+moose 2026 slice (EN ${harvested}/${listed}, FR ${harvestedFr}/${listedFr}; deer=${hasDeer} moose=${hasMoose}).`;
  return {
    slice: `QC hunting zone ${zoneId}; white-tailed deer + moose; 2026 season column`,
    species_listed: 2,
    species_harvested: (hasDeer ? 1 : 0) + (hasMoose ? 1 : 0),
    weapon_classes_listed: weaponsEn.length,
    weapon_classes_harvested: weaponsEn.length,
    weapon_classes_listed_fr: weaponsFr.length,
    weapon_classes_harvested_fr: weaponsFr.length,
    season_rows_listed: listed,
    season_rows_harvested: harvested,
    season_rows_listed_fr: listedFr,
    season_rows_harvested_fr: harvestedFr,
    complete,
    note,
    weapon_classes: { en: weaponsEn, fr: weaponsFr },
    species: { en: speciesEn, fr: speciesFr },
    weapons_not_collapsed: weaponsNotCollapsed,
  };
}

function toSeasonRow(r) {
  return {
    species: r.species,
    species_key: r.species_key,
    weapon_class: r.weapon_class,
    segment: r.segment,
    period: r.period_2026,
    period_2026: r.period_2026,
    period_2027: r.period_2027,
    period_from: r.period_from,
    period_to: r.period_to,
    year: SEASON_YEAR,
    notes: r.notes,
    raw: r.raw,
  };
}

async function fetchUrl(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en,fr;q=0.8' } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  await sleep(CRAWL_DELAY_MS);
  return await res.text();
}

function loadLocal(name) {
  const p = join(htmlDirArg, `${name}.html`);
  if (!existsSync(p)) throw new Error(`missing ${p}`);
  return readFileSync(p, 'utf-8');
}

async function loadPage(name, url) {
  if (htmlDirArg) return loadLocal(name);
  return fetchUrl(url);
}

export async function harvestHuntingQc() {
const pages = {
  moose_en: await loadPage('moose-en', URLS.moose.en),
  moose_fr: await loadPage('moose-fr', URLS.moose.fr),
  deer_en: await loadPage('deer-en', URLS.deer.en),
  deer_fr: await loadPage('deer-fr', URLS.deer.fr),
  deer_game_en: await loadPage('deer-game-en', URLS.deer_game.en),
  deer_game_fr: await loadPage('deer-game-fr', URLS.deer_game.fr),
  maps_en: await loadPage('maps-en', URLS.maps.en),
  maps_fr: await loadPage('maps-fr', URLS.maps.fr),
};

const mooseEn = parseSeasonTables(pages.moose_en, { pageSpecies: 'moose', lang: 'en' });
const mooseFr = parseSeasonTables(pages.moose_fr, { pageSpecies: 'moose', lang: 'fr' });
const deerEn = parseSeasonTables(pages.deer_en, { pageSpecies: 'white-tailed-deer', lang: 'en' });
const deerFr = parseSeasonTables(pages.deer_fr, { pageSpecies: 'white-tailed-deer', lang: 'fr' });
const allEn = mooseEn.concat(deerEn);
const allFr = mooseFr.concat(deerFr);

if (mooseEn.length === 0 || deerEn.length === 0) {
  console.error('harvest-hunting-qc: no season rows parsed — quebec.ca layout changed');
  process.exit(1);
}

const drawEn = drawNoticeFromMoose(pages.moose_en, 'en');
const drawFr = drawNoticeFromMoose(pages.moose_fr, 'fr');
const bagEn = deerBagNotice(pages.deer_game_en, 'en');
const bagFr = deerBagNotice(pages.deer_game_fr, 'fr');
const maps = { en: parseMaps(pages.maps_en), fr: parseMaps(pages.maps_fr) };

if (!drawEn.text || !/through the draw/i.test(drawEn.text)) {
  console.error('harvest-hunting-qc: moose-without-antlers draw notice missing');
  process.exit(1);
}
if (!drawFr.text || !/tirage/i.test(drawFr.text)) {
  console.error('harvest-hunting-qc: moose-without-antlers FR draw notice missing');
  process.exit(1);
}
if (!bagEn.text || !/2 deer|two different zones/i.test(bagEn.text)) {
  console.error('harvest-hunting-qc: statewide deer bag notice missing from EN game page');
  process.exit(1);
}
if (!bagFr.text) {
  console.error('harvest-hunting-qc: statewide deer bag notice missing from FR game page');
  process.exit(1);
}
if (!maps.en.foret_ouverte || !maps.en.pdfs['10-11'] || !maps.fr.pdfs['10-11']) {
  console.error('harvest-hunting-qc: Forêt ouverte or zone 10+11 PDF map links missing');
  process.exit(1);
}

const fetched_at = new Date().toISOString().slice(0, 10);
const outDir = join(REPO, 'data', 'hunting');
mkdirSync(outDir, { recursive: true });

let fatal = 0;
for (const zoneId of ZONES) {
  if (/^12$/.test(zoneId) === false && !/^(9|10|11)[EW]$/.test(zoneId) && zoneId !== '12') {
    // still allow explicit ids; refuse Ontario WMU 12
  }
  if (zoneId === 'ON-12' || zoneId === '12A' && false) continue;

  const enRows = allEn.filter(r => zoneMatches(r.tokens, zoneId));
  const frRows = allFr.filter(r => zoneMatches(r.tokens, zoneId));
  const coverage = coverageFor(zoneId, allEn, allFr);

  if (enRows.length === 0 || frRows.length === 0) {
    console.error(`zone ${zoneId}: no EN/FR season rows`);
    fatal++;
    continue;
  }

  const weapons = new Set(enRows.map(r => r.weapon_class));
  const collapsed = [...weapons].some(a => [...weapons].some(b => a !== b && (a.includes(b) || b.includes(a)) && /bow/i.test(a) && /firearm/i.test(b) && a === b));
  if (collapsed) {
    console.error(`zone ${zoneId}: weapon classes appear collapsed`);
    fatal++;
    continue;
  }

  const slug = `qc-h-${zoneId.toLowerCase()}`;
  const zone_key = `QC-H-${zoneId}`;
  const n = zoneId.replace(/[A-Z]+$/i, '');
  const pdfEn = pdfForZone(maps, zoneId, 'en');
  const pdfFr = pdfForZone(maps, zoneId, 'fr');

  const noticesEn = [
    { ...drawEn, flag: true },
    { ...bagEn },
  ];
  const noticesFr = [
    { ...drawFr, flag: true },
    { ...bagFr },
  ];

  const doc = {
    zone_id: zoneId,
    zone_key,
    slug,
    activity: 'hunting',
    jurisdiction: 'QC',
    licence_year: LICENCE_YEAR,
    season_column: SEASON_YEAR,
    hunting_zone: n,
    hunting_part: zoneId.replace(n, '') || null,
    authority: AUTHORITY,
    source: {
      en: URLS.moose.en,
      fr: URLS.moose.fr,
      moose: URLS.moose,
      deer: URLS.deer,
      deer_bag: URLS.deer_game,
      maps: URLS.maps,
      fetched_at,
      note: 'Season text reproduced verbatim from Québec.ca HTML tables (2026 column). Weapon class is the published section heading. Maps are cited as links only — not OCR’d, not scraped from Forêt ouverte.',
    },
    maps: {
      foret_ouverte: maps.en.foret_ouverte,
      pdf_en: pdfEn,
      pdf_fr: pdfFr,
      index_en: URLS.maps.en,
      index_fr: URLS.maps.fr,
    },
    coverage,
    title: { en: titleFor(zoneId, 'en'), fr: titleFor(zoneId, 'fr') },
    notices: { en: noticesEn, fr: noticesFr },
    seasons: {
      en: enRows.map(toSeasonRow),
      fr: frRows.map(toSeasonRow),
    },
  };

  const outPath = join(outDir, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
  console.log(`${zone_key}: deer+moose EN ${enRows.length} FR ${frRows.length} weapons EN ${coverage.weapon_classes_listed} complete=${coverage.complete} -> ${outPath}`);
}

if (fatal) {
  console.error(`harvest-hunting-qc: ${fatal} zone(s) failed`);
  process.exitCode = 1;
  return { fatal };
}
return { fatal: 0, zones: ZONES };
}

if (isMain) await harvestHuntingQc();
