// POST /api/landlink/notifications/send
// Internal-only email dispatcher using Resend.
// Called server-side from other API routes, or from client with service-role key.
//
// Body: { type, to, data }
// Types: request_new, request_approved, request_declined, review_prompt,
//        listing_approved, checkin, checkout, agreement_ready

import { Resend } from 'resend';

export const config = { runtime: 'nodejs' };

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'LandLink <noreply@outdoorintel.ca>';
const ADMIN = process.env.LANDLINK_ADMIN_EMAIL || 'admin@outdoorintel.ca';
const BASE = process.env.LANDLINK_PUBLIC_URL || 'https://landlink.outdoorintel.ca';

const templates = {
  request_new: (d) => ({
    subject: `New hunt request for ${d.parcel_name}`,
    html: `
      <h2>New Hunt Request</h2>
      <p><strong>${esc(d.hunter_name)}</strong> has requested access to <strong>${esc(d.parcel_name)}</strong>.</p>
      <ul>
        <li><strong>Dates:</strong> ${esc(d.date_from)} to ${esc(d.date_to)}</li>
        <li><strong>Party size:</strong> ${d.party_size}</li>
        <li><strong>Weapon:</strong> ${esc(d.weapon)}</li>
      </ul>
      ${d.message ? `<p><em>"${esc(d.message)}"</em></p>` : ''}
      <p><a href="${BASE}/en/landlink/dashboard" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View in Dashboard</a></p>
    `
  }),

  request_approved: (d) => ({
    subject: `Your request for ${d.parcel_name} was approved!`,
    html: `
      <h2>Request Approved</h2>
      <p>Great news! The landowner has approved your request to hunt at <strong>${esc(d.parcel_name)}</strong>.</p>
      <ul>
        <li><strong>Dates:</strong> ${esc(d.date_from)} to ${esc(d.date_to)}</li>
      </ul>
      ${d.response ? `<p>Landowner says: <em>"${esc(d.response)}"</em></p>` : ''}
      <p>Your access agreement will be available in your dashboard shortly.</p>
      <p><a href="${BASE}/en/landlink/dashboard" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Details</a></p>
    `
  }),

  request_declined: (d) => ({
    subject: `Update on your request for ${d.parcel_name}`,
    html: `
      <h2>Request Declined</h2>
      <p>Unfortunately, the landowner has declined your request for <strong>${esc(d.parcel_name)}</strong>.</p>
      ${d.response ? `<p>Reason: <em>"${esc(d.response)}"</em></p>` : ''}
      <p>Don't worry — there are plenty of other parcels available.</p>
      <p><a href="${BASE}/en/landlink/parcels" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Browse Parcels</a></p>
    `
  }),

  listing_approved: (d) => ({
    subject: `Your listing "${d.parcel_name}" is now live!`,
    html: `
      <h2>Listing Approved</h2>
      <p>Your parcel <strong>${esc(d.parcel_name)}</strong> has been reviewed and is now live on LandLink.</p>
      <p>Hunters can now discover and apply to your listing.</p>
      <p><a href="${BASE}/en/landlink/parcels/${esc(d.parcel_id)}" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Your Listing</a></p>
    `
  }),

  review_prompt: (d) => ({
    subject: `How was your experience at ${d.parcel_name}?`,
    html: `
      <h2>Leave a Review</h2>
      <p>Your hunt at <strong>${esc(d.parcel_name)}</strong> has been completed. We'd love to hear how it went!</p>
      <p>Your review helps build trust on the platform for both hunters and landowners.</p>
      <p><a href="${BASE}/en/landlink/parcels/${esc(d.parcel_id)}?review=1" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Leave a Review</a></p>
    `
  }),

  checkin: (d) => ({
    subject: `${d.hunter_name} has checked in at ${d.parcel_name}`,
    html: `
      <h2>Hunter Check-In</h2>
      <p><strong>${esc(d.hunter_name)}</strong> has checked in at <strong>${esc(d.parcel_name)}</strong>.</p>
      <p>Check-in time: ${esc(d.time)}</p>
      <p><a href="${BASE}/en/landlink/dashboard" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Dashboard</a></p>
    `
  }),

  checkout: (d) => ({
    subject: `${d.hunter_name} has checked out from ${d.parcel_name}`,
    html: `
      <h2>Hunter Check-Out</h2>
      <p><strong>${esc(d.hunter_name)}</strong> has checked out from <strong>${esc(d.parcel_name)}</strong>.</p>
      <p>Check-out time: ${esc(d.time)}</p>
      <p>Don't forget to leave a review!</p>
      <p><a href="${BASE}/en/landlink/parcels/${esc(d.parcel_id)}?review=1" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Leave a Review</a></p>
    `
  }),

  agreement_ready: (d) => ({
    subject: `Access agreement ready for ${d.parcel_name}`,
    html: `
      <h2>Access Agreement Ready</h2>
      <p>The access agreement for your booking at <strong>${esc(d.parcel_name)}</strong> is ready to review and sign.</p>
      <ul>
        <li><strong>Dates:</strong> ${esc(d.date_from)} to ${esc(d.date_to)}</li>
      </ul>
      <p><a href="${BASE}/en/landlink/dashboard" style="display:inline-block;padding:12px 24px;background:#2d5a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Review Agreement</a></p>
    `
  })
};

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function wrapHtml(inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#3e3127;max-width:600px;margin:0 auto;padding:24px">
${inner}
<hr style="border:none;border-top:1px solid #e8e4df;margin:32px 0 16px">
<p style="font-size:12px;color:#99918a">LandLink by OutdoorIntel &mdash; Canada's marketplace for private hunting access.<br>
<a href="${BASE}" style="color:#2d5a3d">landlink.outdoorintel.ca</a></p>
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, to, data } = req.body || {};
  if (!type || !to || !data) return res.status(400).json({ error: 'type, to, and data required' });

  const tmpl = templates[type];
  if (!tmpl) return res.status(400).json({ error: `Unknown template: ${type}` });

  const { subject, html } = tmpl(data);

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: wrapHtml(html)
    });
    return res.status(200).json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

// Export for use by other API routes (server-side)
export { templates, esc as escHtml, wrapHtml };
