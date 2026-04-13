// Generic access-agreement PDF generator for LandLink.
//
// Produces a counsel-style document that works for every activity on the
// platform (hunting, camping, dock, ATV, sugar shack, …). Activity-specific
// language comes from a small LOOKUP table below plus a per-province rider
// so the template is generic but the output is specific.
//
// Used server-side only (Vercel Function). Dependencies: pdf-lib.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// --- activity copy ------------------------------------------------------
// Keep this lean — full taxonomy lives in data/activities.json and is
// loaded in the browser. Server only needs the fields below for the PDF.
const ACTIVITY_COPY = {
  hunting: {
    title: 'Private Land Hunting Access Agreement',
    obligations: [
      'Hold a valid Possession and Acquisition Licence (PAL) at all times during the Access Period',
      'Hold all required provincial hunting licences, tags, stamps, and zone-specific permits',
      'Maintain active third-party liability insurance with a minimum coverage of $1,000,000 CAD',
      'Comply with the Firearms Act, the Criminal Code, the Migratory Birds Convention Act, and the provincial wildlife act',
      'Not consume alcohol or cannabis to the point of impairment while handling firearms'
    ],
    risks: 'Hunting is an inherently dangerous activity involving firearms, wildlife, unimproved terrain, and remote locations.'
  },
  camping: {
    title: 'Private Land Camping Access Agreement',
    obligations: [
      'Follow all posted fire restrictions and extinguish fires completely before leaving',
      'Pack out all refuse and leave no trace of the campsite',
      'Respect quiet hours and the landowner\u2019s stated capacity limits'
    ],
    risks: 'Camping on rural land involves exposure to wildlife, insects, weather, uneven terrain, and remote conditions.'
  },
  fishing: {
    title: 'Private Water Fishing Access Agreement',
    obligations: [
      'Hold a valid provincial angling licence',
      'Comply with posted catch, size, and release rules on the water body',
      'Clean watercraft and gear to prevent aquatic invasive species transfer'
    ],
    risks: 'Fishing involves exposure to water hazards, slippery terrain, and remote conditions.'
  },
  ice_fishing: {
    title: 'Ice Fishing Access Agreement',
    obligations: [
      'Hold a valid provincial angling licence',
      'Self-assess ice conditions before walking or driving on the ice',
      'Comply with posted catch limits and hut/shelter regulations'
    ],
    risks: 'Ice fishing involves risk of falling through ice, hypothermia, and remote-location exposure.'
  },
  dock_shoreline: {
    title: 'Dock and Shoreline Access Agreement',
    obligations: [
      'Hold a Pleasure Craft Operator Card where operating a motorised vessel',
      'Comply with Transport Canada boating regulations',
      'Wear personal flotation devices as required by law'
    ],
    risks: 'Water and dock access involves drowning, boat collision, and slippery-surface hazards.'
  },
  snowmobile: {
    title: 'Snowmobile Trail Access Agreement',
    obligations: [
      'Hold all required provincial snowmobile registration and trail permits',
      'Wear an approved helmet at all times while operating',
      'Stay on marked trails and respect posted speed limits'
    ],
    risks: 'Snowmobiling involves high-speed collision, cold exposure, and terrain hazards.'
  },
  atv_offroad: {
    title: 'Off-Road Vehicle Access Agreement',
    obligations: [
      'Hold all required provincial ATV registration, permits, and insurance',
      'Wear an approved helmet at all times while operating',
      'Stay on marked trails and respect posted width and speed limits'
    ],
    risks: 'ATV and side-by-side operation involves rollover, collision, and terrain hazards.'
  },
  xc_ski_snowshoe: {
    title: 'Cross-Country Ski and Snowshoe Access Agreement',
    obligations: [
      'Self-assess trail conditions and weather before setting out',
      'Carry appropriate winter safety gear',
      'Respect grooming and one-way trail markings'
    ],
    risks: 'Winter trail use involves cold exposure, falls, and avalanche or overflow hazards in some terrain.'
  },
  sugar_shack: {
    title: 'Sugar Shack Experience Agreement',
    obligations: [
      'Follow operator safety instructions around hot equipment and open flame',
      'Supervise children at all times',
      'Disclose any allergies before any food is served'
    ],
    risks: 'Sugar shacks involve burn, steam, and food-allergen hazards.'
  },
  farm_stay: {
    title: 'Farm Stay Access Agreement',
    obligations: [
      'Respect biosecurity protocols around livestock and crops',
      'Follow operator instructions around machinery and working animals',
      'Do not enter posted areas without permission'
    ],
    risks: 'Working farms involve livestock, machinery, electrified fencing, and biosecurity hazards.'
  },
  foraging: {
    title: 'Foraging Access Agreement',
    obligations: [
      'Pick only species the Hunter is trained to identify',
      'Respect stated quantity limits and commercial-use restrictions',
      'Do not disturb wildlife, nests, or rare plants'
    ],
    risks: 'Foraging involves misidentification, allergen, and wildlife-encounter hazards.'
  },
  dog_training: {
    title: 'Dog Training Grounds Agreement',
    obligations: [
      'Provide proof of current rabies and core vaccinations for each dog',
      'Clean up after dogs and respect fencing/containment limits',
      'Carry liability insurance covering dog activity'
    ],
    risks: 'Dog training grounds involve dog-on-dog and dog-on-wildlife interaction, and handler-injury hazards.'
  },
  archery_shooting: {
    title: 'Range and Shooting Access Agreement',
    obligations: [
      'Hold all required provincial firearms or archery credentials',
      'Follow posted safe-direction and cold-range rules at all times',
      'Carry third-party liability insurance'
    ],
    risks: 'Shooting activities involve projectile, firearm, and bystander-injury hazards.'
  },
  equestrian: {
    title: 'Equestrian Access Agreement',
    obligations: [
      'Provide proof of horse vaccination and coggins where required',
      'Respect posted trail widths and one-way sections',
      'Clean up after horses at tie-up and paddock areas'
    ],
    risks: 'Equestrian activity involves falls, kicks, bolting, and trail hazards.'
  },
  photography_film: {
    title: 'Photography and Film Location Agreement',
    obligations: [
      'Disclose any commercial intent and obtain written consent for it',
      'Hold appropriate production liability insurance',
      'Respect crew-size and drone restrictions stated in the listing'
    ],
    risks: 'Film and photo production on private land involves location, equipment, and crew-safety hazards.'
  },
  wellness_retreat: {
    title: 'Wellness and Retreat Access Agreement',
    obligations: [
      'Disclose any medical conditions that affect participation',
      'Respect silence, group, and facilitator protocols',
      'Follow operator instructions around shelter and natural features'
    ],
    risks: 'Wellness activities on rural land involve environmental, weather, and medical-event hazards.'
  },
  overlanding: {
    title: 'Overlanding and Off-Grid Access Agreement',
    obligations: [
      'Hold all required provincial vehicle registration and insurance',
      'Self-assess road, weather, and communications conditions before arrival',
      'Carry appropriate recovery and emergency gear'
    ],
    risks: 'Overlanding involves remote-location, vehicle, and self-rescue hazards.'
  }
};

// Minimal province rider — matches the clauses in the HTML template.
const PROVINCE_RIDER = {
  ON: 'Both parties acknowledge the Occupiers\u2019 Liability Act, R.S.O. 1990, c. O.2, specifically s. 4 (persons entering for recreational purposes on rural premises).',
  QC: 'This Agreement is subject to the Civil Code of Qu\u00e9bec. Waiver and assumption-of-risk provisions are interpreted restrictively (art. 1474 C.C.Q.). The Guest acknowledges having freely accepted the risks described herein within the meaning of art. 1477 C.C.Q.',
  BC: 'Both parties acknowledge the Occupiers Liability Act, R.S.B.C. 1996, c. 337, and the reduced duty of care under s. 3(3) for persons entering premises for recreational purposes.',
  AB: 'Both parties acknowledge the Occupiers\u2019 Liability Act, R.S.A. 2000, c. O-4, and the reduced duty of care under s. 5 for recreational users. The Landowner confirms compliance with the Petty Trespass Act by expressly authorizing the Guest\u2019s entry.',
  SK: 'Both parties acknowledge the Occupiers\u2019 Liability Act, S.S. 2004, c. O-1.1. Written landowner permission is required under Saskatchewan law; this Agreement constitutes that written permission.',
  MB: 'Both parties acknowledge the Occupiers\u2019 Liability Act, C.C.S.M. c. O8.',
  NB: 'Both parties acknowledge the Motorized Snow Vehicles Act and New Brunswick occupier-liability common law principles.',
  NS: 'Both parties acknowledge the Occupiers\u2019 Liability Act, S.N.S. 1996, c. 27, and the reduced duty of care for recreational users.',
  PE: 'Both parties acknowledge the Occupiers\u2019 Liability Act, R.S.P.E.I. 1988, c. O-2.',
  NL: 'Both parties acknowledge the Occupiers\u2019 Liability Act, R.S.N.L. 1990, c. O-2.',
  YT: 'Both parties acknowledge the Occupiers Liability Act, R.S.Y. 2002, c. 160.',
  NT: 'Both parties acknowledge applicable Northwest Territories occupier liability principles.',
  NU: 'Both parties acknowledge applicable Nunavut occupier liability principles.'
};

/**
 * Build a PDF buffer for an access agreement.
 * @param {object} ctx - { booking, listing, parcel, host, guest }
 * @returns {Promise<Uint8Array>}
 */
export async function buildAgreementPdf(ctx) {
  const { booking, listing, parcel, host, guest } = ctx;
  const copy = ACTIVITY_COPY[listing.category] || {
    title: `Private Land Access Agreement (${listing.category})`,
    obligations: [],
    risks: 'Outdoor activity on private land involves inherent environmental and physical hazards.'
  };
  const rider = PROVINCE_RIDER[parcel.province] || '';

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]); // US Letter
  const margin = 56;
  let y = 792 - margin;
  const maxWidth = 612 - 2 * margin;
  const lineHeight = 13;

  function newPage() {
    page = pdf.addPage([612, 792]);
    y = 792 - margin;
  }
  function ensureSpace(n) {
    if (y - n * lineHeight < margin) newPage();
  }
  function writeLine(text, fnt = font, size = 10, color = rgb(0.25, 0.2, 0.15)) {
    ensureSpace(1);
    page.drawText(text, { x: margin, y, size, font: fnt, color });
    y -= lineHeight;
  }
  function wrap(text, size = 10) {
    const words = (text || '').split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const candidate = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function writeParagraph(text, fnt = font, size = 10) {
    for (const l of wrap(text, size)) writeLine(l, fnt, size);
    y -= 4;
  }
  function writeHeading(text) {
    y -= 8;
    ensureSpace(2);
    writeLine(text, bold, 12);
    y -= 2;
  }

  // --- header ---
  writeLine(copy.title.toUpperCase(), bold, 14, rgb(0.18, 0.35, 0.24));
  y -= 4;
  writeLine(`Facilitated through LandLink (landlink.outdoorintel.ca).`, font, 9, rgb(0.42, 0.39, 0.35));
  writeLine(`Booking ID: ${booking.id}`, font, 9, rgb(0.42, 0.39, 0.35));
  writeLine(`Generated: ${new Date().toISOString().slice(0, 10)}`, font, 9, rgb(0.42, 0.39, 0.35));
  y -= 10;

  // --- parties ---
  writeHeading('Parties');
  writeParagraph(
    `LANDOWNER: ${host.full_name || 'Name on file'}, residing in ${host.province || parcel.province}.`
  );
  writeParagraph(
    `GUEST: ${guest.full_name || 'Name on file'}, residing in ${guest.province || 'Canada'}.`
  );
  writeParagraph(
    'LandLink is a marketplace intermediary and is not a party to this Agreement.'
  );

  // --- parcel + access period ---
  writeHeading('1. Grant of Access');
  writeParagraph(
    'The Landowner hereby grants the Guest a non-exclusive, non-transferable, revocable licence to enter the Parcel described below, solely for the activity described in Section 2, during the Access Period.'
  );
  writeParagraph(
    `Parcel: ${parcel.name} — ${parcel.municipality || ''} ${parcel.province}${parcel.acres ? `, approx. ${parcel.acres} acres` : ''}.`
  );
  writeParagraph(
    `Access Period: ${booking.date_from} to ${booking.date_to} (inclusive). Party size: ${booking.party_size}.`
  );

  // --- activity ---
  writeHeading('2. Permitted Activity');
  writeParagraph(
    `Activity: ${listing.title || listing.category}. The Guest shall not engage in any other use of the Parcel without the Landowner\u2019s prior written consent.`
  );

  // --- house rules ---
  if (parcel.house_rules || listing.rules) {
    writeHeading('3. House Rules');
    writeParagraph(listing.rules || parcel.house_rules || '—');
  }

  // --- payment ---
  writeHeading('4. Payment');
  if (booking.total_cents && booking.total_cents > 0) {
    writeParagraph(
      `The Guest agrees to pay CA$${(booking.total_cents / 100).toFixed(2)} for the Access Period (subtotal CA$${(booking.subtotal_cents / 100).toFixed(2)} plus 5% service fee). Payment is processed through the LandLink Platform. The Landowner receives CA$${(booking.host_payout_cents / 100).toFixed(2)} after the 15% host fee.`
    );
  } else {
    writeParagraph('Access is provided free of charge. No payment is due under this Agreement.');
  }
  writeParagraph(
    'Cancellation and refund terms are governed by the LandLink Cancellation & Dispute Resolution Policy.'
  );

  // --- activity-specific obligations ---
  writeHeading('5. Guest Obligations');
  writeParagraph('The Guest agrees to:');
  for (const ob of copy.obligations) writeParagraph(`\u2022 ${ob}`);
  for (const ob of [
    'Remain within the Parcel boundaries as shown on the LandLink map',
    'Check in via the Platform upon arrival and check out upon departure',
    'Not bring additional persons beyond the approved party size',
    'Remove all refuse and personal belongings',
    'Not damage property, fences, gates, crops, livestock, structures, or natural features',
    'Report any incidents, injuries, or property damage to the Landowner and LandLink promptly'
  ]) writeParagraph(`\u2022 ${ob}`);

  // --- landowner obligations ---
  writeHeading('6. Landowner Obligations');
  writeParagraph(
    'The Landowner agrees to provide accurate information about the Parcel; disclose known hazards; not revoke access during the Access Period without reasonable cause; maintain the Parcel in a condition consistent with its listing; and hold legal title (or written authorization from the legal owner) to grant access.'
  );

  // --- risk + indemnity ---
  writeHeading('7. Assumption of Risk');
  writeParagraph(copy.risks);
  writeParagraph(
    'The Guest has read the LandLink Liability & Assumption of Risk Policy and voluntarily assumes all risks, known and unknown, associated with entering the Parcel and engaging in the permitted activity.'
  );

  writeHeading('8. Indemnification');
  writeParagraph(
    'The Guest indemnifies the Landowner from claims arising out of the Guest\u2019s acts or omissions on the Parcel. The Landowner indemnifies the Guest from claims arising from failure to disclose known hazards or material misrepresentation of the Parcel. Both parties indemnify LandLink and OutdoorIntel from any claims arising from this Agreement or any activity on the Parcel.'
  );

  writeHeading('9. Limitation of Liability');
  writeParagraph(
    'TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. The Landowner\u2019s total liability shall not exceed the amount paid by the Guest for the Access Period. Nothing in this Agreement excludes liability for death or personal injury caused by gross negligence or wilful misconduct.'
  );

  // --- province rider ---
  if (rider) {
    writeHeading(`10. Provincial Rider — ${parcel.province}`);
    writeParagraph(rider);
  }

  // --- governing + disputes ---
  writeHeading('11. Dispute Resolution & Governing Law');
  writeParagraph(
    'Disputes shall first be submitted to the LandLink dispute-resolution process. Unresolved disputes shall be submitted to binding arbitration in the province where the Parcel is located. This Agreement is governed by the laws of that province and the federal laws of Canada applicable therein.'
  );

  // --- signatures ---
  writeHeading('12. Signatures');
  writeParagraph(
    `LANDOWNER: ${host.full_name || '—'} (${host.user_id.slice(0, 8)}) — signed electronically via LandLink on ${new Date().toISOString().slice(0, 10)}.`
  );
  writeParagraph(
    `GUEST: ${guest.full_name || '—'} (${guest.user_id.slice(0, 8)}) — signed electronically via LandLink on ${new Date().toISOString().slice(0, 10)}.`
  );

  return pdf.save();
}
