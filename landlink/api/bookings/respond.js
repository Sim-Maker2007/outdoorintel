// POST /api/bookings/respond
// Landowner approves or declines a booking. On approval we'll (eventually)
// generate the counsel-reviewed access agreement and email both parties.
//
// Body: { booking_id: string, action: 'approve'|'decline', response?: string }
// Auth: uses the caller's Supabase JWT (passed in the Authorization header)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { booking_id, action, response } = req.body || {};
  if (!booking_id || !['approve', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'booking_id and action required' });
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

  // Fetch the booking; RLS ensures only participants can read it
  const { data: booking, error: bookErr } = await userClient
    .from('landlink_bookings')
    .select('*, landlink_listings!inner(title,category), landlink_parcels!inner(name,owner_id)')
    .eq('id', booking_id)
    .single();
  if (bookErr || !booking) return res.status(404).json({ error: 'Booking not found or not yours' });

  if (booking.owner_id !== user.id) return res.status(403).json({ error: 'Not the parcel owner' });
  if (booking.status !== 'pending') return res.status(409).json({ error: `Booking is ${booking.status}` });

  const newStatus = action === 'approve' ? 'approved' : 'declined';
  const { error: updErr } = await userClient
    .from('landlink_bookings')
    .update({
      status: newStatus,
      host_response: response || null,
      responded_at: new Date().toISOString()
    })
    .eq('id', booking_id);
  if (updErr) return res.status(500).json({ error: updErr.message });

  // TODO (Phase 2): on approve, generate counsel-reviewed access agreement PDF
  // via pdf-lib, upload to Supabase Storage, stamp booking.agreement_url, and
  // send both parties the signing email via Resend. Stub'd for now so the
  // foundation ships cleanly.
  // if (action === 'approve') await generateAndEmailAgreement(booking);

  return res.status(200).json({ ok: true, status: newStatus });
}
