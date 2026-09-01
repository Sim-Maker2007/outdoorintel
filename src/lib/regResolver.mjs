// Regulation Resolver v1 (vision pillar 1) — isomorphic query layer over
// data/regulations/zone-*.json and data/regulations/on-fmz-*.json.
//
// Accuracy contract (docs/VISION.md): rule text is served VERBATIM from the
// harvested authority data, always alongside its citation (source URL,
// authority, fetched date) and a verify-with-the-authority disclaimer.
// This module structures and filters; it never generates or paraphrases.
import { disclaimerFor, regulationKey } from './regsLookup.mjs';

/** Parse "Du 15 mai 2026 au 31 mars 2027" / "From May 15, 2026 to March 31, 2027" into dates. */
const FR_MONTHS = { janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12 };
const EN_MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

export function parsePeriod(str) {
  if (!str) return null;
  const s = str.toLowerCase();
  const dates = [];
  const re = /(\d{1,2})(?:er)?\s+([a-zéû]+)\s+(\d{4})|([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[1]) {
      const mo = FR_MONTHS[m[2]];
      if (mo) dates.push(`${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`);
    } else {
      const mo = EN_MONTHS[m[4]];
      if (mo) dates.push(`${m[6]}-${String(mo).padStart(2, '0')}-${String(m[5]).padStart(2, '0')}`);
    }
  }
  if (dates.length < 2) return null;
  return { from: dates[0], to: dates[1] };
}

const CLOSED_ALL_YEAR = /closed all year|ferm[ée]e?\s+toute\s+l['’]ann[ée]e|p[êe]che interdite toute l['’]ann[ée]e/i;

export function isClosedAllYear(str) {
  return !!str && CLOSED_ALL_YEAR.test(String(str));
}

function ruleActiveOn(rule, isoDate) {
  if (!isoDate) return true;
  // Closed-all-year is always in force (ON + QC). Never drop it for a date filter.
  if (isClosedAllYear(rule.period) || isClosedAllYear(rule.notes) || isClosedAllYear(rule.raw)) return true;
  if (!rule.period) return true; // no date filter or undated rule: include
  const p = parsePeriod(rule.period);
  if (!p) return true; // unparseable period: include (never hide a rule we can't interpret)
  return isoDate >= p.from && isoDate <= p.to;
}

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function matchesSpecies(rule, q) {
  if (!q) return true;
  const hay = norm(rule.species);
  return q.split(/[,;]/).some(term => {
    const n = norm(term);
    return n && hay.includes(n);
  });
}

// DevExpress grid headers harvested as fake "species" rows (EN+FR, optional colon).
// Only drop when the rest of the rule is empty — "Fishing prohibited" has a limit.
const GRID_JUNK_SPECIES = /^(Esp[eè]ce|Species|Limite de prise|Limite de longueur|Engin de p[eê]che|Catch limit|Length limit|Fishing device|Note)\s*:?\s*$/i;

export function isGridJunkRule(rule) {
  if (!rule) return false;
  if (rule.limit || rule.length || rule.gear || rule.notes) return false;
  return GRID_JUNK_SPECIES.test(String(rule.species || '').trim());
}

/**
 * Resolve applicable rules.
 * @param {object} zoneDoc  parsed data/regulations/zone-N.json
 * @param {object} q  { lang: 'fr'|'en', date?: 'YYYY-MM-DD', species?: string, waterbody?: string }
 * @returns {{ zone, citation, disclaimer, general, waterbody }|null}
 */
function filterRules(rules, { date, species }) {
  return (rules || [])
    .filter(r => !isGridJunkRule(r))
    .filter(r => ruleActiveOn(r, date))
    .filter(r => matchesSpecies(r, species));
}

function findOnWaterbody(zoneDoc, L, waterbody) {
  const nq = norm(waterbody);
  if (!nq) return null;
  const source = zoneDoc.source?.[L];

  const exceptions = zoneDoc.waterbody_exceptions?.[L] || [];
  const foundEx = exceptions.find(w => norm(w.name).includes(nq) || norm(w.location || '').includes(nq));
  if (foundEx) {
    return {
      name: foundEx.name,
      source,
      rules: foundEx.rules || [],
    };
  }

  const speciesEx = zoneDoc.species_exceptions?.[L] || [];
  const speciesHits = [];
  for (const block of speciesEx) {
    const waters = block.waters || [];
    if (waters.some(w => norm(w).includes(nq))) {
      speciesHits.push({
        period: block.period,
        species: block.species,
        limit: block.limit,
        length: block.length,
        gear: block.gear,
        notes: block.notes,
        raw: block.raw,
      });
    }
  }
  if (speciesHits.length) {
    return { name: waterbody, source, rules: speciesHits };
  }

  const sanctuaries = zoneDoc.fish_sanctuaries?.[L] || [];
  const sanctHits = [];
  for (const s of sanctuaries) {
    const waters = s.waters || [];
    if (waters.some(w => norm(w).includes(nq))) {
      sanctHits.push({
        period: s.period,
        species: s.species || null,
        limit: s.limit || null,
        length: s.length || null,
        gear: s.gear || null,
        notes: s.notes,
        raw: s.raw,
      });
    }
  }
  if (sanctHits.length) {
    return { name: waterbody, source, rules: sanctHits };
  }
  return null;
}

/**
 * Resolve applicable rules.
 * @param {object} zoneDoc  parsed data/regulations/zone-N.json or on-fmz-N.json
 * @param {object} q  { lang: 'fr'|'en', date?: 'YYYY-MM-DD', species?: string, waterbody?: string }
 * @returns {{ zone, citation, disclaimer, general, waterbody }|null}
 */
export function resolveRegs(zoneDoc, { lang = 'fr', date, species, waterbody } = {}) {
  const L = lang === 'en' ? 'en' : 'fr';

  const general = filterRules(zoneDoc.general?.[L] || [], { date, species });

  let wb = null;
  if (waterbody) {
    if (Array.isArray(zoneDoc.waterbodies) && zoneDoc.waterbodies.length) {
      const nq = norm(waterbody);
      const found = zoneDoc.waterbodies.find(w => {
        const name = w.name;
        if (name && typeof name === 'object') {
          return norm(name[L]).includes(nq) || norm(name.fr).includes(nq);
        }
        return norm(name).includes(nq);
      });
      if (found) {
        const rulesSrc = found.rules?.[L] || found.rules || [];
        wb = {
          id_endro: found.id_endro,
          name: found.name?.[L] || found.name,
          coordinates: found.coordinates,
          source: found.source?.[L] || found.source,
          rules: filterRules(rulesSrc, { date, species }),
        };
      }
    }
    if (!wb && zoneDoc.jurisdiction === 'ON') {
      const found = findOnWaterbody(zoneDoc, L, waterbody);
      if (found) {
        wb = {
          name: found.name,
          source: found.source,
          rules: filterRules(found.rules, { date, species }),
        };
      }
    }
  }

  return {
    zone: {
      id: zoneDoc.jurisdiction === 'ON' ? regulationKey(zoneDoc) : zoneDoc.zone_id,
      zone_key: regulationKey(zoneDoc),
      fmz: zoneDoc.fmz,
      jurisdiction: zoneDoc.jurisdiction,
      activity: zoneDoc.activity,
      title: zoneDoc.title?.[L],
      licence_year: zoneDoc.licence_year,
    },
    citation: {
      authority: zoneDoc.authority,
      source: zoneDoc.source[L],
      fetched_at: zoneDoc.source.fetched_at,
      html_updated: zoneDoc.source.html_updated,
      fish_on_line: zoneDoc.source.fish_on_line,
      coverage: zoneDoc.coverage,
    },
    disclaimer: disclaimerFor(zoneDoc, L),
    notices: zoneDoc.notices?.[L],
    general,
    waterbody: wb,
    waterbody_not_found: waterbody && !wb ? true : undefined,
  };
}
