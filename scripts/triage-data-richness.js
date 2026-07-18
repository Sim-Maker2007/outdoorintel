#!/usr/bin/env node
/**
 * triage-data-richness.js
 *
 * Scores every spot on how much VERIFIABLE data exists to support a unique
 * page, per the content-uniqueness triage rule:
 *   REWRITE — enough real data for a full unique page (or high-value tier)
 *   SHORT   — enough for a short, honest, indexable page (no padding)
 *   NOINDEX — too thin: short honest stub + <meta robots noindex, follow>
 *
 * Signals (deliberately conservative, data-only):
 *   - coordinate precision (>=3 decimals ⇒ imported from a real dataset)
 *   - species/game/features list length
 *   - website specificity (a spot-specific URL beats a generic provincial page)
 *   - scout_level tier (Legendary/Elite/Pro are search-valuable ⇒ rewrite)
 *
 * Usage: node scripts/triage-data-richness.js [activity]
 * Writes scripts/rewrites/triage-report.json for downstream tooling.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ACTIVITIES = process.argv[2] ? [process.argv[2]]
  : ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];

const GENERIC_SITES = [
  '/page/fishing', 'peche-et-chasse/peche', 'fishing-hunting/fishing',
  'recreational-fishing', 'angling', 'services/fishing', 'fish.html',
  'novascotia.ca/fish', 'gov.nl.ca/ffa', 'environment', '/fish/',
  'peche-et-chasse/chasse', '/hunting', '/camping', '/parks',
];

function decimals(n) {
  const s = String(n);
  return s.includes('.') ? s.split('.')[1].length : 0;
}

const report = {};
const counts = {};
for (const act of ACTIVITIES) {
  const file = path.join(ROOT, 'data', `${act}.json`);
  if (!fs.existsSync(file)) continue;
  const spots = JSON.parse(fs.readFileSync(file, 'utf8')).spots;
  report[act] = [];
  counts[act] = { REWRITE: 0, SHORT: 0, NOINDEX: 0 };
  for (const s of spots) {
    const list = s.primary_species || s.primary_game || s.features || [];
    const precise = Math.max(decimals(s.coordinates?.lat ?? 0), decimals(s.coordinates?.lng ?? 0)) >= 3;
    const site = (s.website || '').toLowerCase();
    const specificSite = site && !GENERIC_SITES.some(g => site.includes(g));
    const tier = s.scout_level;

    let cls, why;
    if (['Legendary', 'Elite', 'Pro'].includes(tier)) {
      cls = 'REWRITE'; why = `tier=${tier}`;
    } else if (precise && list.length >= 4) {
      cls = 'REWRITE'; why = `precise coords + ${list.length} species/features`;
    } else if (precise && list.length >= 2) {
      cls = 'SHORT'; why = `precise coords + ${list.length} species/features`;
    } else if (specificSite && list.length >= 2) {
      cls = 'SHORT'; why = `specific website + ${list.length} items`;
    } else {
      cls = 'NOINDEX'; why = `rounded coords, ${list.length} item(s), generic links`;
    }
    counts[act][cls]++;
    report[act].push({ slug: s.slug, cls, why, tier, listLen: list.length, precise });
  }
}

for (const [act, c] of Object.entries(counts)) {
  console.log(`${act.padEnd(9)} REWRITE=${String(c.REWRITE).padStart(3)}  SHORT=${String(c.SHORT).padStart(3)}  NOINDEX=${String(c.NOINDEX).padStart(3)}`);
}
const out = path.join(__dirname, 'rewrites', 'triage-report.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\nwritten: ${path.relative(ROOT, out)}`);
const noindexed = Object.entries(report).flatMap(([a, r]) => r.filter(x => x.cls === 'NOINDEX').map(x => `${a}/${x.slug}`));
console.log(`NOINDEX candidates (${noindexed.length}):`);
console.log(noindexed.slice(0, 40).join('\n'));
