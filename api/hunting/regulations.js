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
      api: 'Outdoor Intel — Hunting seasons v1 (Québec sport hunting + Ontario WMU slice, cited HTML)',
      zones: values.map(listing),
      usage: '/api/hunting/regulations?zone=QC-H-10W|ON-H-63A|ON-H-64A&lang=en|fr&species=deer|moose|bear&date=YYYY-MM-DD. zone=12 is QC hunting QC-H-12, not fishing. zone=ON-12 and ON-H-12 are refused. Ontario WMUs 63A/63B/64A/64B/65/66A/66B/67/68A/68B are harvested from the Hunting Regulations Summary. Black bear and moose are present only where the official table has rows (or an undivided parent/range that applies).',
    });
    return;
  }

  const found = lookupHunting(HUNTING, { zone });
  if (found.status === 'refuse-on-12') {
    res.status(404).json({
      error: 'hunting key ON-12 is refused',
      zone: found.zone,
      reason: 'ON-12 is Ontario fishing FMZ 12. Ontario WMU 12 (Rainy River) is never harvested. Harvested Ontario hunting keys are ON-H-63A, ON-H-63B, ON-H-64A, ON-H-64B, ON-H-65, ON-H-66A, ON-H-66B, ON-H-67, ON-H-68A, ON-H-68B.',
      available: found.available.length ? found.available : huntingKeys(HUNTING),
    });
    return;
  }
  if (found.status !== 'ok' || !found.doc) {
    res.status(404).json({
      error: `hunting zone ${zone} not available`,
      available: huntingKeys(HUNTING),
      note: 'Hunting coverage is Québec deer+moose 2026 plus black bear where the official table has rows for harvested QC-H-* keys (4, 5E/5W, 6N/6S, 7N/7S, 8E/8N/8S, 9E/9W, 10E/10W, 11E/11W, 12, 13SW, 14, 15E/15W, 16), and Ontario WMUs 63A, 63B, 64A, 64B, 65, 66A, 66B, 67, 68A and 68B from the Hunting Regulations Summary HTML (moose/bear only where the table has a row or undivided parent/range). Not all 28 QC zones, not all Ontario WMUs, not WMU 12, not small game. Fishing stays on GET /api/regulations. zone=12 is QC-H-12, never fishing zone 12. zone=16 is QC-H-16, never fishing zone 16. zone=ON-12 is refused.',
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
