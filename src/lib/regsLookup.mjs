// Shared regulation index keys and Answer Layer lookup.
//
// Québec stays keyed as "10", "12", … (zone_id).
// Ontario is keyed as "ON-12" (zone_key). A numeric key is never an ON doc.

export function regulationKey(doc) {
  if (doc?.zone_key) return String(doc.zone_key);
  return String(doc.zone_id);
}

export function regulationPageSlug(doc) {
  if (doc?.jurisdiction === 'ON') return `on-fmz-${doc.fmz}`;
  return `zone-${doc.zone_id}`;
}

export function onKeys(regs) {
  return Object.entries(regs)
    .filter(([, d]) => d && d.jurisdiction === 'ON')
    .map(([k]) => k)
    .sort();
}

export function assertUniqueRegulationKeys(regs) {
  for (const [key, doc] of Object.entries(regs)) {
    if (doc.jurisdiction === 'ON') {
      if (doc.jurisdiction !== 'ON') {
        throw new Error(`ON regulation ${key} missing jurisdiction ON`);
      }
      if (!/^ON-\d+$/.test(key)) {
        throw new Error(`ON regulation must be indexed as ON-{fmz}, got "${key}"`);
      }
      if (/^\d+$/.test(key) || key === String(doc.zone_id) || key === String(doc.fmz)) {
        throw new Error(`ON FMZ ${doc.fmz} indexed as "${key}" — would collide with Québec`);
      }
    }
  }
}

/** Parse zone=ON-12 / ON12 into { fmz, key }. */
export function parseOnZoneToken(zone) {
  if (zone == null) return null;
  const m = String(zone).trim().match(/^ON-?(\d+)$/i);
  if (!m) return null;
  return { fmz: m[1], key: `ON-${m[1]}` };
}

/**
 * Look up a harvested regulation document.
 *
 *   zone=12                 → Québec 12
 *   zone=ON-12              → Ontario FMZ 12
 *   jurisdiction=ON&zone=12 → Ontario FMZ 12
 *   jurisdiction=ON&zone=5  → Ontario FMZ 5 (not QC 5)
 *   jurisdiction=ON&zone=9  → missing ON (do not fall through to QC 9)
 */
export function lookupRegulation(regs, { zone, jurisdiction } = {}) {
  if (zone == null || String(zone).trim() === '') {
    return { status: 'list' };
  }
  const raw = String(zone).trim();
  const j = jurisdiction ? String(jurisdiction).trim().toUpperCase() : '';
  const explicitOn = parseOnZoneToken(raw);

  if (j === 'ON' || explicitOn) {
    const fmz = explicitOn ? explicitOn.fmz : raw.replace(/^ON-/i, '');
    if (!/^\d+$/.test(fmz)) {
      return { status: 'missing-on', zone: raw, available: onKeys(regs) };
    }
    const key = `ON-${fmz}`;
    const doc = regs[key];
    if (!doc || doc.jurisdiction !== 'ON') {
      return { status: 'missing-on', zone: key, available: onKeys(regs) };
    }
    return { status: 'ok', doc, key };
  }

  const doc = regs[raw];
  if (!doc) return { status: 'missing', zone: raw, available: Object.keys(regs) };
  return { status: 'ok', doc, key: raw };
}

export function disclaimerFor(doc, lang) {
  const L = lang === 'en' ? 'en' : 'fr';
  if (doc?.jurisdiction === 'ON') {
    return L === 'fr'
      ? 'Reproduction du Résumé des règlements de la pêche de l’Ontario. Le Résumé n’est pas la loi. Vérifiez toujours auprès du ministère des Richesses naturelles (MRN) et d’ON pêche en ligne avant de pêcher. © Couronne.'
      : 'Reproduction of the Ontario Fishing Regulations Summary. The Summary is not the law. Always verify with the Ministry of Natural Resources (MNR) and Fish ON-Line before you fish. Crown copyright.';
  }
  return L === 'fr'
    ? 'Texte reproduit intégralement de la source officielle. Les règlements peuvent changer : vérifiez toujours auprès du MELCCFP avant votre sortie.'
    : 'Text reproduced verbatim from the official source. Regulations can change: always verify with the MELCCFP before your trip.';
}
