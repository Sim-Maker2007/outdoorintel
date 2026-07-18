// POST /api/scout/conditions  { activity, slug }
// A short "should I go this weekend?" read that synthesizes the spot's season
// guidance, the weekend forecast, and any recent field reports.

import { completeJSON, aiConfigured } from '../_lib/ai.js';
import { getSpot, CATS } from '../_lib/spots.js';
import { readBody, json, methodGuard, aiGuard, rest } from '../_lib/community.js';

export const config = { runtime: 'nodejs' };

async function weekendWeather(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=8`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.daily || !d.daily.time) return null;
    return d.daily.time.map((t, i) => ({
      date: t, code: d.daily.weathercode[i], hi: Math.round(d.daily.temperature_2m_max[i]),
      lo: Math.round(d.daily.temperature_2m_min[i]), precip: d.daily.precipitation_sum[i]
    }));
  } catch { return null; }
}

async function recentReports(activity, slug) {
  try {
    const rows = await rest(`spot_reports_public?activity=eq.${encodeURIComponent(activity)}&spot_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&limit=5&select=body,condition_tags,visit_date,created_at`);
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!aiConfigured()) { json(res, 503, { ok: false, error: 'unavailable' }); return; }
  const guard = await aiGuard(req, { max: 40, windowMs: 60 * 60 * 1000 });
  if (!guard.allowed) { json(res, 429, { ok: false, error: 'rate' }); return; }

  const body = readBody(req);
  const activity = String(body.activity || ''), slug = String(body.slug || '');
  if (!CATS.includes(activity) || !slug) { json(res, 400, { ok: false, error: 'bad request' }); return; }

  let spot;
  try { spot = await getSpot(activity, slug); } catch { spot = null; }
  if (!spot) { json(res, 404, { ok: false, error: 'not found' }); return; }

  const coords = spot.coordinates || {};
  const [wx, reports] = await Promise.all([
    coords.lat != null ? weekendWeather(coords.lat, coords.lng) : Promise.resolve(null),
    recentReports(activity, slug)
  ]);

  const wxText = wx ? wx.slice(0, 8).map(d => `${d.date}: code ${d.code}, ${d.lo}–${d.hi}°C, precip ${d.precip}mm`).join('\n') : '(forecast unavailable)';
  const repText = reports.length ? reports.map(r => `- ${(r.visit_date || (r.created_at || '').slice(0, 10))}: ${r.body || ''}${Array.isArray(r.condition_tags) && r.condition_tags.length ? ' [' + r.condition_tags.join(', ') + ']' : ''}`).join('\n') : '(none yet)';

  const lang = body.lang === 'fr' ? 'French' : 'English';
  const system = `You give a brief, practical "should I go?" read for a Canadian outdoor spot, for ${activity}. Use ONLY the provided season guidance, forecast, and field reports. Do not invent conditions. Return JSON: {"verdict":"go|caution|wait","headline":"<=8 words","detail":"1-2 sentences, specific and honest"}. "go" = conditions look favourable; "caution" = doable but note a real caveat; "wait" = poor/out of season/unsafe. Use the forecast dates as "this week/weekend". Write headline and detail in ${lang}.`;
  const user = `Spot: ${spot.name}, ${spot.province}\nSeason guidance (best_time): ${spot.best_time || 'n/a'}\nSafety notes: ${spot.safety || 'n/a'}\n\nForecast (next days):\n${wxText}\n\nRecent field reports:\n${repText}`;

  try {
    const out = await completeJSON({ system, user, temperature: 0.3, max_tokens: 300 });
    const verdict = ['go', 'caution', 'wait'].includes(out.verdict) ? out.verdict : 'caution';
    json(res, 200, { ok: true, verdict, headline: String(out.headline || '').slice(0, 80), detail: String(out.detail || '').slice(0, 400), usedReports: reports.length, hasForecast: !!wx });
  } catch (e) {
    const code = e.code === 'no_key' ? 503 : 502;
    json(res, code, { ok: false, error: 'unavailable' });
  }
}
