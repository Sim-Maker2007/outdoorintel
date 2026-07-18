// POST /api/scout/search  { query }
// Natural-language spot discovery. The model interprets the query into a
// structured intent; we then rank our real index against it. Returns real
// spots only (never invents), plus a short interpretation for transparency.

import SPOTS from '../_data/spots-index.js';
import { completeJSON, aiConfigured } from '../_lib/ai.js';
import { readBody, json, methodGuard, clip, aiGuard } from '../_lib/community.js';

export const config = { runtime: 'nodejs' };
const CATS = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];

function scoreSpot(s, intent, terms) {
  let score = 0;
  const hay = (s.n + ' ' + s.p + ' ' + s.sp.join(' ') + ' ' + (s.blurb || '')).toLowerCase();
  terms.forEach(t => { if (t.length > 2 && hay.indexOf(t) >= 0) score += 2; });
  (intent.species || []).forEach(sp => { if (s.sp.some(x => x.toLowerCase().indexOf(String(sp).toLowerCase()) >= 0)) score += 4; });
  (intent.keywords || []).forEach(k => { if (hay.indexOf(String(k).toLowerCase()) >= 0) score += 2; });
  if (intent.provinces && intent.provinces.length && intent.provinces.some(p => s.p.toLowerCase().indexOf(String(p).toLowerCase()) >= 0)) score += 3;
  return score;
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!aiConfigured()) { json(res, 503, { ok: false, error: 'Smart search is not available yet.' }); return; }
  const guard = await aiGuard(req, { max: 30, windowMs: 60 * 60 * 1000 });
  if (!guard.allowed) { json(res, 429, { ok: false, error: 'Too many searches just now — try again shortly.' }); return; }

  const query = clip(readBody(req).query, 300);
  if (!query) { json(res, 400, { ok: false, error: 'Type what you are looking for.' }); return; }

  let intent;
  try {
    intent = await completeJSON({
      system: `You interpret a search for Canadian outdoor spots. Return JSON with keys: activities (subset of ${JSON.stringify(CATS)}), species (array of fish/game names mentioned), provinces (Canadian province/territory names mentioned), keywords (3-8 short descriptive terms capturing the vibe/constraints, e.g. "quiet","backcountry","no motors","family","beginner","trophy"), and summary (one short sentence restating what they want). Only include what the query implies.`,
      user: query, temperature: 0.2, max_tokens: 400
    });
  } catch (e) {
    const code = e.code === 'no_key' ? 503 : 502;
    json(res, code, { ok: false, error: code === 503 ? 'Smart search is not available yet.' : 'Smart search hiccuped — try again.' });
    return;
  }

  const acts = (intent.activities || []).filter(a => CATS.includes(a));
  const terms = query.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(Boolean);
  let pool = SPOTS;
  if (acts.length) pool = pool.filter(s => acts.includes(s.c));

  const ranked = pool.map(s => ({ s, score: scoreSpot(s, intent, terms) }))
    .filter(o => o.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(({ s }) => ({ activity: s.c, slug: s.s, name: s.n, province: s.p, species: s.sp, level: s.lvl }));

  json(res, 200, { ok: true, interpretation: clip(intent.summary, 200) || '', activities: acts, spots: ranked });
}
