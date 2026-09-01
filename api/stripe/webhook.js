// POST /api/stripe/webhook
// Verifies the Stripe signature, then stores Season Intel membership
// (email + Stripe customer/subscription ids) in Supabase when available.

import { json } from '../_lib/community.js';
import {
  checkoutConfigured,
  notConfigured,
  getStripe,
  readRawBody,
  applyStripeEvent,
} from '../_lib/stripe.js';

export const config = {
  api: { bodyParser: false },
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    if (!checkoutConfigured()) return json(res, 503, notConfigured());

    const stripe = getStripe();
    const signature = req.headers['stripe-signature'];
    if (!signature) return json(res, 400, { error: 'missing_signature' });

    const raw = await readRawBody(req);
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        raw,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET.trim()
      );
    } catch (err) {
      console.warn('[season-intel] webhook signature failed:', err.message);
      return json(res, 400, { error: 'invalid_signature' });
    }

    await applyStripeEvent(event);
    return json(res, 200, { received: true });
  } catch (err) {
    console.error('[season-intel] webhook error:', err.message);
    if (!checkoutConfigured()) return json(res, 503, notConfigured());
    return json(res, 500, { error: 'webhook_failed' });
  }
}
