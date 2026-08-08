// Answer Layer v1 (docs/VISION.md pillar 6): public, read-only, cited
// regulation lookup over the harvested MELCCFP data.
//
//   GET /api/regulations                         -> available zones + coverage
//   GET /api/regulations?zone=10&lang=fr         -> zone rules (cited)
//        &date=2026-06-15   filter to rules active on a date
//        &species=doré      filter by species substring
//        &waterbody=barbue  include a waterbody's exception rules
//
// Every response carries the authority citation, fetch date, coverage note,
// and a verify-with-the-authority disclaimer. Data is verbatim source text —
// this endpoint never generates or paraphrases regulation content.
import { REGS } from './_data/regs-index.js';
import { resolveRegs } from '../src/lib/regResolver.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET only' });
    return;
  }

  const { zone, lang = 'fr', date, species, waterbody } = req.query || {};

  if (!zone) {
    res.status(200).json({
      api: 'Outdoor Intel — Answer Layer v1 (Québec sport-fishing regulations)',
      zones: Object.values(REGS).map(z => ({
        zone_id: z.zone_id,
        title: z.title,
        source: z.source,
        coverage: z.coverage,
      })),
      usage: '/api/regulations?zone=10&lang=fr|en&date=YYYY-MM-DD&species=…&waterbody=…',
    });
    return;
  }

  const doc = REGS[String(zone)];
  if (!doc) {
    res.status(404).json({ error: `zone ${zone} not available`, available: Object.keys(REGS) });
    return;
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    return;
  }

  res.status(200).json(resolveRegs(doc, { lang, date, species, waterbody }));
}
