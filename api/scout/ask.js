// POST /api/scout/ask  { activity, slug, question, history? }
// Grounded Q&A about ONE spot — answers only from that spot's data + recent
// community field notes. Never invents facts.

import { complete, aiConfigured } from '../_lib/ai.js';
import { getSpot, CATS } from '../_lib/spots.js';
import { readBody, json, methodGuard, clip, aiGuard, rest } from '../_lib/community.js';

export const config = { runtime: 'nodejs' };

async function recentReports(activity, slug) {
  try {
    const rows = await rest(`spot_reports_public?activity=eq.${encodeURIComponent(activity)}&spot_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&limit=5&select=author_name,body,condition_tags,visit_date,created_at`);
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

function spotContext(s) {
  const lines = [];
  const push = (k, v) => { if (v && String(v).trim()) lines.push(k + ': ' + String(v).trim()); };
  push('Name', s.name);
  push('Province', s.province);
  push('Activity species/features', (s.primary_species || s.primary_game || s.features || []).join(', '));
  push('Scout level', s.scout_level);
  push('Overview', s.description);
  push('Getting there', s.getting_there);
  push('Parking', s.parking);
  push('Best time', s.best_time);
  push('Terrain', s.terrain);
  push('Regulations', s.regulations);
  push('Safety', s.safety);
  push('Nearby services', s.nearby_services);
  push('Accommodation', s.accommodation);
  push('Official source', s.source_label || s.source_url);
  push('Official regulations URL', s.official_regulation_url);
  return lines.join('\n');
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!aiConfigured()) { json(res, 503, { ok: false, error: 'Ask is not available yet.' }); return; }
  const guard = await aiGuard(req, { max: 25, windowMs: 60 * 60 * 1000 });
  if (!guard.allowed) { json(res, 429, { ok: false, error: 'You’ve asked a lot just now — give it a minute and try again.' }); return; }

  const body = readBody(req);
  const activity = String(body.activity || '');
  const slug = String(body.slug || '');
  const question = clip(body.question, 500);
  if (!CATS.includes(activity) || !slug || !question) { json(res, 400, { ok: false, error: 'Missing question.' }); return; }

  let spot;
  try { spot = await getSpot(activity, slug); } catch { spot = null; }
  if (!spot) { json(res, 404, { ok: false, error: 'Spot not found.' }); return; }

  const reports = await recentReports(activity, slug);
  const reportsText = reports.length
    ? reports.map(r => `- ${r.visit_date || (r.created_at || '').slice(0, 10)} ${r.author_name ? '(' + r.author_name + ')' : ''}: ${r.body || ''}${Array.isArray(r.condition_tags) && r.condition_tags.length ? ' [' + r.condition_tags.join(', ') + ']' : ''}`).join('\n')
    : '(no community field reports yet)';

  const lang = body.lang === 'fr' ? 'French' : 'English';
  const system = `You are Scout, Outdoor Intel's assistant, answering a question about ONE specific Canadian outdoor spot.
Answer ONLY from the CONTEXT and FIELD REPORTS below. Do not invent facts, distances, species, or regulations.
If the context does not contain the answer, say so plainly and point the user to the official source / spot page.
For any question about licences, limits, or legality, tell them to confirm on the official regulations link — rules change.
Note when useful that this intel is community-sourced and not yet independently field-verified. Be concise (2-4 sentences), friendly, and specific. Respond in ${lang}.`;

  const user = `CONTEXT for ${spot.name}, ${spot.province}:\n${spotContext(spot)}\n\nRECENT FIELD REPORTS:\n${reportsText}\n\nQUESTION: ${question}`;

  try {
    const answer = await complete({ system, user, temperature: 0.3, max_tokens: 700 });
    json(res, 200, { ok: true, answer, usedReports: reports.length });
  } catch (e) {
    const code = e.code === 'no_key' ? 503 : 502;
    json(res, code, { ok: false, error: code === 503 ? 'Ask is not available yet.' : 'Scout could not answer that just now. Please try again.' });
  }
}
