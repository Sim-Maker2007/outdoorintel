// POST /api/corrections/create
// "Suggest a correction" — feeds the editorial verification workflow described
// in docs/REFERENCE_OPERATING_PLAN.md. Stored server-side; not shown publicly.
import {
  rest, hashIp, overRateLimit, screenText, readBody, json, methodGuard,
  isActivity, cleanSlug, clip
} from '../_lib/community.js';

export const config = { runtime: 'nodejs' };

const FIELDS = new Set([
  'getting_there', 'parking', 'regulations', 'safety', 'nearby_services',
  'accommodation', 'access', 'coordinates', 'closure', 'other'
]);

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const b = readBody(req);
  if (b.website_url) return json(res, 200, { ok: true, skipped: true }); // honeypot

  const activity = String(b.activity || '');
  const spot_slug = cleanSlug(b.spot_slug);
  const suggestion = clip(b.suggestion, 2000);
  if (!isActivity(activity) || !spot_slug) return json(res, 400, { error: 'Invalid spot' });
  if (!suggestion || suggestion.length < 5) return json(res, 400, { error: 'Please add more detail' });

  const screen = screenText(suggestion);
  if (!screen.ok) return json(res, 422, { error: 'Content rejected', reason: screen.reason });

  const ip_hash = hashIp(req);
  try {
    if (await overRateLimit('spot_corrections', ip_hash, 8, 10 * 60 * 1000)) {
      return json(res, 429, { error: 'Too many suggestions. Try again shortly.' });
    }
  } catch (_) { /* fail open */ }

  const source_url = typeof b.source_url === 'string' && b.source_url.startsWith('http')
    ? clip(b.source_url, 500) : null;

  try {
    await rest('spot_corrections', {
      method: 'POST',
      body: {
        activity, spot_slug,
        field: FIELDS.has(b.field) ? b.field : 'other',
        suggestion, source_url,
        submitter_name: clip(b.submitter_name, 60) || null,
        submitter_email: clip(b.submitter_email, 120) || null,
        status: 'open', ip_hash
      },
      prefer: 'return=minimal'
    });
    return json(res, 201, { ok: true });
  } catch (e) {
    return json(res, 500, { error: 'Could not submit correction' });
  }
}
