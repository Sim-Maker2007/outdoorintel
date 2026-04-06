// POST /api/landlink/payments/create-checkout
// Creates a Stripe Checkout Session for a hunt request.
// Called after landowner approves and hunter needs to pay.
//
// Body: { request_id }
// Auth: Supabase JWT (must be the hunter)

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const config = { runtime: 'nodejs' };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BASE = process.env.LANDLINK_PUBLIC_URL || 'https://landlink.outdoorintel.ca';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { request_id } = req.body || {};
  if (!request_id) return res.status(400).json({ error: 'request_id required' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  // Fetch request + parcel
  const serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: hr } = await serviceClient
    .from('landlink_hunt_requests')
    .select('*, landlink_parcels!inner(owner_id, name, price_cents, price_unit)')
    .eq('id', request_id).single();

  if (!hr) return res.status(404).json({ error: 'Request not found' });
  if (hr.hunter_id !== user.id) return res.status(403).json({ error: 'Not the hunter for this request' });
  if (hr.status !== 'approved') return res.status(409).json({ error: `Request is ${hr.status}, not approved` });

  const parcel = hr.landlink_parcels;
  const accessFee = parcel.price_cents || 0;
  const isFree = parcel.price_unit === 'free';
  const serviceFee = isFree ? 1500 : Math.max(1500, Math.round(accessFee * 0.12)); // 12% min $15
  const totalCents = accessFee + serviceFee;

  // Calculate number of days for description
  const days = Math.max(1, Math.ceil((new Date(hr.date_to) - new Date(hr.date_from)) / 86400000));

  const lineItems = [];
  if (accessFee > 0) {
    lineItems.push({
      price_data: {
        currency: 'cad',
        product_data: { name: `Hunting access: ${parcel.name}`, description: `${hr.date_from} to ${hr.date_to} (${days} days)` },
        unit_amount: accessFee,
      },
      quantity: 1,
    });
  }
  lineItems.push({
    price_data: {
      currency: 'cad',
      product_data: { name: 'LandLink Trust & Safety Fee', description: 'Verification, insurance, and access agreement' },
      unit_amount: serviceFee,
    },
    quantity: 1,
  });

  // Get or create landowner Stripe Connect account
  const { data: ownerProfile } = await serviceClient
    .from('landlink_profiles').select('stripe_account_id').eq('user_id', parcel.owner_id).single();

  const sessionParams = {
    mode: 'payment',
    currency: 'cad',
    line_items: lineItems,
    success_url: `${BASE}/en/landlink/dashboard?payment=success&request=${request_id}`,
    cancel_url: `${BASE}/en/landlink/dashboard?payment=cancelled&request=${request_id}`,
    metadata: { request_id, hunter_id: user.id, parcel_id: hr.parcel_id },
    payment_intent_data: {
      metadata: { request_id, hunter_id: user.id, parcel_id: hr.parcel_id },
    }
  };

  // If landowner has Stripe Connect, use it for split payment
  if (ownerProfile?.stripe_account_id && accessFee > 0) {
    sessionParams.payment_intent_data.transfer_data = {
      destination: ownerProfile.stripe_account_id,
      amount: Math.round(accessFee * 0.97), // Landowner gets 97% of access fee (3% platform commission)
    };
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store payment intent reference
    await serviceClient.from('landlink_hunt_requests').update({
      total_cents: totalCents,
      stripe_session_id: session.id
    }).eq('id', request_id);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe session error:', err);
    return res.status(500).json({ error: 'Failed to create payment session' });
  }
}
