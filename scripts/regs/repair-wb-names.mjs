#!/usr/bin/env node
/**
 * Repair numeric waterbody names in data/regulations/*.json.
 *
 * Waterbodies enumerated from grid master rows (rather than the dropdown)
 * have no combobox display name — the page echoes the raw id, which the
 * first harvest stored as the name. This re-reads ONLY the zone pages (2 per
 * zone) and rebuilds names from the master rows: each coordinate link's
 * immediately preceding text is the (child) lake name; the row's bold text
 * is the group name fallback. popupId − 1 = id_endro.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const BASE = 'https://peche.faune.gouv.qc.ca/regpec';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const decode = s => s
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));

function nameMap(html) {
  const out = new Map(); // id_endro -> name
  // walk master rows: bold group name, then coord links each preceded by the
  // specific lake's text (empty when the link belongs to the group itself)
  const rowRe = /<span class="gras">([^<]+)<\/span>([\s\S]*?)(?=<span class="gras">|<\/table>)/g;
  for (const row of html.matchAll(rowRe)) {
    const groupName = decode(row[1]).trim().replace(/[.,;]$/, '');
    const seg = row[2];
    for (const link of seg.matchAll(/(?:^|>)([^<>]*?)\(?\s*<a class="lien-coord" onclick="OuvrirPopUpCoords\((\d+)\);/g)) {
      const child = decode(link[1]).replace(/[(.,;:]+\s*$/, '').trim();
      const id = String(Number(link[2]) - 1);
      const name = child.length >= 4 ? child : groupName;
      if (!out.has(id)) out.set(id, name);
    }
  }
  return out;
}

const dir = join(REPO, 'data', 'regulations');
let renamed = 0, remaining = 0;
for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const doc = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
  const numeric = doc.waterbodies.filter(w => /^\d+$/.test(w.name.fr) || /^\d+$/.test(w.name.en));
  if (!numeric.length) continue;

  const frHtml = await fetch(`${BASE}/fr/info/reglements?id_zone=${doc.zone_id}`).then(r => r.text());
  await sleep(150);
  const enHtml = await fetch(`${BASE}/en/info/reglements?id_zone=${doc.zone_id}`).then(r => r.text());
  await sleep(150);
  const frNames = nameMap(frHtml);
  const enNames = nameMap(enHtml);

  for (const w of numeric) {
    const key = String(w.id_endro);
    const fr = frNames.get(key);
    const en = enNames.get(key);
    if (fr) {
      w.name = { fr, en: en || fr };
      renamed++;
    } else {
      remaining++;
    }
  }
  writeFileSync(join(dir, f), JSON.stringify(doc, null, 2) + '\n');
  console.log(`zone ${doc.zone_id}: ${numeric.length} numeric names, ${numeric.filter(w => !/^\d+$/.test(w.name.fr)).length} repaired`);
}
console.log(`renamed ${renamed}; unresolved ${remaining}`);
