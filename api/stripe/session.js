// POST /api/stripe/session — { session_id }
// After hosted Checkout, verify the session and set a signed member cookie.
// GET returns the cookie member (if any). Checkout APIs 503 when unset.

import { json, readBody } from '../_lib/community.js';
import {
  checkoutConfigured,
  notConfigured,
  getStripe,
  persistMember,
  memberFromRequest,
  memberSetCookie,
  normalizeLang,
  normalizeEmail,
} from '../_lib/stripe.js';

export const config = { runtime: 'nodejs' };

function idOf(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id || null;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!checkoutConfigured()) return json(res, 503, notConfigured());
      const member = memberFromRequest(req);
      return json(res, 200, {
        member: !!(member && member.status !== 'canceled'),
        status: member?.status || null,
      });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    if (!checkoutConfigured()) return json(res, 503, notConfigured());

    const body = readBody(req);
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
    if (!sessionId.startsWith('cs_')) return json(res, 400, { error: 'invalid_session' });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.status === 'complete' || session.payment_status === 'paid';
    if (!paid) return json(res, 402, { error: 'not_paid', member: false });

    const email = normalizeEmail(
      session.customer_details?.email || session.customer_email || session.metadata?.email
    );
    const customerId = idOf(session.customer);
    const subscriptionId = idOf(session.subscription);
    const lang = normalizeLang(session.metadata?.lang || session.locale);
    const member = {
      email,
      customerId,
      subscriptionId,
      status: 'active',
      lang,
    };
    await persistMember(member);
    const cookie = memberSetCookie(member, req);
    if (cookie) res.setHeader('Set-Cookie', cookie);
    return json(res, 200, { member: true, status: 'active' });
  } catch (err) {
    console.error('[season-intel] session error:', err.message);
    if (!checkoutConfigured()) return json(res, 503, notConfigured());
    return json(res, 502, { error: 'session_failed' });
  }
}
