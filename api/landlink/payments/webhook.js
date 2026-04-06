// POST /api/landlink/payments/webhook
// Stripe webhook handler for payment events.
// Processes: checkout.session.completed, payment_intent.succeeded, charge.refunded

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { buffer } from 'micro';

export const config = { runtime: 'nodejs', api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'LandLink <noreply@outdoorintel.ca>';
const BASE = process.env.LANDLINK_PUBLIC_URL || 'https://landlink.outdoorintel.ca';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  const rawBody = await buffer(req);
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { request_id, hunter_id, parcel_id } = session.metadata || {};
    if (!request_id) return res.status(200).json({ ok: true, skipped: true });

    // Mark request as paid
    await serviceClient.from('landlink_hunt_requests').update({
      payment_status: 'paid',
      stripe_payment_intent: session.payment_intent,
      paid_at: new Date().toISOString()
    }).eq('id', request_id);

    // Send confirmation emails
    try {
      const { data: hunterAuth } = await serviceClient.auth.admin.getUserById(hunter_id);
      const { data: parcel } = await serviceClient.from('landlink_parcels')
        .select('name, owner_id').eq('id', parcel_id).single();

      if (hunterAuth?.user?.email) {
        await resend.emails.send({
          from: FROM, to: [hunterAuth.user.email],
          subject: `Payment confirmed for ${parcel.name}`,
          html: `<h2>Payment Confirmed</h2>
            <p>Your payment of <strong>$${(session.amount_total / 100).toFixed(2)} CAD</strong> for <strong>${parcel.name}</strong> has been processed.</p>
            <p>Your access agreement will be available in your dashboard.</p>
            <p><a href="${BASE}/en/landlink/dashboard" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none">View Dashboard</a></p>`
        });
      }

      // Notify landowner
      const { data: ownerAuth } = await serviceClient.auth.admin.getUserById(parcel.owner_id);
      if (ownerAuth?.user?.email) {
        await resend.emails.send({
          from: FROM, to: [ownerAuth.user.email],
          subject: `Payment received for ${parcel.name}`,
          html: `<h2>Payment Received</h2>
            <p>A hunter has completed payment for access to <strong>${parcel.name}</strong>.</p>
            <p>Amount: <strong>$${(session.amount_total / 100).toFixed(2)} CAD</strong></p>
            <p>Your payout will be processed after the hunt is completed.</p>
            <p><a href="${BASE}/en/landlink/dashboard" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none">View Dashboard</a></p>`
        });
      }
    } catch (emailErr) {
      console.error('Payment email failed:', emailErr);
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const pi = charge.payment_intent;
    // Find request by payment intent and mark as refunded
    const { data: requests } = await serviceClient
      .from('landlink_hunt_requests')
      .select('id').eq('stripe_payment_intent', pi);
    if (requests?.length) {
      await serviceClient.from('landlink_hunt_requests').update({
        payment_status: 'refunded'
      }).eq('id', requests[0].id);
    }
  }

  return res.status(200).json({ ok: true });
}
