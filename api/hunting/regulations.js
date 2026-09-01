// Public, read-only, cited hunting-season lookup.
// Separate from fishing GET /api/regulations — zone=12 here is QC hunting
// QC-H-12, never Québec fishing zone 12. zone=ON-12 is refused.
//
//   GET /api/hunting/regulations
//   GET /api/hunting/regulations?zone=QC-H-10W&lang=en
//   GET /api/hunting/regulations?zone=12&species=moose
import { HUNTING } from '../_data/hunting-index.js';
import { resolveHunting } from '../../src/lib/huntResolver.mjs';
import { lookupHunting, huntingKeys } from '../../src/lib/huntLookup.mjs';

function listing(z) {
  return {
    zone_id: z.zone_id,
    zone_key: z.zone_key,
    slug: z.slug,
    jurisdiction: z.jurisdiction,
    activity: z.activity,
    title: z.title,
    source: z.source,
    coverage: z.coverage,
    licence_year: z.licence_year,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET only' });
    return;
  }

  const { zone, lang = 'fr', date, species, weapon_class } = req.query || {};

  if (!zone) {
    const values = Object.values(HUNTING);
    res.status(200).json({
      api: 'Outdoor Intel — Hunting seasons v1 (Québec sport hunting, cited HTML)',
      zones: values.map(listing),
      usage: '/api/hunting/regulations?zone=QC-H-10W&lang=en|fr&species=deer|moose&date=YYYY-MM-DD. zone=12 is QC hunting QC-H-12, not fishing. zone=ON-12 is refused.',
    });
    return;
  }

  const found = lookupHunting(HUNTING, { zone });
  if (found.status === 'refuse-on-12') {
    res.status(404).json({
      error: 'hunting key ON-12 is refused',
      zone: found.zone,
      reason: 'ON-12 is Ontario fishing FMZ 12. Ontario WMU 12 (Rainy River) is never harvested. Ottawa-adjacent WMUs are a later slice.',
      available: found.available.length ? found.available : huntingKeys(HUNTING),
    });
    return;
  }
  if (found.status !== 'ok' || !found.doc) {
    res.status(404).json({
      error: `hunting zone ${zone} not available`,
      available: huntingKeys(HUNTING),
      note: 'Hunting v1 is Québec zones 10E/10W/11E/11W (plus 9E/9W/12 when harvested). Fishing stays on GET /api/regulations.',
    });
    return;
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    return;
  }

  const payload = resolveHunting(found.doc, { lang, date, species, weapon_class });
  if (payload.zone.activity !== 'hunting') {
    res.status(500).json({ error: 'hunting endpoint refused a non-hunting document' });
    return;
  }
  res.status(200).json(payload);
}
