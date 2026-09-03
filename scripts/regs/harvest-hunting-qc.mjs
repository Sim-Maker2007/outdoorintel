#!/usr/bin/env node
/**
 * Québec hunting-seasons harvest v1 (docs/HUNTING_SEASONS_HARVEST_V1.md).
 *
 * Fetches quebec.ca HTML tables for white-tailed deer, moose, and black bear
 * (EN+FR), extracts the 2026 season column, and writes data/hunting/qc-h-{id}.json.
 * Black bear is added only where the official table lists that zone/subzone;
 * missing species rows are skipped and disclosed. Published splits only.
 * Does not write or rewrite data/regulations/zone-*.json or on-fmz-*.json.
 * Does not OCR maps. Does not scrape Forêt ouverte / Sépaq / Fish ON-Line.
 * Does not harvest turkey or small game. Does not invent unpublished splits.
 *
 * Usage: node scripts/regs/harvest-hunting-qc.mjs [--zones=4,5E,5W,6N,6S,14,15E,15W,16]
 *        node scripts/regs/harvest-hunting-qc.mjs --html-dir=DIR
 *        node scripts/regs/harvest-hunting-qc.mjs --rewrite-existing  (refresh live keys)
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
/** Adjacent QC hunting zones (deer + moose 2026). Published splits only. */
const ADJACENT_QC = ['7N', '7S', '8E', '8N', '8S', '13SW'];
/** Southern / populated QC hunting zones. Published splits only — no invented 4E/4W, 5N/5S, 6E/6W, 14 E/W, 15 N/S, 16 E/W. */
const SOUTHERN_QC = ['4', '5E', '5W', '6N', '6S', '14', '15E', '15W', '16'];
/** Live keys from earlier PRs. Do not rewrite unless --rewrite-existing. */
const LIVE_EXISTING_KEYS = new Set(['7N', '7S', '8E', '8N', '8S', '9E', '9W', '10E', '10W', '11E', '11W', '12', '13SW']);
const OPTIONAL_QC = [];

const zonesArg = (process.argv.find(a => a.startsWith('--zones=')) || '').replace('--zones=', '');
const htmlDirArg = (process.argv.find(a => a.startsWith('--html-dir=')) || '').replace('--html-dir=', '');
const includeOptional = process.argv.includes('--with-9-12') || process.argv.includes('--optional-qc');
const includeAdjacent = !process.argv.includes('--core-only');
const includeSouthern = !process.argv.includes('--core-only') && !process.argv.includes('--no-southern');
const rewriteExisting = process.argv.includes('--rewrite-existing');
const defaultList = DEFAULT_ZONES
  .concat(includeAdjacent ? ADJACENT_QC : [])
  .concat(includeSouthern ? SOUTHERN_QC : [])
  .concat(includeOptional ? OPTIONAL_QC : []);
const ZONES = (zonesArg || defaultList.join(','))
  .split(',')
  .map(s => s.trim().toUpperCase()
    .replace(/SOUTHWEST$/, 'SW')
    .replace(/SUD-?OUEST$/, 'SW')
    .replace(/EAST$/, 'E').replace(/WEST$/, 'W')
    .replace(/NORTH$/, 'N').replace(/SOUTH$/, 'S')
    .replace(/EST$/, 'E').replace(/OUEST$/, 'W')
    .replace(/NORD$/, 'N').replace(/SUD$/, 'S'))
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
  bear: {
    en: 'https://www.quebec.ca/en/tourism-recreation-sport/sporting-and-outdoor-activities/sport-hunting/seasons-bag-limits/black-bear',
    fr: null, // discovered from the FR seasons hub — never guess a 404 slug
  },
  bear_game: {
    en: null,
    fr: null,
  },
};

const HUBS = {
  seasons_fr: 'https://www.quebec.ca/tourisme-loisirs-sport/activites-sportives-et-de-plein-air/chasse-sportive/periodes-limites',
};

function discoverFrSeasonsUrl(hubHtml, { mustMatch }) {
  const hrefs = [...hubHtml.matchAll(/href="(\/tourisme-loisirs-sport\/activites-sportives-et-de-plein-air\/chasse-sportive\/periodes-limites\/[a-z0-9-]+)"/gi)]
    .map(m => m[1]);
  const found = hrefs.find(h => mustMatch.test(h));
  if (!found) throw new Error(`FR seasons URL matching ${mustMatch} not found on FR hub`);
  return `https://www.quebec.ca${found}`;
}

function discoverGameUrl(html, lang) {
  const re = lang === 'fr'
    ? /href="(\/tourisme-loisirs-sport\/activites-sportives-et-de-plein-air\/chasse-sportive\/gibier\/[a-z0-9-]+)/gi
    : /href="(\/en\/tourism-recreation-sport\/sporting-and-outdoor-activities\/sport-hunting\/game\/[a-z0-9-]+)/gi;
  const hrefs = [...html.matchAll(re)].map(m => m[1].split('#')[0]);
  const found = hrefs.find(h => /ours-noir|black-bear/i.test(h));
  if (!found) throw new Error(`black bear game page URL not found on ${lang} seasons page`);
  return `https://www.quebec.ca${found}`;
}

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
  southwest: 'SW', sw: 'SW',
};

/** Parse "1, 2, 10 West, 7 North, 13 Southwest" → [{n:'10', part:'W'}, ...]. */
export function parseZoneCell(cell) {
  const s = String(cell || '');
  const out = [];
  // Southwest / sud-ouest MUST precede South / sud so "13 Southwest" is 13SW not 13S.
  const re = /(?<!\d)(\d{1,2})\s*(Southwest|Sud-ouest|East|West|North|South|Est|Ouest|Nord|Sud)?(?!\d)/gi;
  let m;
  while ((m = re.exec(s))) {
    const n = String(Number(m[1]));
    let part = '';
    if (m[2]) {
      const raw = m[2].toLowerCase();
      if (/southwest/.test(raw) || (raw.includes('sud') && raw.includes('ouest'))) part = 'SW';
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
    // Undivided "7" / "8" / "13" applies to published parts (7N, 8E, 13SW).
    if (!t.part && part) return true;
    if (!t.part && !part) return true;
    return false;
  });
}

function classifySpeciesKey(speciesLabel, pageSpecies) {
  const s = `${speciesLabel || ''} ${pageSpecies || ''}`.toLowerCase();
  if (/moose|orignal/.test(s)) return 'moose';
  if (/deer|cerf/.test(s)) return 'white-tailed-deer';
  if (/bear|ours/.test(s)) return 'black-bear';
  return pageSpecies;
}

function publishedSpeciesName(pageSpecies, lang) {
  if (pageSpecies === 'moose') return lang === 'fr' ? 'Orignal' : 'Moose';
  if (pageSpecies === 'white-tailed-deer') return lang === 'fr' ? 'Cerf de Virginie' : 'White-tailed deer';
  if (pageSpecies === 'black-bear') return lang === 'fr' ? 'Ours noir' : 'Black bear';
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
      const segment = segmentIdx >= 0 ? (cells[segmentIdx] || null) : null;
      const period_2026 = cells[y2026] || null;
      const period_2027 = y2027 >= 0 ? (cells[y2027] || null) : null;
      const iso = multiRangePeriod(period_2026) ? null : parseHuntingPeriod(period_2026);
      const species_key = classifySpeciesKey(segment, pageSpecies);
      rowsOut.push({
        heading,
        zoneCell,
        tokens,
        weapon_class: heading,
        species: publishedSpeciesName(pageSpecies, lang),
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
    const rest = html.slice(start);
    const nextH = rest.search(/<h[1-3]\b/i);
    const nextFrame = rest.search(/<!-- Tous les autres frames -->|class="frame frame-/i);
    const cuts = [nextH, nextFrame].filter(n => n >= 0);
    const endRel = cuts.length ? Math.min(...cuts) : Math.min(rest.length, 4000);
    const chunk = rest.slice(0, endRel);
    const paras = [...chunk.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
      .map(m => text(m[2]))
      .filter(t => t && t.length > 20);
    return { heading: text(h[i][1]), paras, text: paras.join(' ') };
  }
  return { heading: null, paras: [], text: '' };
}

function isChromePara(t) {
  return /8:30 a\.m\.|8 h 30|renseignements\.faune|1-877-346|1 877 346|All 2026-2028 new hunting rules|Toutes les règles de chasse 2026/i.test(t);
}

function multiRangePeriod(period) {
  const s = String(period || '');
  const tos = (s.match(/\bto\b|\bau\b/gi) || []).length;
  return tos >= 2;
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

function bearBagNotice(html, lang) {
  const sec = extractSectionByHeading(html, lang === 'fr'
    ? /limites de prise.*ours/i
    : /bag limits for black bear/i);
  return {
    kind: 'bear_bag',
    draw_required: false,
    text: sec.text || null,
    paras: sec.paras,
  };
}

function bearBaitNotice(html, lang) {
  const sec = extractSectionByHeading(html, lang === 'fr'
    ? /p[eé]riodes d['’]app[aâ]tage/i
    : /black bear baiting periods/i);
  const paras = (sec.paras || []).filter(t => !isChromePara(t));
  return {
    kind: 'bear_bait',
    draw_required: false,
    text: paras.join(' ') || null,
    paras,
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
    if (/zone-07|chasse-07|hunting-map-zone-07/i.test(href) || /^Zone 7\b/i.test(label)) pdfs['7'] = { href, label };
    if (/zone-08|chasse-08|hunting-map-zone-08/i.test(href) || /^Zone 8\b/i.test(label)) pdfs['8'] = { href, label };
    if (/zone-04|chasse-04|hunting-map-zone-04|zone-chasse-04/i.test(href) || /^Zone 4\b/i.test(label)) pdfs['4'] = { href, label };
    if (/05-06|chasse-05-06/i.test(href) || /Zones 5 and 6|Zones 5 et 6/i.test(label)) pdfs['5-6'] = { href, label };
    if (/zone-14|chasse-14|hunting-map-zone-14|zone-chasse-14/i.test(href) || /^Zone 14\b/i.test(label)) pdfs['14'] = { href, label };
    if (/zone-15|chasse-15|hunting-map-zone-15|zone-chasse-15/i.test(href) || /^Zone 15\b/i.test(label)) pdfs['15'] = { href, label };
    if (/16-17|hunting-map-zone-16-17|zone-chasse-16-17/i.test(href) || /Zones 16 and 17|Zones 16 et 17/i.test(label)) pdfs['16-17'] = { href, label };
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
  if (n === '12' || n === '13') return maps[lang].pdfs['12-13'] || null;
  if (n === '7') return maps[lang].pdfs['7'] || null;
  if (n === '8') return maps[lang].pdfs['8'] || null;
  if (n === '4') return maps[lang].pdfs['4'] || null;
  if (n === '5' || n === '6') return maps[lang].pdfs['5-6'] || null;
  if (n === '14') return maps[lang].pdfs['14'] || null;
  if (n === '15') return maps[lang].pdfs['15'] || null;
  if (n === '16') return maps[lang].pdfs['16-17'] || null;
  return null;
}

function joinSpecies(parts, lang) {
  if (!parts.length) return lang === 'fr' ? 'gibier' : 'game';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return lang === 'fr' ? `${parts[0]} et ${parts[1]}` : `${parts[0]} and ${parts[1]}`;
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(', ');
  return lang === 'fr' ? `${head} et ${last}` : `${head} and ${last}`;
}

function titleFor(zoneId, lang, { bear = false, deer = true, moose = true } = {}) {
  const label = zoneLabel(zoneId, lang);
  const parts = lang === 'fr'
    ? [
      deer ? 'cerf de Virginie' : null,
      moose ? 'orignal' : null,
      bear ? 'ours noir' : null,
    ].filter(Boolean)
    : [
      deer ? 'white-tailed deer' : null,
      moose ? 'moose' : null,
      bear ? 'black bear' : null,
    ].filter(Boolean);
  const species = joinSpecies(parts, lang);
  return lang === 'fr'
    ? `Zone de chasse ${label} du Québec — ${species} (période 2026)`
    : `Québec hunting zone ${label} — ${species} (2026 season)`;
}

function zoneLabel(zoneId, lang) {
  const m = String(zoneId).match(/^(\d+)([EWNS]{0,2})$/);
  if (!m) return zoneId;
  const dir = m[2] || '';
  if (!dir) return m[1];
  const labels = {
    en: { E: 'East', W: 'West', N: 'North', S: 'South', SW: 'Southwest' },
    fr: { E: 'est', W: 'ouest', N: 'nord', S: 'sud', SW: 'sud-ouest' },
  };
  const d = (labels[lang] || labels.en)[dir];
  return d ? `${m[1]} ${d}` : zoneId;
}

function unpublishedParts(zoneId) {
  const n = String(zoneId).replace(/[A-Z]+$/i, '');
  if (n === '7') return ['7E', '7W'];
  if (n === '8') return ['8W'];
  if (n === '13') return ['13E', '13W'];
  if (n === '5') return ['5N', '5S'];
  if (n === '6') return ['6E', '6W'];
  if (n === '15') return ['15N', '15S'];
  return [];
}

function sliceNote(zoneId) {
  const n = String(zoneId).replace(/[A-Z]+$/i, '');
  if (n === '7') {
    return 'Moose table lists undivided 7 (bow/crossbow only; no firearms moose row). Deer table lists 7 North and 7 South. 7 East/West are not on the page.';
  }
  if (n === '8') {
    return 'Moose table lists undivided 8 (bow/crossbow only; no firearms moose row). Deer table lists 8 East, 8 North, 8 South. 8 West is not on the page.';
  }
  if (n === '13') {
    return 'Moose table lists undivided 13. Deer table lists 13 Southwest only (no 13 East/West). 2026 is a restrictive year for moose without antlers except bow/crossbow.';
  }
  if (n === '4') {
    return 'Deer, moose, and bear tables list undivided 4. 4 East/West/North/South are not on the page.';
  }
  if (n === '5') {
    return 'Moose and bear tables list undivided 5. Deer table lists 5 East and 5 West. 5 North/South are not on the page.';
  }
  if (n === '6') {
    return 'Moose and bear tables list undivided 6. Deer table lists 6 North and 6 South. 6 East/West are not on the page.';
  }
  if (n === '14') {
    return 'Moose and bear tables list undivided 14. White-tailed deer has no 2026 table row for this zone (not invented). 14 East/West/North/South are not on the page.';
  }
  if (n === '15') {
    return 'Moose and bear tables list undivided 15. Deer table lists 15 East and 15 West. 15 North/South are not on the page.';
  }
  if (n === '16') {
    return 'Moose and bear tables list undivided 16. White-tailed deer has no 2026 table row for this zone (not invented). 16 East/West/North/South are not on the page.';
  }
  return '';
}

function bearSliceNote(zoneId, hasBear) {
  if (!hasBear) {
    return 'Black bear: skipped — this key is not on the Québec.ca 2026 black-bear table; no bear rows invented.';
  }
  const n = String(zoneId).replace(/[A-Z]+$/i, '');
  const listed = String(zoneId) === n ? n : `${n} or ${zoneId}`;
  return `Black bear: 2026 column harvested where the table lists ${listed}. Undivided ${n} applies to this QC-H-* key.`;
}

function deerSliceNote(zoneId, hasDeer) {
  if (hasDeer) return '';
  return 'White-tailed deer: skipped — this key is not on the Québec.ca 2026 deer table; no deer rows invented.';
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
  const hasBear = speciesEn.includes('black-bear') && speciesFr.includes('black-bear');
  const has2026 = enZ.every(r => r.period_2026) && frZ.every(r => r.period_2026);
  const weaponsNotCollapsed = weaponsEn.length === new Set(weaponsEn.map(w => w.toLowerCase().replace(/seasons?$/, '').trim())).size;
  const extra = [sliceNote(zoneId), deerSliceNote(zoneId, hasDeer), bearSliceNote(zoneId, hasBear)].filter(Boolean).join(' ');
  const hasCoreSpecies = hasMoose || hasDeer;
  let complete = listed > 0 && harvested >= listed && harvestedFr >= listedFr
    && hasCoreSpecies && has2026 && weaponsEn.length > 0 && weaponsFr.length > 0;
  // Honest: never invert listed vs harvested.
  if (harvested < listed || harvestedFr < listedFr) complete = false;
  const sliceBits = [];
  if (hasDeer) sliceBits.push('white-tailed deer');
  if (hasMoose) sliceBits.push('moose');
  if (hasBear) sliceBits.push('black bear');
  const sliceSpecies = sliceBits.join(' + ') || 'no published big-game rows';
  const note = complete
    ? `Québec hunting zone ${zoneId}: ${sliceSpecies}, 2026 season column, weapon classes kept as published headings. Not all 28 hunting zones. Not small game. Not Ontario hunting. Not GIS.${extra ? ` ${extra}` : ''}`
    : `Québec hunting zone ${zoneId}: harvest incomplete for the stated ${sliceSpecies} 2026 slice (EN ${harvested}/${listed}, FR ${harvestedFr}/${listedFr}; deer=${hasDeer} moose=${hasMoose} bear=${hasBear}).${extra ? ` ${extra}` : ''}`;
  const skippedParts = unpublishedParts(zoneId);
  const notHarvested = ['small game', 'wild turkey'];
  if (!hasDeer) notHarvested.unshift('white-tailed deer');
  if (!hasBear) notHarvested.unshift('black bear');
  return {
    slice: `QC hunting zone ${zoneId}; ${sliceSpecies}; 2026 season column`,
    species_listed: (hasDeer ? 1 : 0) + (hasMoose ? 1 : 0) + (hasBear ? 1 : 0),
    species_harvested: (hasDeer ? 1 : 0) + (hasMoose ? 1 : 0) + (hasBear ? 1 : 0),
    species_not_harvested: notHarvested,
    unpublished_parts: skippedParts,
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

function noticesForZone(zoneId, drawEn, drawFr, bagEn, bagFr, bearNotices = { en: [], fr: [] }) {
  const n = String(zoneId).replace(/[A-Z]+$/i, '');
  if (n === '13') {
    const enAlt = (drawEn.related || []).find(t => /zones 13, 18 and 28/i.test(t));
    const frAlt = (drawFr.related || []).find(t => /zones 13, 18 et 28/i.test(t));
    if (!enAlt || !frAlt) {
      throw new Error('zone 13 alternating-year moose notice missing from Québec.ca HTML');
    }
    const restEn = [drawEn.text, ...(drawEn.related || [])].filter(t => t && t !== enAlt);
    const restFr = [drawFr.text, ...(drawFr.related || [])].filter(t => t && t !== frAlt);
    return {
      en: [
        {
          kind: 'moose_alternating_year',
          draw_required: false,
          flag: false,
          applies_to: 'moose_without_antlers',
          year: 2026,
          text: enAlt,
          related: restEn,
        },
        { ...bagEn },
        ...bearNotices.en,
      ],
      fr: [
        {
          kind: 'moose_alternating_year',
          draw_required: false,
          flag: false,
          applies_to: 'moose_without_antlers',
          year: 2026,
          text: frAlt,
          related: restFr,
        },
        { ...bagFr },
        ...bearNotices.fr,
      ],
    };
  }
  return {
    en: [{ ...drawEn, flag: true }, { ...bagEn }, ...bearNotices.en],
    fr: [{ ...drawFr, flag: true }, { ...bagFr }, ...bearNotices.fr],
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
const hubFr = await loadPage('seasons-hub-fr', HUBS.seasons_fr);
URLS.bear.fr = discoverFrSeasonsUrl(hubFr, { mustMatch: /\/ours/i });
console.log(`harvest-hunting-qc: discovered FR black-bear seasons ${URLS.bear.fr}`);

const pages = {
  moose_en: await loadPage('moose-en', URLS.moose.en),
  moose_fr: await loadPage('moose-fr', URLS.moose.fr),
  deer_en: await loadPage('deer-en', URLS.deer.en),
  deer_fr: await loadPage('deer-fr', URLS.deer.fr),
  deer_game_en: await loadPage('deer-game-en', URLS.deer_game.en),
  deer_game_fr: await loadPage('deer-game-fr', URLS.deer_game.fr),
  maps_en: await loadPage('maps-en', URLS.maps.en),
  maps_fr: await loadPage('maps-fr', URLS.maps.fr),
  bear_en: await loadPage('bear-en', URLS.bear.en),
  bear_fr: await loadPage('bear-fr', URLS.bear.fr),
};

URLS.bear_game.en = discoverGameUrl(pages.bear_en, 'en');
URLS.bear_game.fr = discoverGameUrl(pages.bear_fr, 'fr');
pages.bear_game_en = await loadPage('bear-game-en', URLS.bear_game.en);
pages.bear_game_fr = await loadPage('bear-game-fr', URLS.bear_game.fr);

const mooseEn = parseSeasonTables(pages.moose_en, { pageSpecies: 'moose', lang: 'en' });
const mooseFr = parseSeasonTables(pages.moose_fr, { pageSpecies: 'moose', lang: 'fr' });
const deerEn = parseSeasonTables(pages.deer_en, { pageSpecies: 'white-tailed-deer', lang: 'en' });
const deerFr = parseSeasonTables(pages.deer_fr, { pageSpecies: 'white-tailed-deer', lang: 'fr' });
const bearEnAll = parseSeasonTables(pages.bear_en, { pageSpecies: 'black-bear', lang: 'en' });
const bearFrAll = parseSeasonTables(pages.bear_fr, { pageSpecies: 'black-bear', lang: 'fr' });
const allEn = mooseEn.concat(deerEn, bearEnAll);
const allFr = mooseFr.concat(deerFr, bearFrAll);

if (mooseEn.length === 0 || deerEn.length === 0) {
  console.error('harvest-hunting-qc: no season rows parsed — quebec.ca layout changed');
  process.exit(1);
}
if (bearEnAll.length === 0 || bearFrAll.length === 0) {
  console.error('harvest-hunting-qc: no black-bear season rows parsed — quebec.ca layout changed');
  process.exit(1);
}

const drawEn = drawNoticeFromMoose(pages.moose_en, 'en');
const drawFr = drawNoticeFromMoose(pages.moose_fr, 'fr');
const bagEn = deerBagNotice(pages.deer_game_en, 'en');
const bagFr = deerBagNotice(pages.deer_game_fr, 'fr');
const bearBagEn = bearBagNotice(pages.bear_game_en, 'en');
const bearBagFr = bearBagNotice(pages.bear_game_fr, 'fr');
const bearBaitEn = bearBaitNotice(pages.bear_game_en, 'en');
const bearBaitFr = bearBaitNotice(pages.bear_game_fr, 'fr');
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
if (!bearBagEn.text || !/2 black bears per year/i.test(bearBagEn.text)) {
  console.error('harvest-hunting-qc: black-bear bag notice missing from EN game page');
  process.exit(1);
}
if (!bearBagFr.text || !/2\s*ours noirs par année/i.test(bearBagFr.text)) {
  console.error('harvest-hunting-qc: black-bear bag notice missing from FR game page');
  process.exit(1);
}
if (!bearBaitEn.text || !/bait for black bear/i.test(bearBaitEn.text)) {
  console.error('harvest-hunting-qc: black-bear bait notice missing from EN game page');
  process.exit(1);
}
if (!bearBaitFr.text || !/appâter l’ours|appater l'ours|appâter l'ours/i.test(bearBaitFr.text)) {
  console.error('harvest-hunting-qc: black-bear bait notice missing from FR game page');
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
const bearGot = [];
const bearSkipped = [];
const deerSkipped = [];
const wrote = [];
const skippedLive = [];
for (const zoneId of ZONES) {
  if (/^12$/.test(zoneId) === false && !/^(9|10|11)[EW]$/.test(zoneId) && zoneId !== '12') {
    // still allow explicit ids; refuse Ontario WMU 12
  }
  if (zoneId === 'ON-12' || zoneId === '12A' && false) continue;

  const slug = `qc-h-${zoneId.toLowerCase()}`;
  const zone_key = `QC-H-${zoneId}`;
  const outPath = join(outDir, `${slug}.json`);
  if (LIVE_EXISTING_KEYS.has(zoneId) && existsSync(outPath) && !rewriteExisting) {
    console.log(`${zone_key}: left existing live file unchanged`);
    skippedLive.push(zone_key);
    continue;
  }

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

  const n = zoneId.replace(/[A-Z]+$/i, '');
  const pdfEn = pdfForZone(maps, zoneId, 'en');
  const pdfFr = pdfForZone(maps, zoneId, 'fr');

  const bearEn = enRows.filter(r => r.species_key === 'black-bear');
  const bearFr = frRows.filter(r => r.species_key === 'black-bear');
  const includeBear = bearEn.length > 0 && bearFr.length > 0;
  if (includeBear) bearGot.push(`QC-H-${zoneId}`);
  else bearSkipped.push(`QC-H-${zoneId}`);
  const deerEn = enRows.filter(r => r.species_key === 'white-tailed-deer');
  const deerFr = frRows.filter(r => r.species_key === 'white-tailed-deer');
  const includeDeer = deerEn.length > 0 && deerFr.length > 0;
  if (!includeDeer) deerSkipped.push(`QC-H-${zoneId}`);
  const mooseEnZ = enRows.filter(r => r.species_key === 'moose');
  const mooseFrZ = frRows.filter(r => r.species_key === 'moose');
  const includeMoose = mooseEnZ.length > 0 && mooseFrZ.length > 0;

  const bearNotices = includeBear
    ? { en: [{ ...bearBagEn }, { ...bearBaitEn }], fr: [{ ...bearBagFr }, { ...bearBaitFr }] }
    : { en: [], fr: [] };
  const { en: noticesEn, fr: noticesFr } = noticesForZone(zoneId, drawEn, drawFr, bagEn, bagFr, bearNotices);

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
      bear: URLS.bear,
      bear_bag: URLS.bear_game,
      maps: URLS.maps,
      fetched_at,
      note: 'Season text reproduced verbatim from Québec.ca HTML tables (2026 column). Weapon class is the published section heading. Black bear and white-tailed deer rows added only where the official table lists this key. Maps are cited as links only — not OCR’d, not scraped from Forêt ouverte.',
    },
    maps: {
      foret_ouverte: maps.en.foret_ouverte,
      pdf_en: pdfEn,
      pdf_fr: pdfFr,
      index_en: URLS.maps.en,
      index_fr: URLS.maps.fr,
    },
    coverage,
    title: {
      en: titleFor(zoneId, 'en', { bear: includeBear, deer: includeDeer, moose: includeMoose }),
      fr: titleFor(zoneId, 'fr', { bear: includeBear, deer: includeDeer, moose: includeMoose }),
    },
    notices: { en: noticesEn, fr: noticesFr },
    seasons: {
      en: enRows.map(toSeasonRow),
      fr: frRows.map(toSeasonRow),
    },
  };

  writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
  wrote.push(zone_key);
  console.log(`${zone_key}: deer=${includeDeer ? deerEn.length : 'SKIPPED'} moose=${includeMoose ? mooseEnZ.length : 'SKIPPED'} bear=${includeBear ? `${bearEn.length}/${bearFr.length}` : 'SKIPPED'} EN ${enRows.length} FR ${frRows.length} weapons EN ${coverage.weapon_classes_listed} complete=${coverage.complete} unpublished=${(coverage.unpublished_parts || []).join(',') || 'none'} -> ${outPath}`);
}

console.log(`HARVESTED KEYS: ${wrote.join(', ') || '(none)'}`);
console.log(`LIVE KEYS LEFT UNCHANGED: ${skippedLive.join(', ') || '(none)'}`);
console.log(`BEAR HARVESTED: ${bearGot.join(', ') || '(none)'}`);
console.log(`BEAR SKIPPED (not on table): ${bearSkipped.join(', ') || '(none)'}`);
console.log(`DEER SKIPPED (not on table): ${deerSkipped.join(', ') || '(none)'}`);

if (fatal) {
  console.error(`harvest-hunting-qc: ${fatal} zone(s) failed`);
  process.exitCode = 1;
  return { fatal, bearGot, bearSkipped, deerSkipped, wrote, skippedLive };
}
return { fatal: 0, zones: ZONES, bearGot, bearSkipped, deerSkipped, wrote, skippedLive };
}

if (isMain) await harvestHuntingQc();
