#!/usr/bin/env node
/**
 * Match Québec fishing spots to their regulation zone — conservatively.
 *
 * A spot gets a reg_zone ONLY when it matches a waterbody the authority
 * itself lists in a harvested zone (data/regulations/zone-*.json): the match
 * requires name agreement AND coordinate proximity. No polygon guessing, no
 * nearest-zone inference — a wrong zone link is a regulation-accuracy
 * failure, so unmatched spots simply get no link.
 *
 * Writes reg_zone {zone_id, id_endro, matched_name, distance_km, matched_by}
 * onto matching spot records in data/fishing.json.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();

const norm = s => (s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\b(le|la|les|du|de|des|d|l|aux|au|a)\b/g, ' ')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// "Admac, Lac" -> "Lac Admac"; "Aigle, Lac de l'" -> "Lac de l'Aigle"
function naturalName(raw) {
  const m = String(raw).match(/^(.*?), ((?:Petit |Grand )?(?:Lac|Lacs|Étang|Etang|Rivière|Riviere|Réservoir|Reservoir|Baie)(?: .*)?)$/);
  if (!m) return raw;
  return m[2].endsWith("'") || m[2].endsWith('’') ? m[2] + m[1] : m[2] + ' ' + m[1];
}

function haversine(a, b) {
  const R = 6371, p = Math.PI / 180;
  const dLat = (b.lat - a.lat) * p, dLng = (b.lng - a.lng) * p;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Load every harvested regulation waterbody that has coordinates.
const regDir = join(REPO, 'data', 'regulations');
const regWbs = [];
for (const f of readdirSync(regDir).filter(f => f.endsWith('.json'))) {
  const doc = JSON.parse(readFileSync(join(regDir, f), 'utf-8'));
  for (const w of doc.waterbodies) {
    regWbs.push({
      zone_id: doc.zone_id,
      id_endro: w.id_endro,
      name: w.name.fr.split('(')[0].trim(),
      nname: norm(w.name.fr.split('(')[0]),
      coords: w.coordinates,
      hasRules: w.rules.fr.length > 0,
    });
  }
}

const dataPath = join(REPO, 'data', 'fishing.json');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
let matched = 0, cleared = 0;

for (const spot of data.spots) {
  delete spot.reg_zone; // recompute from scratch each run
  cleared++;
  if (!/quebec|québec/i.test(spot.province || '')) continue;
  if (!spot.coordinates) continue;

  const sname = norm(naturalName(spot.name));
  if (!sname) continue;

  let best = null;
  for (const w of regWbs) {
    const exact = w.nname === sname;
    const contains = !exact && (w.nname.includes(sname) || sname.includes(w.nname)) && Math.min(w.nname.length, sname.length) >= 5;
    if (!exact && !contains) continue;
    const d = w.coords ? haversine(spot.coordinates, { lat: w.coords.lat, lng: w.coords.lng }) : null;
    // gates: exact name within 25 km, partial name within 5 km; no coords on the
    // authority side -> exact name only (rare, keep it strict)
    const ok = exact ? (d == null || d <= 25) : (d != null && d <= 5);
    if (!ok) continue;
    const score = (exact ? 0 : 50) + (d ?? 30);
    if (!best || score < best.score) best = { w, d, exact, score };
  }

  if (best) {
    spot.reg_zone = {
      zone_id: best.w.zone_id,
      id_endro: best.w.id_endro,
      matched_name: best.w.name,
      matched_by: best.exact ? 'name' : 'name+coords',
      distance_km: best.d != null ? Math.round(best.d * 10) / 10 : null,
    };
    matched++;
  }
}

writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
console.log(`reg waterbodies with coords: ${regWbs.filter(w => w.coords).length}/${regWbs.length}`);
console.log(`matched ${matched} fishing spots to regulation zones`);
for (const s of data.spots.filter(s => s.reg_zone).slice(0, 15)) {
  console.log(`  ${s.slug} -> zone ${s.reg_zone.zone_id} (${s.reg_zone.matched_name}, ${s.reg_zone.matched_by}${s.reg_zone.distance_km != null ? ', ' + s.reg_zone.distance_km + ' km' : ''})`);
}
