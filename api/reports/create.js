// POST /api/reports/create
// Create a community trip report. Frictionless (no login) but server-gated:
// honeypot, per-IP rate limit, text screening, salted IP hash. Photos are
// uploaded client-side to the 'spot-photos' bucket AFTER passing a client-side
// NSFW classifier; here we only store the resulting URL + caption.
import {
  rest, hashIp, overRateLimit, screenText, readBody, json, methodGuard,
  isActivity, cleanSlug, clip
} from '../_lib/community.js';

export const config = { runtime: 'nodejs' };

const CONDITION_TAGS = new Set([
  'parking_full', 'parking_ok', 'bugs_heavy', 'bugs_light', 'trail_dry', 'trail_muddy',
  'water_high', 'water_low', 'ice_unsafe', 'ice_good', 'snow_deep', 'crowded', 'quiet',
  'closure', 'fire_ban', 'poor_signal', 'good_fishing', 'slow_fishing', 'wildlife_active'
]);
const PARKING = new Set(['empty', 'some', 'full', 'unknown']);
const CROWDING = new Set(['quiet', 'moderate', 'busy', 'unknown']);
const SIGNAL = new Set(['none', 'weak', 'ok', 'good', 'unknown']);

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const b = readBody(req);

  // Honeypot: real users never fill this hidden field.
  if (b.website_url) return json(res, 200, { ok: true, skipped: true });

  const activity = String(b.activity || '');
  const spot_slug = cleanSlug(b.spot_slug);
  const body = clip(b.body, 2000);
  if (!isActivity(activity) || !spot_slug) return json(res, 400, { error: 'Invalid spot' });
  if (!body || body.length < 3) return json(res, 400, { error: 'Report is too short' });

  const screen = screenText(body);
  if (!screen.ok) return json(res, 422, { error: 'Content rejected', reason: screen.reason });

  const ip_hash = hashIp(req);
  try {
    if (await overRateLimit('spot_reports', ip_hash, 5, 10 * 60 * 1000)) {
      return json(res, 429, { error: 'Slow down — too many reports. Try again shortly.' });
    }
  } catch (_) { /* if rate check fails, fail open but continue to insert */ }

  const tags = Array.isArray(b.condition_tags)
    ? [...new Set(b.condition_tags.filter(t => CONDITION_TAGS.has(t)))].slice(0, 10)
    : [];

  const row = {
    activity,
    spot_slug,
    author_name: clip(b.author_name, 60) || null,
    body,
    visit_date: clip(b.visit_date, 40) || null,
    condition_tags: tags,
    wildlife: clip(b.wildlife, 200) || null,
    parking_status: PARKING.has(b.parking_status) ? b.parking_status : null,
    crowding: CROWDING.has(b.crowding) ? b.crowding : null,
    cell_signal: SIGNAL.has(b.cell_signal) ? b.cell_signal : null,
    photo_url: typeof b.photo_url === 'string' && b.photo_url.startsWith('http') ? b.photo_url : null,
    photo_caption: clip(b.photo_caption, 200) || null,
    status: 'visible',
    ip_hash,
    user_agent: clip(req.headers['user-agent'] || '', 300)
  };

  try {
    const created = await rest('spot_reports', {
      method: 'POST',
      body: row,
      prefer: 'return=representation'
    });
    const r = Array.isArray(created) ? created[0] : created;
    // Return only public-safe fields.
    return json(res, 201, {
      ok: true,
      report: {
        id: r.id, author_name: r.author_name, body: r.body, visit_date: r.visit_date,
        condition_tags: r.condition_tags, wildlife: r.wildlife, parking_status: r.parking_status,
        crowding: r.crowding, cell_signal: r.cell_signal, photo_url: r.photo_url,
        photo_caption: r.photo_caption, helpful_count: 0, created_at: r.created_at
      }
    });
  } catch (e) {
    return json(res, 500, { error: 'Could not save report' });
  }
}
