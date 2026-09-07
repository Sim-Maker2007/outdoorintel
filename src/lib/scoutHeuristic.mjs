// Deterministic Scout fallback when OpenRouter is not configured.
// Ranks the existing sourced-spot index — never invents places, seasons, or limits.

const CATS = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];

const ACT_RE = [
  ['fishing', /fish|p[eê]che|walleye|dor[eé]|trout|truite|bass|achigan|pike|brochet|omble|saumon|salmon|mouchet/i],
  ['hunting', /hunt|chasse|deer|cerf|moose|orignal|bear|ours|chevreuil/i],
  ['camping', /camp|tente|canoe|canot|backcountry/i],
  ['kayaking', /kayak|paddle|pagayer/i],
  ['skiing', /ski|snowboard|neige/i],
  ['hiking', /hik|randonn|trail|sentier/i],
];

const PROV_RE = [
  ['Quebec', /qu[eé]bec|outaouais|gatineau|montr[eé]al|laurentid|gasp[eé]|saguenay|qu[eé]bec\b/i],
  ['Ontario', /ontario|toronto|ottawa|algonquin|muskoka|nipissing|thunder bay/i],
  ['British Columbia', /british columbia|\bbc\b|vancouver|whistler|kootenay/i],
  ['Alberta', /alberta|calgary|banff|jasper|edmonton/i],
  ['Nova Scotia', /nova scotia|halifax|cape breton/i],
];

const SPECIES_RE = [
  ['walleye', /walleye|dor[eé]/i],
  ['brook trout', /brook trout|omble|mouchet/i],
  ['moose', /moose|orignal/i],
  ['deer', /deer|cerf|chevreuil/i],
  ['bass', /bass|achigan/i],
  ['pike', /pike|brochet/i],
];

export function parseScoutIntent(text) {
  const q = String(text || '');
  const activities = ACT_RE.filter(([, re]) => re.test(q)).map(([a]) => a);
  const provinceHit = PROV_RE.find(([, re]) => re.test(q));
  const speciesHit = SPECIES_RE.find(([, re]) => re.test(q));
  const terms = q.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(t => t.length > 2);
  return {
    activities: activities.filter(a => CATS.includes(a)),
    province: provinceHit ? provinceHit[0] : '',
    species: speciesHit ? speciesHit[0] : '',
    terms,
  };
}

function haversine(aLat, aLng, bLat, bLng) {
  const R = 6371, p = Math.PI / 180;
  const dLat = (bLat - aLat) * p, dLng = (bLng - aLng) * p;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function rankSpots(spots, intent, origin) {
  const acts = (intent.activities || []).filter(a => CATS.includes(a));
  let pool = Array.isArray(spots) ? spots.slice() : [];
  if (acts.length) pool = pool.filter(s => acts.includes(s.c));
  if (intent.province) {
    const p = String(intent.province).toLowerCase();
    const narrowed = pool.filter(s => String(s.p || '').toLowerCase().includes(p));
    if (narrowed.length) pool = narrowed;
  }
  const sp = String(intent.species || '').toLowerCase();
  const terms = intent.terms || [];
  const scored = pool.map(s => {
    let score = 1;
    const hay = (s.n + ' ' + s.p + ' ' + (s.sp || []).join(' ') + ' ' + (s.blurb || '')).toLowerCase();
    terms.forEach(t => { if (t.length > 2 && hay.indexOf(t) >= 0) score += 2; });
    if (sp && (s.sp || []).some(x => String(x).toLowerCase().includes(sp) || hay.includes(sp))) score += 5;
    if (intent.province && String(s.p || '').toLowerCase().includes(String(intent.province).toLowerCase())) score += 3;
    const d = origin && s.lat != null ? haversine(origin.lat, origin.lng, s.lat, s.lng) : null;
    if (d != null) score += Math.max(0, 8 - d / 80);
    return { s, score, d };
  });
  scored.sort((a, b) => b.score - a.score || (a.d == null ? 1e9 : a.d) - (b.d == null ? 1e9 : b.d));
  return scored.filter(o => o.score > 0).slice(0, 5).map(o => o.s);
}

export function assembleHeuristicPlan(ranked, intent, lang) {
  const fr = lang === 'fr';
  const stops = (ranked || []).slice(0, 5).map(s => ({
    slug: s.s,
    activity: s.c,
    name: s.n,
    province: s.p,
    coordinates: s.lat != null ? { lat: s.lat, lng: s.lng } : null,
    why: fr
      ? `Spot sourcé d’Outdoor Intel${s.p ? ' — ' + s.p : ''}. Confirmez les règlements sur la page du spot.`
      : `Sourced Outdoor Intel spot${s.p ? ' — ' + s.p : ''}. Confirm regulations on the spot page.`,
  }));
  const acts = [...new Set(stops.map(s => s.activity))];
  const title = fr
    ? (intent.province ? `Sortie ${acts[0] || 'plein air'} — ${intent.province}` : 'Une sortie à partir du registre')
    : (intent.province ? `${(acts[0] || 'Outdoor')} trip — ${intent.province}` : 'A trip from the sourced registry');
  const summary = fr
    ? 'Liste courte tirée du registre Outdoor Intel (spots sourcés uniquement). L’IA conversationnelle n’est pas configurée sur ce serveur — aucun lieu inventé.'
    : 'A shortlist from the Outdoor Intel registry (sourced spots only). Conversational Scout is not configured on this server — no invented places.';
  const notes = fr
    ? 'Confirmez saisons, permis et conditions sur chaque page de spot et sur les pages de règlements publiques. Outdoor Intel n’est pas une autorité juridique.'
    : 'Confirm seasons, licences, and conditions on each spot page and on the public regulation pages. Outdoor Intel is not a legal authority.';
  return { title, summary, notes, stops };
}
