// POST /api/reports/flag  { report_id, reason, note? }
// Community moderation. A DB trigger auto-hides a report at 3 distinct flags.
import { rest, hashIp, overRateLimit, readBody, json, methodGuard, clip } from '../_lib/community.js';

export const config = { runtime: 'nodejs' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REASONS = new Set(['nsfw', 'spam', 'offensive', 'inaccurate', 'other']);

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const b = readBody(req);
  const report_id = String(b.report_id || '');
  const reason = String(b.reason || '');
  if (!UUID.test(report_id)) return json(res, 400, { error: 'Invalid report' });
  if (!REASONS.has(reason)) return json(res, 400, { error: 'Invalid reason' });

  const reporter_hash = hashIp(req);
  try {
    if (await overRateLimit('report_flags', reporter_hash, 20, 60 * 1000)) {
      return json(res, 429, { error: 'Too many reports. Try again shortly.' });
    }
  } catch (_) { /* fail open */ }

  try {
    await rest('report_flags', {
      method: 'POST',
      body: { report_id, reason, reporter_hash, note: clip(b.note, 500) || null },
      prefer: 'return=minimal,resolution=ignore-duplicates'
    });
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: 'Could not submit flag' });
  }
}
