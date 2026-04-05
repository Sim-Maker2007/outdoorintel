// POST /api/hunt-requests/respond
// Landowner approves or declines a hunt request. On approval, generate access agreement PDF
// and email both parties.
//
// Body: { request_id: string, action: 'approve'|'decline', response?: string }
// Auth: uses the caller's Supabase JWT (passed in the Authorization header from the browser)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

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

  // TODO (Phase 2 stub): on approve, generate PDF agreement via pdf-lib + store in Supabase Storage,
  // then send emails via Resend. Left as a stub so the MVP can ship manually first.
  // if (action === 'approve') await generateAndEmailAgreement(hr);

  return res.status(200).json({ ok: true, status: newStatus });
}
