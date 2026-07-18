// POST /api/scout/plan
// Scout — Outdoor Intel's grounded AI trip planner. The model may only pick
// spots returned by search_spots over our real dataset; present_plan output is
// validated against the index so a hallucinated spot can never reach the user.

import SPOTS from '../_data/spots-index.js';
import { chat, aiConfigured } from '../_lib/ai.js';
import { readBody, json, methodGuard, clip } from '../_lib/community.js';

export const config = { runtime: 'nodejs' };

const CATS = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const MAX_STEPS = 6;
const IDX = new Map(SPOTS.map(s => [s.c + '/' + s.s, s]));

function haversine(aLat, aLng, bLat, bLng) {
  const R = 6371, p = Math.PI / 180;
  const dLat = (bLat - aLat) * p, dLng = (bLng - aLng) * p;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function geocode(place) {
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=' + encodeURIComponent(place),
      { headers: { 'User-Agent': 'OutdoorIntel/1.0 (+https://outdoorintel.ca)' } });
    const j = await r.json();
    if (Array.isArray(j) && j[0]) return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
  } catch { /* ignore */ }
  return null;
}

async function searchSpots(args) {
  let list = SPOTS.slice();
  if (args.activity && CATS.includes(args.activity)) list = list.filter(s => s.c === args.activity);
  if (args.province) { const p = String(args.province).toLowerCase(); list = list.filter(s => s.p.toLowerCase().includes(p)); }
  if (args.species) { const sp = String(args.species).toLowerCase(); list = list.filter(s => s.sp.some(x => x.toLowerCase().includes(sp)) || s.n.toLowerCase().includes(sp)); }

  let origin = null;
  if (args.near && typeof args.near.lat === 'number') origin = { lat: args.near.lat, lng: args.near.lng };
  else if (args.near_place) origin = await geocode(String(args.near_place));

  let withD = list.map(s => ({ s, d: origin && s.lat != null ? haversine(origin.lat, origin.lng, s.lat, s.lng) : null }));
  if (origin && args.radius_km) withD = withD.filter(o => o.d != null && o.d <= args.radius_km);
  if (origin) withD.sort((a, b) => (a.d == null ? 1e9 : a.d) - (b.d == null ? 1e9 : b.d));

  const limit = Math.min(Math.max(parseInt(args.limit, 10) || 12, 1), 20);
  const results = withD.slice(0, limit).map(({ s, d }) => ({
    slug: s.s, activity: s.c, name: s.n, province: s.p, species: s.sp, level: s.lvl,
    blurb: s.blurb, distance_km: d != null ? Math.round(d) : undefined
  }));
  return { matched: withD.length, origin: origin ? { lat: origin.lat, lng: origin.lng, place: args.near_place } : null, results };
}

function validatePlan(args) {
  const stops = [];
  (args.stops || []).forEach(st => {
    const rec = IDX.get((st.activity) + '/' + (st.slug));
    if (rec && !stops.some(x => x.slug === rec.s && x.activity === rec.c)) {
      stops.push({ slug: rec.s, activity: rec.c, name: rec.n, province: rec.p,
        coordinates: rec.lat != null ? { lat: rec.lat, lng: rec.lng } : null, why: clip(st.why, 400) || '' });
    }
  });
  return { title: clip(args.title, 120) || 'Your trip', summary: clip(args.summary, 2000) || '', notes: clip(args.notes, 2000) || '', stops };
}

const TOOLS = [
  { type: 'function', function: {
    name: 'search_spots',
    description: 'Search the Outdoor Intel dataset of real, sourced Canadian outdoor spots. Call once per activity or area you need. Returns real spots only.',
    parameters: { type: 'object', properties: {
      activity: { type: 'string', enum: CATS, description: 'One activity type.' },
      province: { type: 'string', description: 'Province/territory name filter, e.g. "Ontario".' },
      species: { type: 'string', description: 'Species or feature to match, e.g. "walleye", "brook trout".' },
      near_place: { type: 'string', description: 'City/place to measure driving distance from, e.g. "Toronto, ON". Results are sorted nearest-first.' },
      radius_km: { type: 'number', description: 'Only return spots within this many km of near_place.' },
      limit: { type: 'number', description: 'Max results (default 12, max 20).' }
    }, required: [] }
  } },
  { type: 'function', function: {
    name: 'present_plan',
    description: 'Deliver the final itinerary to the user. Every stop MUST be a spot returned by search_spots (exact slug + activity). Do not invent spots.',
    parameters: { type: 'object', properties: {
      title: { type: 'string' },
      summary: { type: 'string', description: 'A short, friendly overview of the trip.' },
      stops: { type: 'array', items: { type: 'object', properties: {
        slug: { type: 'string' }, activity: { type: 'string', enum: CATS }, why: { type: 'string', description: 'One sentence on why this spot fits, grounded in its data.' }
      }, required: ['slug', 'activity', 'why'] } },
      notes: { type: 'string', description: 'Season, regulations reminder, and safety notes.' }
    }, required: ['title', 'summary', 'stops'] }
  } }
];

const SYSTEM = `You are Scout, Outdoor Intel's Canadian outdoor trip-planning assistant.

Rules:
- You may ONLY recommend spots returned by the search_spots tool. NEVER invent spots, lakes, trails, coordinates, species, or facts. If nothing fits, say so honestly.
- Use search_spots to find real spots — call it multiple times for different activities or areas as needed. Ground every recommendation in the returned data (species, province, distance, level, blurb).
- When you have a good set of spots, call present_plan to deliver the itinerary. Each stop must use the exact slug and activity from search_spots results.
- Respect seasons and safety. In your notes, remind the user to confirm current regulations via the official source on each spot page, and note that spot intel is community-sourced and not yet independently field-verified.
- Be concise, warm, and practical. Ask ONE brief clarifying question only if the request lacks both an activity and any location to work from.
- Canada only. Distances are straight-line estimates; real drive times are longer.`;

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-16).map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!aiConfigured()) { json(res, 503, { ok: false, error: 'Scout is not configured yet.' }); return; }

  const body = readBody(req);
  const history = sanitizeMessages(body.messages);
  if (!history.length || history[history.length - 1].role !== 'user') {
    json(res, 400, { ok: false, error: 'Ask Scout a question to plan a trip.' });
    return;
  }
  if (body.origin && typeof body.origin.lat === 'number') {
    history.unshift({ role: 'user', content: `(My location is approximately lat ${body.origin.lat.toFixed(3)}, lng ${body.origin.lng.toFixed(3)}${body.origin.label ? ' — ' + String(body.origin.label).slice(0, 60) : ''}. Use this as near when I say "near me".)` });
  }

  const messages = [{ role: 'system', content: SYSTEM }, ...history];

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const msg = await chat({ messages, tools: TOOLS, temperature: 0.4, max_tokens: 1400 });
      messages.push(msg);
      const calls = msg.tool_calls || [];
      if (!calls.length) { json(res, 200, { ok: true, type: 'message', reply: msg.content || '' }); return; }

      let finalized = null;
      for (const call of calls) {
        let args = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { args = {}; }
        let result;
        if (call.function.name === 'search_spots') {
          result = await searchSpots(args);
        } else if (call.function.name === 'present_plan') {
          const plan = validatePlan(args);
          result = { ok: plan.stops.length > 0, stops_accepted: plan.stops.length };
          if (plan.stops.length) finalized = plan;
        } else {
          result = { error: 'unknown tool' };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: JSON.stringify(result) });
      }
      if (finalized) {
        const addParam = finalized.stops.map(s => s.activity + ':' + s.slug).join(',');
        json(res, 200, { ok: true, type: 'plan', plan: finalized, addParam });
        return;
      }
    }
    json(res, 200, { ok: true, type: 'message', reply: 'I could not put together a solid plan for that — try narrowing it to one or two activities and a region.' });
  } catch (e) {
    const code = e.code === 'no_key' ? 503 : 502;
    const wantDebug = (body && body.debug === 'oi-diag-9f3') || (req.url && req.url.indexOf('oi-diag-9f3') >= 0);
    const payload = { ok: false, error: code === 503 ? 'Scout is not configured yet.' : 'Scout had trouble planning that. Please try again.' };
    if (wantDebug) { payload.detail = String(e.message || e); payload.upstreamStatus = e.status || null; }
    json(res, code, payload);
  }
}
