// POST /api/landlink/payments/connect-onboard
// Creates a Stripe Connect Express account for a landowner and returns
// the onboarding URL. Called from the landowner's profile page.
//
// Auth: Supabase JWT (must be a landowner)

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const config = { runtime: 'nodejs' };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BASE = process.env.LANDLINK_PUBLIC_URL || 'https://landlink.outdoorintel.ca';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await serviceClient
    .from('landlink_profiles').select('role, stripe_account_id, full_name')
    .eq('user_id', user.id).single();

  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (!['landowner', 'both', 'admin'].includes(profile.role)) {
    return res.status(403).json({ error: 'Must be a landowner to set up payouts' });
  }

  let accountId = profile.stripe_account_id;

  // Create Stripe Connect Express account if none exists
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CA',
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_type: 'individual',
      metadata: { landlink_user_id: user.id },
    });
    accountId = account.id;

    await serviceClient.from('landlink_profiles').update({
      stripe_account_id: accountId
    }).eq('user_id', user.id);
  }

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${BASE}/en/landlink/profile?stripe=refresh`,
    return_url: `${BASE}/en/landlink/profile?stripe=complete`,
    type: 'account_onboarding',
  });

  return res.status(200).json({ url: accountLink.url });
}
