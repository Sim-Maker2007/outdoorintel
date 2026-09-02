#!/usr/bin/env node
/**
 * Ontario fishing-regulations harvest v1 (docs/ONTARIO_FISHING_HARVEST_V1.md).
 *
 * Fetches Ontario.ca FMZ HTML (never the 25 MB PDF) in EN and FR, parses
 * h2/h3 Season/Limits blocks, and writes data/regulations/on-fmz-{N}.json.
 * Does not write or rewrite Québec zone-*.json.
 *
 * Usage: node scripts/regs/harvest-ontario.mjs [--zones=12,16,17,18] [--html-dir=DIR]
 * Inland slice (this PR): --zones=10,11,15. Default still 12,16,17,18 so a
 * bare run does not rewrite already-shipped FMZ files.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.cwd();
const UA = 'OutdoorIntel-RegHarvester/1.0 (outdoorintel.ca; regulation transparency tool)';
const CRAWL_DELAY_MS = 1000;
const DEFAULT_ZONES = ['12', '16', '17', '18'];
const LICENCE_YEAR = 2026;
const AUTHORITY = 'Ontario Ministry of Natural Resources (MNR); Ontario Fishing Regulations Summary 2026 (not the official law)';
const PDF_EN = 'https://ontario.ca/files/2025-12/mnr-2026-fishing-regulations-summary-en-2025-12-08.pdf';
const PDF_FR = 'https://ontario.ca/files/2025-12/mnr-2026-fishing-regulations-summary-fr-2025-12-08.pdf';

const zonesArg = (process.argv.find(a => a.startsWith('--zones=')) || `--zones=${DEFAULT_ZONES.join(',')}`).replace('--zones=', '');
const ZONES = zonesArg.split(',').map(s => s.trim()).filter(Boolean);
const htmlDirArg = (process.argv.find(a => a.startsWith('--html-dir=')) || '').replace('--html-dir=', '');

const EN_URL = n => `https://www.ontario.ca/document/ontario-fishing-regulations-summary/fisheries-management-zone-${n}`;
const FR_URL = n => `https://www.ontario.ca/fr/document/resume-des-reglements-de-la-peche/zone-de-gestion-des-peches-${n}`;
const FR_HUB = 'https://www.ontario.ca/fr/document/resume-des-reglements-de-la-peche';

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
  s = decode(s).replace(/\s+/g, ' ').trim();
  // ontario.ca wraps S/C in <abbr>; never collapse licence classes, but keep S-n / C-n glued.
  return s.replace(/\b([SC])\s*-\s*(\d+)\b/g, '$1-$2');
}

// Drupal pager/TOC crumbs ontario.ca appends after the last FMZ section.
// EN: "Table of contents access the table of contents" / Previous / Next
// FR: "Table des matières accéder à la table des matières" / Précédent / Suivant
const DRUPAL_NAV_TOKEN = String.raw`(?:table of contents(?:\s+access the table of contents)?|table des mati[eè]res(?:\s+acc[eé]der [àa] la table des mati[eè]res)?|previous|next|pr[eé]c[eé]dent|suivant)`;
const DRUPAL_NAV_CRUMB_RE = new RegExp(`^${DRUPAL_NAV_TOKEN}$`, 'i');
const DRUPAL_NAV_TAIL_RE = new RegExp(`(?:\\s*\\|\\s*${DRUPAL_NAV_TOKEN})+\\s*$`, 'i');

export function isDrupalNavCrumb(s) {
  return DRUPAL_NAV_CRUMB_RE.test(String(s).trim());
}

export function dropDrupalNavFragments(items) {
  const out = [];
  for (const item of items) {
    for (const part of String(item).split(/\s*\|\s*/)) {
      const t = part.trim();
      if (t && !isDrupalNavCrumb(t)) out.push(t);
    }
  }
  return out;
}

export function stripDrupalNavTail(s) {
  if (s == null || s === '') return s;
  const stripped = String(s).replace(DRUPAL_NAV_TAIL_RE, '').trim();
  return dropDrupalNavFragments([stripped]).join(' | ');
}

function classifyH2(title) {
  const t = title.toLowerCase();
  if (/on this page|dans cette page|sign-in|table des mati[eè]res|contents/.test(t)) return null;
  if (/general information|renseignements g[eé]n[eé]raux/.test(t)) return 'general_information';
  if (/zone-wide seasons|saisons et limites visant toute la zone/.test(t)) return 'zone_wide';
  if (/species exceptions|exceptions visant des esp[eè]ces/.test(t)) return 'species_exceptions';
  if (/waterbody exceptions|exceptions visant des plans d/.test(t)) return 'waterbody_exceptions';
  if (/fish sanctuaries|r[eé]serves.*poissons|sanctuaires/.test(t)) return 'fish_sanctuaries';
  if (/bait restriction|restrictions.*app[aâ]t/.test(t)) return 'bait_restrictions';
  return null;
}

function h2Sections(html) {
  const re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const matches = [...html.matchAll(re)];
  const sections = {};
  for (let i = 0; i < matches.length; i++) {
    const title = text(matches[i][1]);
    const key = classifyH2(title);
    if (!key) continue;
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
    sections[key] = { title, html: html.slice(start, end) };
  }
  return sections;
}

function h3Blocks(sectionHtml) {
  const re = /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi;
  const matches = [...sectionHtml.matchAll(re)];
  const blocks = [];
  for (let i = 0; i < matches.length; i++) {
    const title = text(matches[i][1]);
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : sectionHtml.length;
    blocks.push({ title, html: sectionHtml.slice(start, end) });
  }
  return blocks;
}

function extractLength(limit) {
  if (!limit) return null;
  const m = String(limit).match(
    /(?:must be (?:greater|less) than \d+ centimetres(?: from [^,;]+)?|doit mesurer (?:plus|moins) de \d+ centimètres(?: du [^,;]+)?)/i
  );
  return m ? m[0].trim() : null;
}

function parseSeasonLimits(blockHtml) {
  const t = text(blockHtml);
  const seasonM = t.match(/(?:Season|Saison)\s*:\s*(.*?)(?=\s(?:Limits|Limites)\s*:|$)/i);
  const limitsM = t.match(/(?:Limits|Limites)\s*:\s*(.*)$/i);
  const period = seasonM ? seasonM[1].trim() : null;
  const limit = limitsM ? limitsM[1].trim() : null;
  return { period: period || null, limit: limit || null, length: extractLength(limit), raw: stripDrupalNavTail(t) || null };
}

function topLevelLis(html) {
  const ul = html.match(/<ul\b[^>]*>([\s\S]*)<\/ul>/i);
  const body = ul ? ul[1] : html;
  const lis = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(body))) {
    const inner = m[1].replace(/<ul[\s\S]*$/i, '');
    const t = text(inner);
    for (const part of dropDrupalNavFragments(t ? [t] : [])) {
      if (!seen.has(part)) {
        seen.add(part);
        lis.push(part);
      }
    }
  }
  return lis;
}

function liInners(html) {
  const s = String(html);
  const inners = [];
  const openRe = /<li\b[^>]*>/gi;
  let m;
  while ((m = openRe.exec(s))) {
    const start = m.index + m[0].length;
    let depth = 1;
    const tagRe = /<\/?li\b[^>]*>/gi;
    tagRe.lastIndex = start;
    let t;
    let end = s.length;
    while ((t = tagRe.exec(s))) {
      if (/^<\/li/i.test(t[0])) {
        depth--;
        if (depth === 0) { end = t.index; break; }
      } else {
        depth++;
      }
    }
    inners.push(s.slice(start, end));
  }
  return inners;
}

function allLiTexts(html) {
  const out = [];
  const seen = new Set();
  for (const inner of liInners(html)) {
    const own = text(inner.replace(/<(ul|ol)\b[\s\S]*?<\/\1>/gi, ' '));
    if (own && !seen.has(own)) {
      seen.add(own);
      out.push(own);
    }
  }
  return dropDrupalNavFragments(out);
}

/** Find the real FR FMZ slug on the FR hub TOC when the default FR URL 404s. */
export function findFrFmzUrlFromHub(hubHtml, fmz) {
  const n = String(fmz);
  const re = /href="((?:https:\/\/www\.ontario\.ca)?\/fr\/document\/[^"]+)"/gi;
  const hrefs = [];
  let m;
  while ((m = re.exec(hubHtml))) {
    const href = decode(m[1].replace(/&amp;/g, '&'));
    if (new RegExp(`(?:zone-de-gestion-des-peches-|zone-de-gestion[^"]*-)${n}(?:/|$|\\?|#|"|-)`).test(href)
      || new RegExp(`peches-${n}(?:/|$|\\?|#)`).test(href)) {
      hrefs.push(href);
    }
  }
  const prefer = hrefs.find(h => /zone-de-gestion-des-peches/i.test(h));
  const picked = prefer || hrefs[0];
  if (!picked) return null;
  return picked.startsWith('http') ? picked : `https://www.ontario.ca${picked}`;
}

function ruleFromSpeciesBlock(species, blockHtml) {
  const sl = parseSeasonLimits(blockHtml);
  const waters = allLiTexts(blockHtml);
  const h4 = text((blockHtml.match(/<h4\b[^>]*>([\s\S]*?)<\/h4>/i) || [])[1] || '');
  const notesParts = [];
  if (h4) notesParts.push(h4);
  const leftover = waters.filter(w => !/^(Season|Saison|Limits|Limites)\s*:/i.test(w));
  return {
    period: sl.period,
    species,
    limit: sl.limit,
    length: sl.length,
    gear: leftover.find(w => /hook|lure|artificial|hameçon|leurre|barbless|sans ardillon/i.test(w)) || null,
    notes: notesParts.concat(leftover.filter(w => /hook|lure|artificial|hameçon|leurre|barbless/.test(w) === false)).join(' · ') || null,
    raw: sl.raw,
    waters: leftover,
  };
}

function parseZoneWide(section) {
  const listed = h3Blocks(section.html);
  if (listed.length === 0) {
    throw new Error('zone-wide h3 count is 0');
  }
  const rules = listed.map(b => {
    const sl = parseSeasonLimits(b.html);
    return {
      period: sl.period,
      species: b.title,
      limit: sl.limit,
      length: sl.length,
      gear: null,
      notes: null,
      raw: sl.raw,
    };
  });
  return { listed: listed.length, harvested: rules.length, rules };
}

function parseSpeciesExceptions(section) {
  if (!section) return { listed: 0, harvested: 0, rules: [] };
  const blocks = h3Blocks(section.html);
  const rules = blocks.map(b => ruleFromSpeciesBlock(b.title, b.html));
  return { listed: blocks.length, harvested: rules.length, rules };
}

function parseWaterbodyExceptions(section) {
  if (!section) return { listed: 0, harvested: 0, entries: [], skippedFishOnLine: false };
  let skippedFishOnLine = false;
  const chunks = section.html.split(/(?=<p>\s*<strong>)/i);
  const entries = [];
  for (const chunk of chunks) {
    const pm = chunk.match(/<p>\s*<strong>([\s\S]*?)<\/strong>([\s\S]*?)<\/p>/i);
    if (!pm) continue;
    const name = text(pm[1]);
    if (!name) continue;
    const location = text(pm[2]).replace(/^[-–—:]\s*/, '');
    const after = chunk.slice(chunk.indexOf('</p>') + 4);
    const lis = allLiTexts(after.split(/<p>\s*<strong>/i)[0] || after);
    if (!lis.length && /fish on-line|on p[eê]che en ligne/i.test(chunk) && !/walleye|dor[eé]|season|saison|limits|limites|sanctuar/i.test(text(chunk))) {
      skippedFishOnLine = true;
      continue;
    }
    const rules = lis.map(li => parseExceptionLi(li));
    entries.push({
      name,
      location: location || null,
      rules,
      raw: stripDrupalNavTail(text(`${name} ${location} ${lis.join(' | ')}`)),
    });
  }
  const strongCount = [...section.html.matchAll(/<p>\s*<strong>/gi)].length;
  return { listed: strongCount, harvested: entries.length, entries, skippedFishOnLine };
}

function parseExceptionLi(li) {
  const sl = parseSeasonLimits(li);
  if (sl.period || sl.limit) {
    const species = li.replace(/(?:Season|Saison|Limits|Limites)\s*:.*/i, '').replace(/[-–—]\s*$/, '').trim() || null;
    return {
      period: sl.period,
      species,
      limit: sl.limit,
      length: sl.length,
      gear: /hook|lure|artificial|hameçon|leurre/i.test(li) ? li : null,
      notes: null,
      raw: stripDrupalNavTail(li),
    };
  }
  const split = li.match(/^(.*?)\s+[-–—]\s+(.*)$/);
  if (split) {
    const species = split[1].trim();
    const rest = split[2].trim();
    const closed = /closed all year|ferm[ée]e?\s+toute\s+l['’]ann[ée]e/i.test(rest);
    const gear = /hook|lure|artificial|hameçon|leurre|barbless|sans ardillon/i.test(rest) ? rest : null;
    return {
      period: closed ? rest : (/no fishing|p[êe]che interdite|open |ouvert/i.test(rest) ? rest : null),
      species: /fish sanctuary|sanctuaire|r[eé]serve/i.test(species) ? null : species,
      limit: /S-\d|C-\d/.test(rest) ? rest : null,
      length: extractLength(rest),
      gear,
      notes: rest,
      raw: stripDrupalNavTail(li),
    };
  }
  return {
    period: /closed all year|ferm[ée]e?\s+toute/i.test(li) ? li : null,
    species: null,
    limit: /S-\d|C-\d/.test(li) ? li : null,
    length: extractLength(li),
    gear: /hook|lure|artificial|hameçon|leurre/i.test(li) ? li : null,
    notes: li,
    raw: stripDrupalNavTail(li),
  };
}

function parseSanctuaries(section) {
  if (!section) return { listed: 0, harvested: 0, entries: [], skippedFishOnLine: false };
  const blocks = h3Blocks(section.html);
  const entries = blocks.map(b => {
    const waters = allLiTexts(b.html);
    return {
      period: b.title,
      species: null,
      limit: null,
      length: null,
      gear: null,
      notes: null,
      raw: stripDrupalNavTail(text(`${b.title} ${waters.join(' | ')}`)),
      waters,
    };
  });
  return { listed: blocks.length, harvested: entries.length, entries, skippedFishOnLine: false };
}

const BAIT_RE = /\bbait\b|leech|app[aâ]t|sangsue|\bBMZ\b|\bZPMA\b|bait management|gestion des app[aâ]ts/i;

function parseNoticesAndBait(section, leadHtml) {
  const notices = [];
  const bait = [];
  const blobs = [];
  if (leadHtml) blobs.push(leadHtml);
  if (section) blobs.push(section.html);
  for (const html of blobs) {
    for (const t of allLiTexts(html)) {
      if (!t || notices.includes(t)) continue;
      notices.push(t);
      if (BAIT_RE.test(t)) {
        bait.push({
          period: null,
          species: null,
          limit: null,
          length: null,
          gear: null,
          notes: t,
          raw: stripDrupalNavTail(t),
        });
      }
    }
  }
  return { notices, bait, baitListed: bait.length };
}

const EN_MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const FR_MONTHS = { janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12 };

function parseHtmlUpdated(html) {
  const en = html.match(/Updated:\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i);
  if (en) {
    const mo = EN_MONTHS[en[1].toLowerCase()];
    if (mo) return `${en[3]}-${String(mo).padStart(2, '0')}-${String(en[2]).padStart(2, '0')}`;
  }
  const fr = html.match(/Mis [àa] jour\s*:\s*(\d{1,2})\s+([A-Za-zéû]+)\s+(\d{4})/i);
  if (fr) {
    const mo = FR_MONTHS[fr[2].toLowerCase()];
    if (mo) return `${fr[3]}-${String(mo).padStart(2, '0')}-${String(fr[1]).padStart(2, '0')}`;
  }
  return null;
}

function extractFishOnLine(html) {
  const m = html.match(/href="(https?:\/\/[^"]*fishonline[^"]*)"/i);
  return m ? decode(m[1].replace(/&amp;/g, '&')) : null;
}

function extractPdf(html, fallback) {
  const m = html.match(/href="(https?:\/\/[^"]*fishing-regulations-summary[^"]*\.pdf)"/i)
    || html.match(/href="(https?:\/\/[^"]*mnr-2026-fishing-regulations-summary[^"]*\.pdf)"/i);
  return m ? m[1] : fallback;
}

function pageTitle(html) {
  return text((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
}

function parseLangPage(html, { lang, fmz }) {
  const sections = h2Sections(html);
  if (!sections.zone_wide) throw new Error(`${lang} FMZ ${fmz}: zone-wide section not found`);
  const zoneWide = parseZoneWide(sections.zone_wide);
  const speciesEx = parseSpeciesExceptions(sections.species_exceptions);
  let waterEx = { listed: 0, harvested: 0, entries: [], skippedFishOnLine: false };
  let waterFailed = false;
  try {
    waterEx = parseWaterbodyExceptions(sections.waterbody_exceptions);
  } catch (e) {
    waterFailed = true;
    console.warn(`  FMZ ${fmz} ${lang}: waterbody exceptions failed (${e.message})`);
  }
  let sanct = { listed: 0, harvested: 0, entries: [], skippedFishOnLine: false };
  let sanctFailed = false;
  try {
    sanct = parseSanctuaries(sections.fish_sanctuaries);
  } catch (e) {
    sanctFailed = true;
    console.warn(`  FMZ ${fmz} ${lang}: fish sanctuaries failed (${e.message})`);
  }
  const h1Idx = html.search(/<h1\b/i);
  const genIdx = html.search(/<h2\b[^>]*>\s*(General information|Renseignements g[eé]n[eé]raux)/i);
  const leadHtml = h1Idx >= 0 && genIdx > h1Idx ? html.slice(h1Idx, genIdx) : '';
  const nb = parseNoticesAndBait(sections.general_information, leadHtml);
  const baitSection = parseSpeciesExceptions(sections.bait_restrictions);
  const bait = baitSection.rules.length
    ? baitSection.rules
    : nb.bait;
  const baitListed = baitSection.rules.length ? baitSection.listed : (nb.baitListed ?? bait.length);

  return {
    title: pageTitle(html),
    html_updated: parseHtmlUpdated(html),
    fish_on_line: extractFishOnLine(html),
    pdf: extractPdf(html, lang === 'fr' ? PDF_FR : PDF_EN),
    zoneWide,
    speciesEx,
    waterEx,
    waterFailed,
    sanct,
    sanctFailed,
    notices: nb.notices,
    bait,
    baitListed,
    skippedFishOnLine: !!(waterEx.skippedFishOnLine || sanct.skippedFishOnLine),
  };
}

function coverageFrom(en, fr) {
  const rows = [
    ['zone_wide', en.zoneWide, fr.zoneWide],
    ['species_exceptions', en.speciesEx, fr.speciesEx],
    ['waterbody_exceptions', en.waterEx, fr.waterEx],
    ['fish_sanctuaries', en.sanct, fr.sanct],
  ];
  const coverage = {
    licence_year: LICENCE_YEAR,
    skipped_fish_on_line_only: !!(en.skippedFishOnLine || fr.skippedFishOnLine),
  };
  let complete = !coverage.skipped_fish_on_line_only && !en.waterFailed && !fr.waterFailed && !en.sanctFailed && !fr.sanctFailed;
  for (const [name, a, b] of rows) {
    // Counters are the EN page pair (listed vs harvested, never inverted). FR must also meet listed.
    const listed = a.listed || 0;
    const harvested = a.harvested || 0;
    coverage[`${name}_listed`] = listed;
    coverage[`${name}_harvested`] = harvested;
    if (harvested < listed || (b.harvested || 0) < (b.listed || 0)) complete = false;
  }
  const baitListed = en.baitListed ?? en.bait.length;
  const baitHarvested = en.bait.length;
  coverage.bait_restrictions_listed = baitListed;
  coverage.bait_restrictions_harvested = baitHarvested;
  if (baitHarvested < baitListed || (fr.bait.length || 0) < (fr.baitListed ?? fr.bait.length ?? 0)) complete = false;
  coverage.complete = complete;
  coverage.note = complete
    ? 'Zone-wide seasons/limits and listed HTML exceptions/sanctuaries for this FMZ are included. The Ontario Fishing Regulations Summary is not the law; verify with Fish ON-Line. This is not complete Ontario.'
    : 'Some listed exception or sanctuary rows were not harvested, or a Fish ON-Line-only list was skipped. Zone-wide seasons and limits are included. The Summary is not the law; verify with Fish ON-Line. This is not complete Ontario.';
  return coverage;
}

function ensureBoundaryWarning(notices, lang) {
  const hay = notices.join(' ').toLowerCase();
  const ok = lang === 'fr'
    ? /qu[eé]bec/.test(hay) && /ontario/.test(hay)
    : /quebec/.test(hay) && /ontario/.test(hay);
  return ok;
}

function findDrupalNavHits(value, path = '') {
  const hits = [];
  if (typeof value === 'string') {
    if (isDrupalNavCrumb(value) || DRUPAL_NAV_TAIL_RE.test(value)) hits.push(path || '(root)');
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => hits.push(...findDrupalNavHits(item, `${path}[${i}]`)));
    return hits;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      hits.push(...findDrupalNavHits(v, path ? `${path}.${k}` : k));
    }
  }
  return hits;
}

export function parseOntarioPair(enHtml, frHtml, fmz) {
  const en = parseLangPage(enHtml, { lang: 'en', fmz });
  const fr = parseLangPage(frHtml, { lang: 'fr', fmz });
  return { en, fr };
}

async function fetchUrl(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  await sleep(CRAWL_DELAY_MS);
  if (!res.ok) {
    const err = new Error(`${url} -> ${res.status}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }
  return await res.text();
}

async function fetchFrPage(fmz) {
  const defaultUrl = FR_URL(fmz);
  try {
    const html = await fetchUrl(defaultUrl);
    return { url: defaultUrl, html };
  } catch (e) {
    if (e.status !== 404) throw e;
    console.warn(`FMZ ${fmz}: default FR URL 404, probing FR hub TOC for the real slug`);
    const hubHtml = await fetchUrl(FR_HUB);
    const resolved = findFrFmzUrlFromHub(hubHtml, fmz);
    if (!resolved) throw new Error(`FMZ ${fmz}: FR 404 and no matching slug on ${FR_HUB}`);
    const html = await fetchUrl(resolved);
    return { url: resolved, html };
  }
}

function loadLocal(fmz, lang) {
  const f = join(htmlDirArg, `fmz${fmz}-${lang}.html`);
  return readFileSync(f, 'utf-8');
}

async function harvestOntario() {
mkdirSync(join(REPO, 'data', 'regulations'), { recursive: true });
const fetched_at = new Date().toISOString().slice(0, 10);

let fatal = 0;
for (const zone of ZONES) {
  const fmz = Number(zone);
  const enUrl = EN_URL(fmz);
  const frUrl = FR_URL(fmz);
  let enHtml, frHtml;
  let resolvedFrUrl = frUrl;
  try {
    if (htmlDirArg) {
      enHtml = loadLocal(fmz, 'en');
      frHtml = loadLocal(fmz, 'fr');
    } else {
      enHtml = await fetchUrl(enUrl);
      const frPage = await fetchFrPage(fmz);
      frHtml = frPage.html;
      resolvedFrUrl = frPage.url;
    }
  } catch (e) {
    console.error(`FMZ ${fmz}: fetch failed (${e.message}) — skipping (will not ship junk)`);
    fatal++;
    continue;
  }

  let en, fr;
  try {
    ({ en, fr } = parseOntarioPair(enHtml, frHtml, fmz));
  } catch (e) {
    console.error(`FMZ ${fmz}: parse failed (${e.message}) — skipping (HTML too different to parse honestly)`);
    fatal++;
    continue;
  }

  const coverage = coverageFrom(en, fr);
  if (fmz === 16) {
    const hay = JSON.stringify(en.waterEx.entries).toLowerCase();
    if (en.waterEx.harvested === 0 || !/simcoe/.test(hay) || !/couchiching/.test(hay)) {
      coverage.complete = false;
      coverage.note = 'FMZ 16 zone-wide seasons and limits are included. Exception/sanctuary lists were incomplete in this harvest (Lake Simcoe / Couchiching must not be treated as absent). The Summary is not the law; verify with Fish ON-Line. This is not complete Ontario.';
      console.warn(`FMZ 16: Simcoe/Couchiching exceptions incomplete — shipping zone-wide with complete:false (not dropping the FMZ)`);
    }
  }

  if (!ensureBoundaryWarning(en.notices, 'en') && fmz === 12) {
    console.warn('FMZ 12 EN: Ottawa River ON–QC boundary warning not found in notices');
  }
  if (!ensureBoundaryWarning(fr.notices, 'fr') && fmz === 12) {
    console.warn('FMZ 12 FR: Ottawa River ON–QC boundary warning not found in notices');
  }

  if (fmz === 15) {
    const hay = JSON.stringify(en.waterEx.entries).toLowerCase();
    const baitHay = JSON.stringify(en.bait).toLowerCase();
    const hasPark = /algonquin/.test(hay);
    const citesBait = /algonquin/.test(hay + baitHay) && /live fish may not be used as bait|baitfish traps/.test(hay);
    if (!hasPark || !citesBait) {
      coverage.complete = false;
      coverage.note = 'FMZ 15 zone-wide seasons and limits are included. Algonquin Park bait/park overlay was not harvested honestly from the official HTML — not inventing park-only rules. The Summary is not the law; verify with the official FMZ page and Fish ON-Line. This is not complete Ontario.';
      console.warn('FMZ 15: Algonquin Park overlay missing from waterbody exceptions — not inventing park-only rules');
    } else {
      coverage.note = `${coverage.note} Algonquin Park bait and gear overlay is cited from this FMZ’s official HTML waterbody exceptions (not invented park-only rules). Official page: ${enUrl}`;
    }
  }

  const titleEn = en.title && /FMZ|Ontario|Fisheries Management Zone/i.test(en.title)
    ? `${en.title.replace(/\s*\|\s*.*$/, '')} — Ontario FMZ ${fmz}`
    : `Fisheries Management Zone ${fmz} (FMZ ${fmz}) — Ontario Fishing Regulations Summary ${LICENCE_YEAR}`;
  const titleFr = fr.title && /ZGP|Ontario|Zone de gestion des p[eê]ches/i.test(fr.title)
    ? `${fr.title.replace(/\s*\|\s*.*$/, '')} — Ontario ZGP ${fmz}`
    : `Zone de gestion des pêches ${fmz} (ZGP ${fmz}) — Résumé des règlements de la pêche de l'Ontario ${LICENCE_YEAR}`;

  const doc = {
    zone_id: fmz,
    zone_key: `ON-${fmz}`,
    activity: 'fishing',
    jurisdiction: 'ON',
    fmz,
    licence_year: LICENCE_YEAR,
    authority: AUTHORITY,
    source: {
      en: enUrl,
      fr: resolvedFrUrl,
      pdf_en: en.pdf || PDF_EN,
      fish_on_line: en.fish_on_line || `https://www.gisapplication.lrc.gov.on.ca/FishONLine/Index.html?site=FishONLine&viewer=FishONLine&locale=en-US&FMZ=${fmz}`,
      fetched_at,
      html_updated: en.html_updated || fr.html_updated,
      note: 'Rule text reproduced verbatim from the Ontario Fishing Regulations Summary HTML (not the PDF). The Summary is not the official law. Always verify with the MNR and Fish ON-Line before fishing. Crown copyright.',
    },
    coverage,
    title: { en: titleEn, fr: titleFr },
    notices: { en: en.notices, fr: fr.notices },
    general: { en: en.zoneWide.rules, fr: fr.zoneWide.rules },
    species_exceptions: { en: en.speciesEx.rules, fr: fr.speciesEx.rules },
    waterbody_exceptions: { en: en.waterEx.entries, fr: fr.waterEx.entries },
    bait_restrictions: { en: en.bait, fr: fr.bait },
    fish_sanctuaries: { en: en.sanct.entries, fr: fr.sanct.entries },
  };

  const navHits = findDrupalNavHits(doc);
  if (navHits.length) {
    console.error(`FMZ ${fmz}: Drupal nav crumbs still present at ${navHits.join(', ')}`);
    fatal++;
    continue;
  }

  const outPath = join(REPO, 'data', 'regulations', `on-fmz-${fmz}.json`);
  writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
  console.log(`FMZ ${fmz}: zone-wide EN ${en.zoneWide.harvested}/${en.zoneWide.listed} FR ${fr.zoneWide.harvested}/${fr.zoneWide.listed}; waterbodies EN ${en.waterEx.harvested}/${en.waterEx.listed}; sanctuaries EN ${en.sanct.harvested}/${en.sanct.listed}; complete=${coverage.complete} -> ${outPath}`);
}

if (fatal) {
  console.error(`harvest-ontario: ${fatal} zone(s) failed`);
  process.exit(1);
}
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  await harvestOntario();
}
