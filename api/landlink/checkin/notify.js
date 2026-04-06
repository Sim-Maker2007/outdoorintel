// POST /api/landlink/checkin/notify
// Sends check-in/check-out notification to the landowner.
// Body: { request_id, action: 'checkin'|'checkout', coords?: { lat, lng } }

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = { runtime: 'nodejs' };

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'LandLink <noreply@outdoorintel.ca>';
const BASE = process.env.LANDLINK_PUBLIC_URL || 'https://landlink.outdoorintel.ca';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { request_id, action, coords } = req.body || {};
  if (!request_id || !['checkin', 'checkout'].includes(action)) {
    return res.status(400).json({ error: 'request_id and action required' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: hr } = await serviceClient
    .from('landlink_hunt_requests')
    .select('*, landlink_parcels!inner(name, owner_id)')
    .eq('id', request_id).single();
  if (!hr) return res.status(404).json({ error: 'Request not found' });

  const { data: hunterProfile } = await serviceClient
    .from('landlink_profiles').select('full_name').eq('user_id', hr.hunter_id).single();

  const { data: ownerAuth } = await serviceClient.auth.admin.getUserById(hr.landlink_parcels.owner_id);
  const ownerEmail = ownerAuth?.user?.email;

  if (ownerEmail) {
    const hunterName = hunterProfile?.full_name || 'A hunter';
    const parcelName = hr.landlink_parcels.name;
    const time = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' });

    const isCheckin = action === 'checkin';
    const subject = isCheckin
      ? `${hunterName} has checked in at ${parcelName}`
      : `${hunterName} has checked out from ${parcelName}`;

    const coordsNote = isCheckin && coords
      ? `<p style="font-size:12px;color:#99918a">Approximate location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}</p>`
      : '';

    try {
      await resend.emails.send({
        from: FROM, to: [ownerEmail], subject,
        html: `<h2>${isCheckin ? 'Hunter Check-In' : 'Hunter Check-Out'}</h2>
          <p><strong>${hunterName}</strong> has ${isCheckin ? 'checked in at' : 'checked out from'} <strong>${parcelName}</strong>.</p>
          <p>Time: ${time}</p>
          ${coordsNote}
          ${!isCheckin ? '<p>Don\'t forget to leave a review for the hunter!</p>' : ''}
          <p><a href="${BASE}/en/landlink/dashboard" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none">View Dashboard</a></p>`
      });
    } catch (err) {
      console.error('Check-in email failed:', err);
    }
  }

  return res.status(200).json({ ok: true });
}
