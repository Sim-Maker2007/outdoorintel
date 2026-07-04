// POST /api/newsletter/subscribe — { email, lang?, source?, website? (honeypot) }
// Stores subscribers in the `newsletter_subscribers` table (db/newsletter.sql).
// Same posture as the community functions: service-role writes only, hashed
// IPs, per-IP rate limit, honeypot.

import { rest, hashIp, overRateLimit, readBody, json, methodGuard, clip } from '../_lib/community.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = readBody(req);

    // honeypot: bots fill every field
    if (body.website) return json(res, 200, { ok: true });

    const email = (body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return json(res, 400, { error: 'invalid_email' });
    }

    const ipHash = hashIp(req);
    if (await overRateLimit('newsletter_subscribers', ipHash, 5, 10 * 60 * 1000)) {
      return json(res, 429, { error: 'rate_limited' });
    }

    const lang = body.lang === 'fr' ? 'fr' : 'en';
    const source = clip(body.source, 80) || 'site';

    // upsert on email so re-subscribing is a friendly no-op
    await rest('newsletter_subscribers?on_conflict=email', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: [{ email, lang, source, ip_hash: ipHash }]
    });

    return json(res, 200, { ok: true });
  } catch (e) {
    const status = e.status === 429 ? 429 : 500;
    return json(res, status, { error: 'subscribe_failed' });
  }
}
