// Hunting-regulations namespace (docs/HUNTING_SEASONS_HARVEST_V1.md).
// Completely separate from fishing: data/hunting/*.json, keys QC-H-10W, pages
// /[lang]/hunting/regulations/qc-h-10w, API /api/hunting/regulations.
//
// Collision rules:
//   Fishing GET /api/regulations?zone=12  → Québec fishing zone 12
//   Fishing GET /api/regulations?zone=ON-12 → Ontario FMZ 12
//   Hunting GET /api/hunting/regulations?zone=12 → QC hunting QC-H-12 (not fishing)
//   Hunting GET /api/hunting/regulations?zone=ON-12 → refused (fishing key; not WMU 12)
//   Ontario WMU 12 (Rainy River) is never harvested.

export function huntingKey(doc) {
  return String(doc?.zone_key || '');
}

export function huntingPageSlug(doc) {
  if (doc?.slug) return String(doc.slug).toLowerCase();
  return huntingKey(doc).toLowerCase();
}

export function huntingKeys(regs) {
  return Object.keys(regs || {}).sort();
}

const PART = {
  e: 'E', est: 'E', east: 'E',
  w: 'W', ouest: 'W', west: 'W',
  n: 'N', nord: 'N', north: 'N',
  s: 'S', sud: 'S', south: 'S',
};

/** Normalize 10W / qc-h-10w / QC-H-10W / 10-west → QC-H-10W. */
export function normalizeHuntingZoneToken(zone) {
  if (zone == null) return null;
  let raw = String(zone).trim();
  if (!raw) return null;
  raw = raw.replace(/\s+/g, ' ');

  const on12 = raw.match(/^ON-?12$/i) || raw.match(/^WMU-?12$/i);
  if (on12) return { refuse: 'ON-12' };

  const onFishing = raw.match(/^ON-(\d+)$/i);
  if (onFishing) return { refuse: 'ON-fishing-key', token: `ON-${onFishing[1]}` };

  const onHunt = raw.match(/^ON-H-([0-9]+[A-Z]?)$/i);
  if (onHunt) {
    const id = onHunt[1].toUpperCase();
    if (id === '12') return { refuse: 'ON-12' };
    return { key: `ON-H-${id}` };
  }

  const qc = raw.match(/^(?:QC-H-|qc-h-)?(\d{1,2})\s*[- ]?\s*(East|West|Est|Ouest|E|W)?$/i);
  if (qc) {
    const n = String(Number(qc[1]));
    const part = qc[2] ? PART[qc[2].toLowerCase()] : '';
    return { key: `QC-H-${n}${part}` };
  }

  const wmu = raw.match(/^(?:WMU-?)?(\d{1,3}[A-Z]?)$/i);
  if (wmu && /[A-Z]/i.test(wmu[1]) && !/^12$/i.test(wmu[1])) {
    return { key: `ON-H-${wmu[1].toUpperCase()}` };
  }

  return { key: raw.toUpperCase() };
}

export function lookupHunting(regs, { zone } = {}) {
  if (zone == null || String(zone).trim() === '') {
    return { status: 'list' };
  }
  const parsed = normalizeHuntingZoneToken(zone);
  if (!parsed) return { status: 'missing', zone, available: huntingKeys(regs) };

  if (parsed.refuse === 'ON-12' || parsed.refuse === 'ON-fishing-key') {
    return {
      status: 'refuse-on-12',
      zone: String(zone),
      reason: parsed.refuse,
      available: huntingKeys(regs),
    };
  }

  const key = parsed.key;
  const doc = regs[key];
  if (!doc) {
    return { status: 'missing', zone: key, available: huntingKeys(regs) };
  }
  if (doc.activity !== 'hunting') {
    return { status: 'missing', zone: key, available: huntingKeys(regs) };
  }
  return { status: 'ok', doc, key };
}

export function huntingDisclaimer(lang) {
  const L = lang === 'en' ? 'en' : 'fr';
  return L === 'fr'
    ? 'Texte reproduit intégralement des pages de chasse sportive de Québec.ca. Les règlements peuvent changer : vérifiez toujours auprès du MELCCFP avant de chasser. Les cartes (Forêt ouverte et PDF officiels) sont des liens — ce site n’interprète pas les polygones.'
    : 'Text reproduced verbatim from Québec.ca sport-hunting pages. Regulations can change: always verify with the MELCCFP before you hunt. Maps (Forêt ouverte and official PDFs) are links — this site does not interpret map polygons.';
}
