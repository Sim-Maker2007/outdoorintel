// POST /api/hunt-requests/respond
// Landowner approves or declines a hunt request. On approval, generate access agreement PDF
// and email both parties.
//
// Body: { request_id: string, action: 'approve'|'decline', response?: string }
// Auth: uses the caller's Supabase JWT (passed in the Authorization header from the browser)

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = { runtime: 'nodejs' };

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'LandLink <noreply@outdoorintel.ca>';
const BASE = process.env.LANDLINK_PUBLIC_URL || 'https://landlink.outdoorintel.ca';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { request_id, action, response } = req.body || {};
  if (!request_id || !['approve','decline'].includes(action)) {
    return res.status(400).json({ error: 'request_id and action required' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  // Client bound to the caller's token so RLS applies
  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  // Fetch the request with RLS (only the parcel owner can read it)
  const { data: hr, error: hrErr } = await userClient
    .from('landlink_hunt_requests').select('*, landlink_parcels!inner(owner_id, name)')
    .eq('id', request_id).single();
  if (hrErr || !hr) return res.status(404).json({ error: 'Request not found or not yours' });
  if (hr.landlink_parcels.owner_id !== user.id) return res.status(403).json({ error: 'Not the parcel owner' });
  if (hr.status !== 'pending') return res.status(409).json({ error: `Request is ${hr.status}` });

  const newStatus = action === 'approve' ? 'approved' : 'declined';
  const { error: updErr } = await userClient
    .from('landlink_hunt_requests')
    .update({ status: newStatus, landowner_response: response || null, responded_at: new Date().toISOString() })
    .eq('id', request_id);
  if (updErr) return res.status(500).json({ error: updErr.message });

  // Send email notification to hunter
  try {
    // Get hunter email via service-role client
    const serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: hunterAuth } = await serviceClient.auth.admin.getUserById(hr.hunter_id);
    const hunterEmail = hunterAuth?.user?.email;
    const { data: hunterProfile } = await serviceClient.from('landlink_profiles').select('full_name').eq('user_id', hr.hunter_id).single();

    if (hunterEmail) {
      const parcelName = hr.landlink_parcels.name;
      if (action === 'approve') {
        await resend.emails.send({
          from: FROM, to: [hunterEmail],
          subject: `Your request for ${parcelName} was approved!`,
          html: `<h2>Request Approved</h2>
            <p>Great news! The landowner approved your request to hunt at <strong>${parcelName}</strong>.</p>
            <p>Dates: ${hr.date_from} to ${hr.date_to}</p>
            ${response ? `<p>Message from landowner: <em>"${response}"</em></p>` : ''}
            <p><a href="${BASE}/en/landlink/dashboard" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none">View Details</a></p>`
        });
      } else {
        await resend.emails.send({
          from: FROM, to: [hunterEmail],
          subject: `Update on your request for ${parcelName}`,
          html: `<h2>Request Declined</h2>
            <p>Unfortunately, the landowner declined your request for <strong>${parcelName}</strong>.</p>
            ${response ? `<p>Reason: <em>"${response}"</em></p>` : ''}
            <p><a href="${BASE}/en/landlink/parcels" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none">Browse Other Parcels</a></p>`
        });
      }
    }
  } catch (emailErr) {
    console.error('Email notification failed (non-blocking):', emailErr);
  }

  // TODO (Phase 3): on approve, generate PDF agreement via pdf-lib + store in Supabase Storage

  return res.status(200).json({ ok: true, status: newStatus });
}
