// Hunting season resolver — isomorphic query over data/hunting/*.json.
// Structures and filters; never paraphrases rule text.
import { huntingKey, huntingDisclaimer } from './huntLookup.mjs';
import { parsePeriod } from './regResolver.mjs';

const FR_MONTHS = { janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12 };
const EN_MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const SPECIES_ALIASES = {
  deer: ['white-tailed deer', 'white tailed deer', 'deer', 'cerf de virginie', 'cerf'],
  moose: ['moose', 'orignal'],
  bear: ['black bear', 'black-bear', 'bear', 'ours noir', 'ours'],
};

function speciesHay(row) {
  return norm([row.species, row.species_key, row.segment].filter(Boolean).join(' '));
}

export function matchesHuntSpecies(row, q) {
  if (!q) return true;
  return String(q).split(/[,;]/).some(term => {
    const n = norm(term);
    if (!n) return false;
    const aliases = SPECIES_ALIASES[n] || [n];
    const hay = speciesHay(row);
    return aliases.some(a => hay.includes(norm(a)));
  });
}

function isoRange(year, mo1, d1, mo2, d2) {
  if (!year || !mo1 || !mo2) return null;
  return {
    from: `${year}-${String(mo1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`,
    to: `${year}-${String(mo2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`,
  };
}

/** Parse "From September 26 to October 4, 2026" or Ontario yearless "November 2 to November 15". */
export function parseHuntingPeriod(str, year = null) {
  if (!str) return null;
  if (/^(none|aucune|n\/a|closed)$/i.test(String(str).trim())) return null;
  const via = parsePeriod(str);
  if (via) return via;
  const s = String(str).toLowerCase().replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const fr = s.match(/(\d{1,2})(?:er)?\s+([a-zéû]+)\s+au\s+(\d{1,2})(?:er)?\s+([a-zéû]+)(?:\s+(\d{4}))?/);
  if (fr) {
    const y = fr[5] || year;
    const range = isoRange(y, FR_MONTHS[fr[2]], fr[1], FR_MONTHS[fr[4]], fr[3]);
    if (range) return range;
  }
  const frDash = s.match(/(\d{1,2})(?:er)?\s+([a-zéû]+)\s*[–—-]\s*(\d{1,2})(?:er)?\s+([a-zéû]+)(?:\s+(\d{4}))?/);
  if (frDash) {
    const y = frDash[5] || year;
    const range = isoRange(y, FR_MONTHS[frDash[2]], frDash[1], FR_MONTHS[frDash[4]], frDash[3]);
    if (range) return range;
  }
  const en = s.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+to\s+([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?(?:\s+(\d{4}))?/);
  if (en) {
    const y = en[5] || year;
    const range = isoRange(y, EN_MONTHS[en[1]], en[2], EN_MONTHS[en[3]], en[4]);
    if (range) return range;
  }
  return null;
}

function rowActiveOn(row, isoDate) {
  if (!isoDate) return true;
  const period = row.period_2026 || row.period;
  if (row.open === false || /^(none|aucune|n\/a|closed)$/i.test(String(period || '').trim())) return false;
  if (!period) return true;
  const p = row.period_from && row.period_to
    ? { from: row.period_from, to: row.period_to }
    : parseHuntingPeriod(period, row.year || docYear(row));
  if (!p) return true;
  return isoDate >= p.from && isoDate <= p.to;
}

function matchesWeapon(row, q) {
  if (!q) return true;
  return norm(row.weapon_class).includes(norm(q));
}

function docYear(row) {
  return row?.year || 2026;
}

/**
 * @param {object} doc  parsed data/hunting/qc-h-*.json or on-h-*.json
 * @param {object} q  { lang, date?, species?, weapon_class? }
 */
export function resolveHunting(doc, { lang = 'fr', date, species, weapon_class } = {}) {
  const L = lang === 'en' ? 'en' : 'fr';
  const seasons = (doc.seasons?.[L] || [])
    .filter(r => matchesHuntSpecies(r, species))
    .filter(r => matchesWeapon(r, weapon_class))
    .filter(r => rowActiveOn(r, date));

  const notices = doc.notices?.[L] || [];
  return {
    zone: {
      id: huntingKey(doc),
      zone_key: huntingKey(doc),
      zone_id: doc.zone_id,
      slug: doc.slug,
      jurisdiction: doc.jurisdiction,
      activity: doc.activity,
      title: doc.title?.[L],
      licence_year: doc.licence_year,
    },
    citation: {
      authority: doc.authority,
      source: doc.source?.[L],
      sources: doc.source,
      fetched_at: doc.source?.fetched_at,
      coverage: doc.coverage,
    },
    maps: doc.maps,
    disclaimer: huntingDisclaimer(L, doc.jurisdiction),
    notices,
    seasons,
    weapon_classes: [...new Set(seasons.map(r => r.weapon_class).filter(Boolean))],
  };
}
