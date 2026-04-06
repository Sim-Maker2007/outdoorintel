// POST /api/landlink/hunt-requests/notify-new
// Called after a hunter submits a new hunt request.
// Sends email notification to the landowner.
//
// Body: { request_id }
// Auth: Supabase JWT

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = { runtime: 'nodejs' };

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'LandLink <noreply@outdoorintel.ca>';
const BASE = process.env.LANDLINK_PUBLIC_URL || 'https://landlink.outdoorintel.ca';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { request_id } = req.body || {};
  if (!request_id) return res.status(400).json({ error: 'request_id required' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  // Verify caller
  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  // Fetch the request with parcel info
  const serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: hr, error: hrErr } = await serviceClient
    .from('landlink_hunt_requests')
    .select('*, landlink_parcels!inner(owner_id, name)')
    .eq('id', request_id)
    .single();
  if (hrErr || !hr) return res.status(404).json({ error: 'Request not found' });

  // Get hunter profile
  const { data: hunterProfile } = await serviceClient
    .from('landlink_profiles').select('full_name').eq('user_id', hr.hunter_id).single();

  // Get landowner email
  const { data: ownerAuth } = await serviceClient.auth.admin.getUserById(hr.landlink_parcels.owner_id);
  const ownerEmail = ownerAuth?.user?.email;

  if (ownerEmail) {
    try {
      await resend.emails.send({
        from: FROM,
        to: [ownerEmail],
        subject: `New hunt request for ${hr.landlink_parcels.name}`,
        html: `<h2>New Hunt Request</h2>
          <p><strong>${hunterProfile?.full_name || 'A hunter'}</strong> has requested access to <strong>${hr.landlink_parcels.name}</strong>.</p>
          <ul>
            <li><strong>Dates:</strong> ${hr.date_from} to ${hr.date_to}</li>
            <li><strong>Party size:</strong> ${hr.party_size}</li>
            <li><strong>Weapon:</strong> ${hr.weapon}</li>
          </ul>
          ${hr.message ? `<p><em>"${hr.message}"</em></p>` : ''}
          <p><a href="${BASE}/en/landlink/dashboard" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Review in Dashboard</a></p>`
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }
  }

  return res.status(200).json({ ok: true });
}
