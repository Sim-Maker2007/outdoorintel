// POST /api/bookings/respond
// Landowner approves or declines a booking. On approval we generate the
// counsel-style access agreement as a PDF, upload it to Supabase Storage,
// stamp booking.agreement_url, and email both parties via Resend.
//
// Body: { booking_id: string, action: 'approve'|'decline', response?: string }
// Auth: uses the caller's Supabase JWT (passed in the Authorization header)

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildAgreementPdf } from '../_lib/agreement.js';

export const config = { runtime: 'nodejs' };

const AGREEMENT_BUCKET = 'landlink-agreements';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { booking_id, action, response } = req.body || {};
  if (!booking_id || !['approve', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'booking_id and action required' });
  }

  // --- 1) Auth: user client bound to the caller's JWT so RLS applies ---
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  // --- 2) Fetch the booking + listing + parcel (RLS gate) ---
  const { data: booking, error: bookErr } = await userClient
    .from('landlink_bookings')
    .select(`
      *,
      landlink_listings!inner(id,title,category,activity_code,rules,config),
      landlink_parcels!inner(id,name,municipality,province,acres,house_rules,owner_id)
    `)
    .eq('id', booking_id)
    .single();
  if (bookErr || !booking) return res.status(404).json({ error: 'Booking not found or not yours' });
  if (booking.owner_id !== user.id) return res.status(403).json({ error: 'Not the parcel owner' });
  if (booking.status !== 'pending') return res.status(409).json({ error: `Booking is ${booking.status}` });

  // --- 3) Update the status (RLS-respecting) ---
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

  if (action !== 'approve') return res.status(200).json({ ok: true, status: newStatus });

  // --- 4) From here on, generating the agreement is best-effort. If it
  //        fails we still report the approval succeeded so the user isn't
  //        stuck — but we log the failure on the booking for retry.
  try {
    // Use service role so we can (a) read profiles, (b) write to Storage,
    // (c) stamp the booking with the agreement URL.
    const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: host }, { data: guest }] = await Promise.all([
      svc.from('landlink_profiles').select('user_id,full_name,province').eq('user_id', booking.owner_id).single(),
      svc.from('landlink_profiles').select('user_id,full_name,province').eq('user_id', booking.guest_id).single()
    ]);

    const pdfBytes = await buildAgreementPdf({
      booking,
      listing: booking.landlink_listings,
      parcel:  booking.landlink_parcels,
      host, guest
    });

    // Upload (make sure the 'landlink-agreements' bucket exists in Supabase)
    const objectPath = `${booking_id}/agreement-${Date.now()}.pdf`;
    const { error: upErr } = await svc.storage
      .from(AGREEMENT_BUCKET)
      .upload(objectPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    // Signed URL that both parties can use for 30 days
    const { data: signed, error: signErr } = await svc.storage
      .from(AGREEMENT_BUCKET)
      .createSignedUrl(objectPath, 60 * 60 * 24 * 30);
    if (signErr) throw new Error(`Signed URL failed: ${signErr.message}`);

    await svc.from('landlink_bookings')
      .update({ agreement_url: signed.signedUrl, agreement_signed_at: new Date().toISOString() })
      .eq('id', booking_id);

    // Email both parties via Resend (best-effort)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data: guestAuth } = await svc.auth.admin.getUserById(booking.guest_id);
      const { data: hostAuth }  = await svc.auth.admin.getUserById(booking.owner_id);
      const subject = `Your LandLink booking is confirmed — ${booking.landlink_parcels.name}`;
      const html = `
        <p>Your LandLink booking for <b>${booking.landlink_parcels.name}</b> has been approved.</p>
        <p><b>Dates:</b> ${booking.date_from} &rarr; ${booking.date_to}<br>
           <b>Activity:</b> ${booking.landlink_listings.title || booking.landlink_listings.category}<br>
           <b>Party size:</b> ${booking.party_size}</p>
        <p>Your access agreement is attached and available at <a href="${signed.signedUrl}">this link</a> for 30 days.</p>
        <p>&mdash; LandLink</p>
      `;
      await Promise.allSettled([
        guestAuth?.user?.email && resend.emails.send({
          from: 'LandLink <no-reply@landlink.outdoorintel.ca>',
          to: guestAuth.user.email, subject, html
        }),
        hostAuth?.user?.email && resend.emails.send({
          from: 'LandLink <no-reply@landlink.outdoorintel.ca>',
          to: hostAuth.user.email, subject, html
        })
      ]);
    }

    return res.status(200).json({ ok: true, status: newStatus, agreement_url: signed.signedUrl });
  } catch (err) {
    console.error('agreement generation failed', err);
    // Approval is committed; just surface the secondary failure
    return res.status(200).json({
      ok: true,
      status: newStatus,
      warning: 'Approved, but the access agreement could not be generated: ' + err.message
    });
  }
}
