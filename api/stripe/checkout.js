// GET  /api/stripe/checkout — { configured: true } or 503 checkout_not_configured
// POST /api/stripe/checkout — create a Stripe Checkout Session (subscription, CAD price)
// Hosted Checkout only: no card fields on Outdoor Intel pages.

import { json, readBody } from '../_lib/community.js';
import {
  checkoutConfigured,
  notConfigured,
  getStripe,
  siteOrigin,
  normalizeLang,
  normalizeEmail,
  caslNote,
} from '../_lib/stripe.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!checkoutConfigured()) return json(res, 503, notConfigured());
      return json(res, 200, {
        configured: true,
        product: 'season-intel',
        amount: 29,
        currency: 'cad',
        interval: 'year',
      });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { error: 'Method not allowed' });
    }

    if (!checkoutConfigured()) return json(res, 503, notConfigured());

    const body = readBody(req);
    if (body.website) return json(res, 200, { ok: true });

    const lang = normalizeLang(body.lang);
    const email = normalizeEmail(body.email);
    const origin = siteOrigin(req);
    const stripe = getStripe();
    const price = process.env.STRIPE_PRICE_ID.trim();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/${lang}/season-intel/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${lang}/season-intel?checkout=cancelled`,
      locale: lang === 'fr' ? 'fr' : 'en',
      ...(email ? { customer_email: email } : {}),
      metadata: {
        product: 'season-intel',
        lang,
        ...(email ? { email } : {}),
      },
      subscription_data: {
        metadata: {
          product: 'season-intel',
          lang,
          ...(email ? { email } : {}),
        },
      },
      custom_text: {
        submit: { message: caslNote(lang) },
      },
    });

    if (!session?.url) return json(res, 502, { error: 'checkout_failed' });
    return json(res, 200, { url: session.url });
  } catch (err) {
    console.error('[season-intel] checkout error:', err.message);
    if (!checkoutConfigured()) return json(res, 503, notConfigured());
    return json(res, 502, { error: 'checkout_failed' });
  }
}
