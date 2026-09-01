// Answer Layer v1 (docs/VISION.md pillar 6): public, read-only, cited
// regulation lookup over harvested Québec MELCCFP and Ontario MNR data.
//
//   GET /api/regulations                         -> zones grouped by jurisdiction
//   GET /api/regulations?zone=10&lang=fr         -> Québec zone 10
//   GET /api/regulations?zone=12&lang=en         -> Québec zone 12 (NOT Ontario)
//   GET /api/regulations?zone=ON-12&lang=en      -> Ontario FMZ 12
//   GET /api/regulations?jurisdiction=ON&zone=12 -> Ontario FMZ 12
//   GET /api/regulations?jurisdiction=ON&zone=5  -> 404 (unharvested ON FMZ; not QC 5)
//        &date=2026-06-15   filter to rules active on a date
//        &species=doré      filter by species substring
//        &waterbody=barbue  include a waterbody's exception rules
//
// Every response carries the authority citation, fetch date, coverage note,
// and a verify-with-the-authority disclaimer. Data is verbatim source text —
// this endpoint never generates or paraphrases regulation content.
import { REGS } from './_data/regs-index.js';
import { resolveRegs } from '../src/lib/regResolver.mjs';
import { lookupRegulation, onKeys } from '../src/lib/regsLookup.mjs';

function listing(z) {
  return {
    zone_id: z.zone_id,
    zone_key: z.zone_key || String(z.zone_id),
    fmz: z.fmz,
    jurisdiction: z.jurisdiction,
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

  const { zone, lang = 'fr', date, species, waterbody, jurisdiction } = req.query || {};

  if (!zone) {
    const values = Object.values(REGS);
    const qc = values.filter(z => z.jurisdiction !== 'ON').map(listing);
    const on = values.filter(z => z.jurisdiction === 'ON').map(listing);
    res.status(200).json({
      api: 'Outdoor Intel — Answer Layer v1 (Québec and Ontario sport-fishing regulations)',
      zones: { QC: qc, ON: on },
      usage: '/api/regulations?zone=10&lang=fr|en&date=YYYY-MM-DD&species=…&waterbody=…  Ontario: zone=ON-12 or jurisdiction=ON&zone=12. zone=12 without jurisdiction is Québec.',
    });
    return;
  }

  const found = lookupRegulation(REGS, { zone, jurisdiction });
  if (found.status === 'missing-on') {
    res.status(404).json({
      error: `Ontario FMZ ${String(found.zone).replace(/^ON-/, '')} is not harvested`,
      jurisdiction: 'ON',
      available: found.available.length ? found.available : onKeys(REGS),
      note: 'Ontario v1 covers FMZ 12, 16, 17 and 18 only — not complete Ontario. zone=12 without jurisdiction is Québec Zone 12.',
    });
    return;
  }
  if (found.status !== 'ok' || !found.doc) {
    res.status(404).json({ error: `zone ${zone} not available`, available: Object.keys(REGS) });
    return;
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    return;
  }

  res.status(200).json(resolveRegs(found.doc, { lang, date, species, waterbody }));
}
