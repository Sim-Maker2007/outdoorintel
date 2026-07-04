// POST /api/reports/vote  { report_id }
// Mark a report "helpful". Deduped per anonymous device/IP. Returns new count.
import { rest, hashIp, overRateLimit, readBody, json, methodGuard } from '../_lib/community.js';

export const config = { runtime: 'nodejs' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const b = readBody(req);
  const report_id = String(b.report_id || '');
  if (!UUID.test(report_id)) return json(res, 400, { error: 'Invalid report' });

  const voter_hash = hashIp(req);
  try {
    if (await overRateLimit('report_votes', voter_hash, 40, 60 * 1000)) {
      return json(res, 429, { error: 'Too many votes. Try again shortly.' });
    }
  } catch (_) { /* fail open */ }

  try {
    // Insert vote; unique(report_id, voter_hash) blocks duplicates.
    await rest('report_votes', {
      method: 'POST',
      body: { report_id, voter_hash },
      prefer: 'return=minimal,resolution=ignore-duplicates'
    });
    // Recompute + persist denormalized count.
    const votes = await rest(`report_votes?report_id=eq.${report_id}&select=id`);
    const count = Array.isArray(votes) ? votes.length : 0;
    await rest(`spot_reports?id=eq.${report_id}`, {
      method: 'PATCH',
      body: { helpful_count: count }
    });
    return json(res, 200, { ok: true, helpful_count: count });
  } catch (e) {
    return json(res, 500, { error: 'Could not record vote' });
  }
}
