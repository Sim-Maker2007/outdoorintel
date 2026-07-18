// POST /api/scout/trip-brief  { stops:[{activity,slug}], dates? }
// Turns a built trip into a practical brief: gear checklist, permits/licences
// to sort out, and a safety rundown — tailored to the activities, provinces
// and season. Stops are resolved against our real index.

import SPOTS from '../_data/spots-index.js';
import { completeJSON, aiConfigured } from '../_lib/ai.js';
import { readBody, json, methodGuard, clip, aiGuard } from '../_lib/community.js';

export const config = { runtime: 'nodejs' };
const IDX = new Map(SPOTS.map(s => [s.c + '/' + s.s, s]));

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!aiConfigured()) { json(res, 503, { ok: false, error: 'unavailable' }); return; }
  const guard = await aiGuard(req, { max: 20, windowMs: 60 * 60 * 1000 });
  if (!guard.allowed) { json(res, 429, { ok: false, error: 'rate' }); return; }

  const body = readBody(req);
  const rawStops = Array.isArray(body.stops) ? body.stops.slice(0, 25) : [];
  const stops = rawStops.map(s => IDX.get((s.activity) + '/' + (s.slug))).filter(Boolean);
  if (!stops.length) { json(res, 400, { ok: false, error: 'No valid stops.' }); return; }

  const activities = [...new Set(stops.map(s => s.c))];
  const provinces = [...new Set(stops.map(s => s.p).filter(Boolean))];
  const dates = clip(body.dates, 60);

  const system = `You are Scout, preparing a concise, practical trip brief for a Canadian outdoor trip.
Base it on the activities, provinces, season, and spots given. Be specific and realistic; don't pad.
Return JSON: {"gear":[6-12 short items tailored to the activities, season and terrain],"permits":[licences/permits/passes to arrange, province-specific where relevant, each a short line],"safety":[4-8 short, specific safety points for these activities/region/season],"tips":[3-6 short practical tips]}.
For any licence/permit item, remind that exact rules are on each spot's official regulations link. Keep every item under ~16 words.`;
  const user = `Activities: ${activities.join(', ')}\nProvinces: ${provinces.join(', ') || 'Canada'}\nWhen: ${dates || 'not specified'}\nStops:\n${stops.map((s, i) => `${i + 1}. ${s.n} (${s.c}, ${s.p}) — species/features: ${(s.sp || []).join(', ')}`).join('\n')}`;

  try {
    const out = await completeJSON({ system, user, temperature: 0.4, max_tokens: 900 });
    const arr = v => Array.isArray(v) ? v.map(x => String(x).slice(0, 160)).slice(0, 14) : [];
    json(res, 200, { ok: true, brief: { gear: arr(out.gear), permits: arr(out.permits), safety: arr(out.safety), tips: arr(out.tips) }, activities, provinces });
  } catch (e) {
    const code = e.code === 'no_key' ? 503 : 502;
    json(res, code, { ok: false, error: code === 503 ? 'unavailable' : 'Could not build the brief right now.' });
  }
}
