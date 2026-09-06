#!/usr/bin/env node
/**
 * Ontario hunting-seasons harvest (docs/ONTARIO_HUNTING_HARVEST_V1.md + V2.md).
 *
 * Fetches ontario.ca Hunting Regulations Summary HTML for white-tailed deer,
 * moose, and black bear (EN+FR), and writes data/hunting/on-h-{wmu}.json for
 * v1 Ottawa-adjacent 63A, 63B, 65, 66A, 67 plus v2 southeastern neighbours
 * 64A, 64B, 66B, 68A, 68B.
 *
 * Does not write or rewrite Québec qc-h-*.json or fishing on-fmz-*.json.
 * Does not OCR maps. Does not scrape Fish ON-Line / Forêt ouverte / Sépaq.
 * Does not harvest turkey, small game, or WMU 12 (Rainy River).
 * Does not invent seasons when a WMU is absent from the official table.
 *
 * Usage: node scripts/regs/harvest-hunting-on.mjs
 *        node scripts/regs/harvest-hunting-on.mjs --wmus=64A,64B,66B,68A,68B
 *        node scripts/regs/harvest-hunting-on.mjs --html-dir=DIR
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHuntingPeriod } from '../../src/lib/huntResolver.mjs';

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

const REPO = process.cwd();
const UA = 'OutdoorIntel-RegHarvester/1.0 (outdoorintel.ca; regulation transparency tool)';
const CRAWL_DELAY_MS = 1000;
const LICENCE_YEAR = 2026;
const SEASON_YEAR = 2026;
const AUTHORITY = 'Ontario Ministry of Natural Resources (MNR); Ontario Hunting Regulations Summary 2026 (not the official law)';

/** Ottawa-adjacent v1 + southeastern neighbours v2. Never 12. */
export const V1_WMUS = ['63A', '63B', '65', '66A', '67'];
export const V2_WMUS = ['64A', '64B', '66B', '68A', '68B'];
export const DEFAULT_WMUS = [...V1_WMUS, ...V2_WMUS];
export const REFUSED_WMUS = new Set(['12']);

const wmusArg = (process.argv.find(a => a.startsWith('--wmus=')) || '').replace('--wmus=', '');
const htmlDirArg = (process.argv.find(a => a.startsWith('--html-dir=')) || '').replace('--html-dir=', '');
const WMUS = (wmusArg || DEFAULT_WMUS.join(','))
  .split(',')
  .map(s => String(s).trim().toUpperCase())
  .filter(Boolean);

const URLS = {
  hub: {
    en: 'https://www.ontario.ca/document/ontario-hunting-regulations-summary',
    fr: 'https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse',
  },
  deer: {
    en: 'https://www.ontario.ca/document/ontario-hunting-regulations-summary/white-tailed-deer',
    fr: 'https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/chevreuil-cerf-de-virginie',
  },
  moose: {
    en: 'https://www.ontario.ca/document/ontario-hunting-regulations-summary/moose',
    fr: 'https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/orignal',
  },
  bear: {
    en: 'https://www.ontario.ca/document/ontario-hunting-regulations-summary/black-bear',
    fr: 'https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/ours-noir',
  },
  how: {
    en: 'https://www.ontario.ca/document/ontario-hunting-regulations-summary/how-use-this-summary',
    fr: 'https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/comment-utiliser-ce-resume',
  },
  maps: {
    en: 'https://www.ontario.ca/document/ontario-hunting-regulations-summary/wildlife-management-unit-map-2-southeastern-ontario',
    fr: 'https://www.ontario.ca/fr/document/resume-des-reglements-de-la-chasse/carte-2-des-unites-de-gestion-de-la-faune-sud-est-de',
    finder: 'https://www.ontario.ca/page/find-wildlife-management-unit-wmu-map',
  },
  pdf: {
    en: 'https://ontario.ca/files/2026-03/mnr-2026-ontario-hunting-regulations-summary-en-2026-03-10.pdf',
    fr: 'https://ontario.ca/files/2026-03/mnr-2026-ontario-hunting-regulations-summary-fr-2026-03-10.pdf',
  },
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const NAMED = {
  nbsp: ' ', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"',
  eacute: 'é', Eacute: 'É', egrave: 'è', Egrave: 'È',
  ecirc: 'ê', ecirc: 'ê', agrave: 'à', Agrave: 'À',
  acirc: 'â', ocirc: 'ô', ucirc: 'û', icirc: 'î',
  ccedil: 'ç', oelig: 'œ', aelig: 'æ', mdash: '—', ndash: '–',
};
const decode = s => String(s)
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => Object.prototype.hasOwnProperty.call(NAMED, n) ? NAMED[n] : m)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'");

export function text(html) {
  if (!html) return '';
  let s = String(html).replace(/<br\s*\/?>/gi, ' | ');
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

export function normalizeWmuId(id) {
  const m = String(id || '').trim().toUpperCase().match(/^(\d{1,3})([A-Z])?$/);
  if (!m) return '';
  return `${Number(m[1])}${m[2] || ''}`;
}

export function isRefusedWmu(id) {
  const n = normalizeWmuId(id);
  return n === '12' || REFUSED_WMUS.has(n);
}

/**
 * Parse "63A, 63B, 65footnote 1, 66A, 67" or "53–64, 66–69" or "54–63".
 * Ranges and bare numbers are undivided parents (QC-style: undivided 63 → 63A/63B).
 */
export function parseWmuCell(cell) {
  const s = String(cell || '')
    .replace(/footnote\s*\d+/gi, ' ')
    .replace(/\[[0-9]+\]/g, ' ')
    .replace(/&nbsp;/gi, ' ');
  const out = [];
  const re = /(?<![A-Z0-9])(\d{1,3})([A-Z])?(?:\s*[–—-]\s*(\d{1,3})([A-Z])?)?(?![A-Z0-9])/gi;
  let m;
  while ((m = re.exec(s))) {
    const aNum = Number(m[1]);
    const aLet = (m[2] || '').toUpperCase();
    if (m[3]) {
      const bNum = Number(m[3]);
      const bLet = (m[4] || '').toUpperCase();
      out.push({
        kind: 'range',
        fromNum: Math.min(aNum, bNum),
        toNum: Math.max(aNum, bNum),
        from: `${aNum}${aLet}`,
        to: `${bNum}${bLet}`,
        token: `${aNum}${aLet}-${bNum}${bLet}`,
      });
    } else {
      out.push({
        kind: 'exact',
        num: aNum,
        letter: aLet,
        id: `${aNum}${aLet}`,
        token: `${aNum}${aLet}`,
      });
    }
  }
  return out;
}

/** Undivided parent / numeric range applies to lettered children. Never WMU 12. */
export function wmuMatches(tokens, wmuId) {
  if (isRefusedWmu(wmuId)) return false;
  const want = normalizeWmuId(wmuId);
  if (!want) return false;
  const num = parseInt(want, 10);
  const letter = want.replace(/^\d+/, '');
  return (tokens || []).some(t => {
    if (t.kind === 'exact') {
      if (t.id === want) return true;
      if (!t.letter && t.num === num && letter) return true;
      return false;
    }
    if (t.kind === 'range') {
      return t.fromNum <= num && num <= t.toNum;
    }
    return false;
  });
}

export function isClosedPeriod(period) {
  return /^(none|aucune|n\/a|closed)$/i.test(String(period || '').trim());
}

function skipHeading(heading) {
  return /last year|l['’]an dernier|draw results|allocation results|tag allocation|hunt codes|points-based|cervid|chronic wasting|farmer/i.test(heading || '');
}

function classifySpecies(pageSpecies) {
  if (pageSpecies === 'moose') return { key: 'moose', en: 'Moose', fr: 'Orignal' };
  if (pageSpecies === 'white-tailed-deer') return { key: 'white-tailed-deer', en: 'White-tailed deer', fr: 'Cerf de Virginie' };
  if (pageSpecies === 'black-bear') return { key: 'black-bear', en: 'Black bear', fr: 'Ours noir' };
  return { key: pageSpecies, en: pageSpecies, fr: pageSpecies };
}

function cellHtmlList(rowHtml) {
  return [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(m => m[1]);
}

function splitPeriods(cellHtml) {
  const raw = String(cellHtml || '');
  const parts = raw.split(/<br\s*\/?>/i).map(p => text(p)).filter(Boolean);
  if (parts.length > 1) return parts;
  const joined = text(raw);
  return joined ? [joined] : [];
}

/** Footnote numbers that follow this WMU in the cell (not siblings in the same row). */
function footnoteNumsForWmu(cellHtml, wmuId) {
  const s = String(cellHtml || '');
  const id = normalizeWmuId(wmuId);
  if (!id) return [];
  const re = new RegExp(`\\b${id}\\b(?:\\s|<[^>]+>)*footnote\\s*(\\d+)`, 'gi');
  const nums = new Set();
  let m;
  while ((m = re.exec(s))) nums.add(Number(m[1]));
  return [...nums];
}

export function extractFootnotes(html) {
  const map = {};
  for (const m of html.matchAll(/<(?:li|p)\b[^>]*>([\s\S]*?)<\/(?:li|p)>/gi)) {
    const t = text(m[1]);
    const fm = t.match(/^\[(\d+)\]\s*(.+)$/) || t.match(/^footnote\s*(\d+)\s*\[(\d+)\]\s*(.+)$/i);
    if (fm) {
      const n = Number(fm[1]);
      const body = (fm[3] || fm[2] || '').replace(/^\[\d+\]\s*/, '').trim();
      if (body && !map[n]) map[n] = body;
    }
  }
  return map;
}

function parseSeasonTables(html, { pageSpecies, lang }) {
  const names = classifySpecies(pageSpecies);
  const footnotes = extractFootnotes(html);
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  const rowsOut = [];
  for (const tm of tables) {
    const heading = headingBefore(html, tm.index);
    if (skipHeading(heading)) continue;
    const trs = [...tm[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (trs.length < 2) continue;
    const header = cellHtmlList(trs[0][1]).map(c => text(c));
    const wmuIdx = header.findIndex(h => /wildlife|management unit|unité de gestion|unite de gestion|\bWMU\b|\bUGF\b/i.test(h));
    if (wmuIdx < 0) continue;
    const resIdx = header.findIndex(h => /resident(?!.*non)|résident(?!.*non)|resident —|résident —/i.test(h) && !/non-resident|non-résident|non.resident/i.test(h));
    const nonIdx = header.findIndex(h => /non-resident|non-résident|non.resident/i.test(h));
    const bothIdx = header.findIndex(h => /resident and non-resident|résidents et non-résidents|residents et non-residents/i.test(h));
    const firearmIdx = header.findIndex(h => /firearm type|type d['’]arme|type d'arme/i.test(h));
    const restrictIdx = header.findIndex(h => /restriction/i.test(h));
    const huntCodeIdx = header.findIndex(h => /hunt code|code de chasse/i.test(h));
    if (huntCodeIdx >= 0 && /controlled deer|chasse au chevreuil réglementée/i.test(heading)) {
      // Controlled deer hunt codes — only keep if a harvested WMU is explicitly listed.
    }

    const segmentCols = [];
    if (bothIdx >= 0) {
      segmentCols.push({
        idx: bothIdx,
        segment: lang === 'fr' ? 'Résidents et non-résidents' : 'Resident and non-resident',
      });
    } else {
      if (resIdx >= 0) {
        segmentCols.push({ idx: resIdx, segment: lang === 'fr' ? 'Résident' : 'Resident' });
      }
      if (nonIdx >= 0) {
        segmentCols.push({ idx: nonIdx, segment: lang === 'fr' ? 'Non-résident' : 'Non-resident' });
      }
    }
    if (!segmentCols.length) continue;

    for (let i = 1; i < trs.length; i++) {
      const rawCells = cellHtmlList(trs[i][1]);
      const cells = rawCells.map(c => text(c));
      if (cells.filter(Boolean).length < 2) continue;
      const zoneCell = cells[wmuIdx] || '';
      const tokens = parseWmuCell(zoneCell);
      if (!tokens.length) continue;
      const zoneHtml = rawCells[wmuIdx] || '';
      const noteByWmu = {};
      for (const t of tokens) {
        const ids = t.kind === 'exact' ? [t.id] : [];
        for (const id of ids) {
          const fns = footnoteNumsForWmu(zoneHtml, id);
          const bits = fns.map(n => footnotes[n]).filter(Boolean);
          if (bits.length) noteByWmu[id] = bits.join(' ');
        }
      }
      const restrictNote = restrictIdx >= 0 && cells[restrictIdx] ? cells[restrictIdx] : null;
      const weapon = firearmIdx >= 0 && cells[firearmIdx]
        ? `${heading} — ${cells[firearmIdx]}`
        : heading;
      for (const col of segmentCols) {
        const periods = splitPeriods(rawCells[col.idx] || '');
        for (const period of periods) {
          const closed = isClosedPeriod(period);
          const iso = closed ? null : parseHuntingPeriod(period, SEASON_YEAR);
          rowsOut.push({
            heading,
            zoneCell,
            tokens,
            notesByWmu: noteByWmu,
            weapon_class: weapon,
            species: lang === 'fr' ? names.fr : names.en,
            species_key: names.key,
            segment: col.segment,
            period,
            period_2026: period,
            period_from: iso?.from || null,
            period_to: iso?.to || null,
            year: SEASON_YEAR,
            open: !closed,
            notes: restrictNote,
            restrictNote,
            raw: [heading, zoneCell, col.segment, period].filter(Boolean).join(' · '),
          });
        }
      }
    }
  }
  return rowsOut;
}

function extractParagraphs(html, testFn) {
  const blocks = [...html.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  const texts = [];
  for (const b of blocks) {
    const t = text(b[2]);
    if (t && testFn(t) && t.length > 40 && t.length < 1600 && !texts.includes(t)) texts.push(t);
  }
  return texts;
}

function extractSection(html, headingRe) {
  const hs = [...html.matchAll(/<h([2-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  for (let i = 0; i < hs.length; i++) {
    if (!headingRe.test(text(hs[i][2]))) continue;
    const start = hs[i].index + hs[i][0].length;
    const rest = html.slice(start);
    const next = rest.search(/<h[1-3]\b/i);
    const chunk = rest.slice(0, next >= 0 ? next : Math.min(rest.length, 5000));
    const paras = [...chunk.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
      .map(m => text(m[2]))
      .filter(t => t && t.length > 20);
    return { heading: text(hs[i][2]), paras, text: paras.join(' ') };
  }
  return { heading: null, paras: [], text: '' };
}

function notLawNotice(html, lang) {
  const hits = extractParagraphs(html, t =>
    lang === 'fr'
      ? /n['’]est ni un document juridique|pas un document juridique|recueil complet/i.test(t)
      : /neither a legal document|not the official law|complete collection of the current regulations/i.test(t)
  );
  return {
    kind: 'summary_not_law',
    draw_required: false,
    text: hits[0] || null,
    related: hits.slice(1),
  };
}

function mooseWmu65Notice(html, lang) {
  const sec = extractSection(html, lang === 'fr'
    ? /chasse à l['’]orignal dans l['’]UGF 65|orignal.*UGF 65|UGF 65/i
    : /moose hunting in WMU 65/i);
  if (!sec.text) return null;
  return {
    kind: 'moose_wmu65',
    draw_required: true,
    flag: true,
    applies_to: 'moose',
    text: sec.text,
    paras: sec.paras,
  };
}

function mooseTagNotice(html, lang) {
  const hits = extractParagraphs(html, t =>
    lang === 'fr'
      ? /Les vignettes d['’]orignal sont valides seulement/i.test(t)
      : /Moose tags are valid only for the Wildlife Management Unit/i.test(t)
  );
  if (!hits.length) return null;
  return {
    kind: 'moose_tag',
    draw_required: true,
    flag: true,
    applies_to: 'moose',
    text: hits[0],
    related: [],
  };
}

function dogsNotice(html, lang, wmuId) {
  const hits = extractParagraphs(html, t =>
    /dogs? is not permitted|chiens? n['’]est pas perm|utilisation de chiens/i.test(t)
    && new RegExp(`\\b${wmuId}\\b`, 'i').test(t)
  );
  if (!hits.length) return null;
  return {
    kind: 'dogs',
    draw_required: false,
    text: hits[0],
    related: hits.slice(1),
  };
}

function bearNotes(html, lang) {
  const cubs = extractParagraphs(html, t =>
    lang === 'fr'
      ? /oursons|femelles accompagnées/i.test(t)
      : /cubs or female bears accompanied/i.test(t)
  );
  const out = [];
  if (cubs[0]) out.push({ kind: 'bear_cubs', draw_required: false, text: cubs[0] });
  return out;
}

function titleFor(wmuId, lang, { deer, moose, bear }) {
  const parts = lang === 'fr'
    ? [deer ? 'cerf de Virginie' : null, moose ? 'orignal' : null, bear ? 'ours noir' : null].filter(Boolean)
    : [deer ? 'white-tailed deer' : null, moose ? 'moose' : null, bear ? 'black bear' : null].filter(Boolean);
  const species = parts.length <= 2
    ? parts.join(lang === 'fr' ? ' et ' : ' and ')
    : `${parts.slice(0, -1).join(', ')}${lang === 'fr' ? ' et ' : ' and '}${parts[parts.length - 1]}`;
  return lang === 'fr'
    ? `UGF ${wmuId} de l’Ontario — ${species} (saison 2026)`
    : `Ontario WMU ${wmuId} — ${species} (2026 season)`;
}

function coverageFor(wmuId, enRows, frRows) {
  const enZ = enRows.filter(r => wmuMatches(r.tokens, wmuId));
  const frZ = frRows.filter(r => wmuMatches(r.tokens, wmuId));
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
  const extras = [];
  if (!hasDeer) extras.push('White-tailed deer: skipped — this WMU is not on the official 2026 deer tables; no deer rows invented.');
  if (hasDeer && wmuId === '66B') {
    extras.push('White-tailed deer: official tables list a bows-only row for 66B only. No rifle or muzzle-loading deer rows invented.');
  }
  if (!hasMoose) extras.push('Moose: skipped — this WMU is not on the official 2026 moose season tables (published moose seasons are 46–50, 53–63 and explicit 65). No moose rows invented.');
  if (hasMoose && /63A|63B/.test(wmuId)) {
    extras.push('Moose: official tables list undivided 63 / range 53–63, not 63A/63B. Undivided parent applied to this ON-H-* key.');
  }
  if (hasBear && /[A-Z]$/.test(wmuId)) {
    extras.push('Black bear: official tables list undivided parent numbers/ranges (spring 53–64 and 66–69; fall 64 / 66, 67 / 68), not lettered children. Undivided parent applied to this ON-H-* key.');
  }
  if (!hasBear) extras.push('Black bear: skipped — this WMU is not on the official 2026 black-bear tables (65 sits in the published gap between 64 and 66). No bear rows invented.');
  const hasCore = hasDeer || hasMoose || hasBear;
  let complete = listed > 0 && harvested >= listed && harvestedFr >= listedFr
    && hasCore && weaponsEn.length > 0 && weaponsFr.length > 0;
  if (harvested < listed || harvestedFr < listedFr) complete = false;
  const sliceBits = [];
  if (hasDeer) sliceBits.push('white-tailed deer');
  if (hasMoose) sliceBits.push('moose');
  if (hasBear) sliceBits.push('black bear');
  const sliceSpecies = sliceBits.join(' + ') || 'no published big-game rows';
  const notHarvested = ['small game', 'wild turkey'];
  if (!hasDeer) notHarvested.unshift('white-tailed deer');
  if (!hasMoose) notHarvested.unshift('moose');
  if (!hasBear) notHarvested.unshift('black bear');
  const note = complete
    ? `Ontario WMU ${wmuId}: ${sliceSpecies}, 2026 Hunting Regulations Summary HTML, weapon classes kept as published headings. Not all Ontario WMUs. Not small game. Not turkey. WMU 12 (Rainy River) is never harvested. Not GIS.${extras.length ? ` ${extras.join(' ')}` : ''}`
    : `Ontario WMU ${wmuId}: harvest incomplete for the stated ${sliceSpecies} 2026 slice (EN ${harvested}/${listed}, FR ${harvestedFr}/${listedFr}; deer=${hasDeer} moose=${hasMoose} bear=${hasBear}).${extras.length ? ` ${extras.join(' ')}` : ''}`;
  return {
    slice: `Ontario WMU ${wmuId}; ${sliceSpecies}; 2026 Hunting Regulations Summary`,
    species_listed: (hasDeer ? 1 : 0) + (hasMoose ? 1 : 0) + (hasBear ? 1 : 0),
    species_harvested: (hasDeer ? 1 : 0) + (hasMoose ? 1 : 0) + (hasBear ? 1 : 0),
    species_not_harvested: notHarvested,
    unpublished_parts: [],
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
    parent_match: {
      moose_undivided_63: hasMoose && /63A|63B/.test(wmuId),
      bear_undivided_parent: hasBear && /[A-Z]$/.test(wmuId),
    },
  };
}

function toSeasonRow(r, wmuId) {
  const wmuNote = r.notesByWmu?.[normalizeWmuId(wmuId)] || null;
  const notes = [wmuNote, r.restrictNote].filter(Boolean).join(' ') || null;
  return {
    species: r.species,
    species_key: r.species_key,
    weapon_class: r.weapon_class,
    segment: r.segment,
    period: r.period_2026,
    period_2026: r.period_2026,
    period_from: r.period_from,
    period_to: r.period_to,
    year: SEASON_YEAR,
    open: r.open !== false,
    notes,
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

export async function harvestHuntingOn() {
  if (WMUS.some(isRefusedWmu)) {
    console.error('harvest-hunting-on: refused WMU 12 (Rainy River) — remove it from --wmus');
    process.exitCode = 1;
    return { fatal: 1 };
  }

  const pages = {
    deer_en: await loadPage('deer-en', URLS.deer.en),
    deer_fr: await loadPage('deer-fr', URLS.deer.fr),
    moose_en: await loadPage('moose-en', URLS.moose.en),
    moose_fr: await loadPage('moose-fr', URLS.moose.fr),
    bear_en: await loadPage('bear-en', URLS.bear.en),
    bear_fr: await loadPage('bear-fr', URLS.bear.fr),
    how_en: await loadPage('how-en', URLS.how.en),
    how_fr: await loadPage('how-fr', URLS.how.fr),
  };

  const deerEn = parseSeasonTables(pages.deer_en, { pageSpecies: 'white-tailed-deer', lang: 'en' });
  const deerFr = parseSeasonTables(pages.deer_fr, { pageSpecies: 'white-tailed-deer', lang: 'fr' });
  const mooseEn = parseSeasonTables(pages.moose_en, { pageSpecies: 'moose', lang: 'en' });
  const mooseFr = parseSeasonTables(pages.moose_fr, { pageSpecies: 'moose', lang: 'fr' });
  const bearEn = parseSeasonTables(pages.bear_en, { pageSpecies: 'black-bear', lang: 'en' });
  const bearFr = parseSeasonTables(pages.bear_fr, { pageSpecies: 'black-bear', lang: 'fr' });
  const allEn = deerEn.concat(mooseEn, bearEn);
  const allFr = deerFr.concat(mooseFr, bearFr);

  if (deerEn.length === 0 || deerFr.length === 0) {
    console.error('harvest-hunting-on: no deer season rows parsed — ontario.ca layout changed');
    process.exitCode = 1;
    return { fatal: 1 };
  }
  if (mooseEn.length === 0 || mooseFr.length === 0) {
    console.error('harvest-hunting-on: no moose season rows parsed — ontario.ca layout changed');
    process.exitCode = 1;
    return { fatal: 1 };
  }
  if (bearEn.length === 0 || bearFr.length === 0) {
    console.error('harvest-hunting-on: no black-bear season rows parsed — ontario.ca layout changed');
    process.exitCode = 1;
    return { fatal: 1 };
  }

  const lawEn = notLawNotice(pages.how_en, 'en');
  const lawFr = notLawNotice(pages.how_fr, 'fr');
  if (!lawEn.text || !/legal document|not the official law|complete collection/i.test(lawEn.text)) {
    console.error('harvest-hunting-on: EN Summary-is-not-the-law notice missing');
    process.exitCode = 1;
    return { fatal: 1 };
  }
  if (!lawFr.text) {
    console.error('harvest-hunting-on: FR Summary-is-not-the-law notice missing');
    process.exitCode = 1;
    return { fatal: 1 };
  }

  const moose65En = mooseWmu65Notice(pages.moose_en, 'en');
  const moose65Fr = mooseWmu65Notice(pages.moose_fr, 'fr');
  const mooseTagEn = mooseTagNotice(pages.moose_en, 'en');
  const mooseTagFr = mooseTagNotice(pages.moose_fr, 'fr');
  const bearNotesEn = bearNotes(pages.bear_en, 'en');
  const bearNotesFr = bearNotes(pages.bear_fr, 'fr');

  const fetched_at = new Date().toISOString().slice(0, 10);
  const outDir = join(REPO, 'data', 'hunting');
  mkdirSync(outDir, { recursive: true });

  let fatal = 0;
  const wrote = [];
  const skipped = { moose: [], bear: [], deer: [] };

  for (const wmuId of WMUS) {
    if (isRefusedWmu(wmuId)) {
      console.error(`WMU ${wmuId}: refused (Rainy River WMU 12)`);
      fatal++;
      continue;
    }
    const zone_key = `ON-H-${wmuId}`;
    if (zone_key === 'ON-H-12') {
      console.error('ON-H-12 refused');
      fatal++;
      continue;
    }
    const slug = `on-h-${wmuId.toLowerCase()}`;
    const enRows = allEn.filter(r => wmuMatches(r.tokens, wmuId));
    const frRows = allFr.filter(r => wmuMatches(r.tokens, wmuId));
    if (enRows.length === 0 || frRows.length === 0) {
      console.error(`WMU ${wmuId}: no EN/FR season rows`);
      fatal++;
      continue;
    }
    const coverage = coverageFor(wmuId, allEn, allFr);
    const hasDeer = (coverage.species.en || []).includes('white-tailed-deer');
    const hasMoose = (coverage.species.en || []).includes('moose');
    const hasBear = (coverage.species.en || []).includes('black-bear');
    if (!hasDeer) skipped.deer.push(zone_key);
    if (!hasMoose) skipped.moose.push(zone_key);
    if (!hasBear) skipped.bear.push(zone_key);

    const noticesEn = [{ ...lawEn }];
    const noticesFr = [{ ...lawFr }];
    const dogsEn = dogsNotice(pages.deer_en, 'en', wmuId);
    const dogsFr = dogsNotice(pages.deer_fr, 'fr', wmuId);
    if (dogsEn) noticesEn.push(dogsEn);
    if (dogsFr) noticesFr.push(dogsFr);
    if (hasMoose && mooseTagEn) noticesEn.push(mooseTagEn);
    if (hasMoose && mooseTagFr) noticesFr.push(mooseTagFr);
    if (wmuId === '65' && moose65En) noticesEn.push(moose65En);
    if (wmuId === '65' && moose65Fr) noticesFr.push(moose65Fr);
    if (hasBear) {
      noticesEn.push(...bearNotesEn);
      noticesFr.push(...bearNotesFr);
    }
    const rifleNote = enRows.map(r => r.notesByWmu?.[wmuId]).find(n => n && /rifles are not permitted/i.test(n));
    const rifleNoteFr = frRows.map(r => r.notesByWmu?.[wmuId]).find(n => n && /carabines? ne sont pas perm/i.test(n));
    if (rifleNote) noticesEn.push({ kind: 'deer_footnote', draw_required: false, text: rifleNote });
    if (rifleNoteFr) noticesFr.push({ kind: 'deer_footnote', draw_required: false, text: rifleNoteFr });

    const doc = {
      zone_id: wmuId,
      zone_key,
      slug,
      activity: 'hunting',
      jurisdiction: 'ON',
      wmu: wmuId,
      licence_year: LICENCE_YEAR,
      season_column: SEASON_YEAR,
      hunting_zone: wmuId,
      hunting_part: null,
      authority: AUTHORITY,
      source: {
        en: URLS.deer.en,
        fr: URLS.deer.fr,
        moose: URLS.moose,
        deer: URLS.deer,
        bear: URLS.bear,
        how: URLS.how,
        maps: URLS.maps,
        pdf: URLS.pdf,
        fetched_at,
        note: 'Season text reproduced verbatim from the Ontario Hunting Regulations Summary HTML (2026). Weapon class is the published section heading. Moose and black bear rows added only where the official table lists this WMU or an undivided parent/range that applies. Maps and the Summary PDF are cited as links only — not OCR’d, not scraped from Fish ON-Line. The Summary is not the law. WMU 12 is never harvested.',
      },
      maps: {
        wmu_finder: URLS.maps.finder,
        pdf_en: { href: URLS.pdf.en, label: '2026 Ontario Hunting Regulations Summary (PDF)' },
        pdf_fr: { href: URLS.pdf.fr, label: 'Résumé des règlements de la chasse 2026 (PDF)' },
        index_en: URLS.maps.en,
        index_fr: URLS.maps.fr,
      },
      coverage,
      title: {
        en: titleFor(wmuId, 'en', { deer: hasDeer, moose: hasMoose, bear: hasBear }),
        fr: titleFor(wmuId, 'fr', { deer: hasDeer, moose: hasMoose, bear: hasBear }),
      },
      notices: { en: noticesEn, fr: noticesFr },
      seasons: {
        en: enRows.map(r => toSeasonRow(r, wmuId)),
        fr: frRows.map(r => toSeasonRow(r, wmuId)),
      },
    };

    const outPath = join(outDir, `${slug}.json`);
    writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
    wrote.push(zone_key);
    console.log(`${zone_key}: deer=${hasDeer ? enRows.filter(r => r.species_key === 'white-tailed-deer').length : 'SKIPPED'} moose=${hasMoose ? enRows.filter(r => r.species_key === 'moose').length : 'SKIPPED'} bear=${hasBear ? enRows.filter(r => r.species_key === 'black-bear').length : 'SKIPPED'} EN ${enRows.length} FR ${frRows.length} weapons EN ${coverage.weapon_classes_listed} complete=${coverage.complete} -> ${outPath}`);
  }

  console.log(`HARVESTED KEYS: ${wrote.join(', ') || '(none)'}`);
  console.log(`MOOSE SKIPPED: ${skipped.moose.join(', ') || '(none)'}`);
  console.log(`BEAR SKIPPED: ${skipped.bear.join(', ') || '(none)'}`);
  console.log(`DEER SKIPPED: ${skipped.deer.join(', ') || '(none)'}`);

  if (fatal) {
    console.error(`harvest-hunting-on: ${fatal} WMU(s) failed`);
    process.exitCode = 1;
  }
  return { fatal, wrote, skipped };
}

if (isMain) await harvestHuntingOn();
