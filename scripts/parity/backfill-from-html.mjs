#!/usr/bin/env node
/**
 * One-off backfill (migration Phase 0): make data/*.json the single source
 * of truth for everything the committed HTML currently knows that the data
 * files don't.
 *
 * 1. noindex flags: NOINDEXED_SPOTS.md's table + the robots meta in the
 *    rendered HTML both mark 154 thin spots. Persist `noindex`,
 *    `noindex_reason`, `noindexed_at` on each spot record so templates,
 *    sitemap generation, and Scout can key off the data alone.
 *
 * 2. Legacy structured-data text: each spot page's TouristAttraction JSON-LD
 *    carries a `description` and `keywords` generated from field values that
 *    predate the content-rewrite batches — not reproducible from today's
 *    data. Harvest them verbatim as `schema_description` / `schema_keywords`
 *    so the Astro templates can emit byte-identical structured data. The
 *    data-quality track replaces them with text derived from verified fields.
 *
 * Also verifies (report only): title/meta-description formulas, EN/FR JSON-LD
 * agreement, and MD-table vs HTML-robots consistency.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ACTIVITIES = ['fishing', 'hunting', 'camping', 'hiking', 'kayaking', 'skiing'];

// --- Parse NOINDEXED_SPOTS.md table -> {activity/slug: {reason, date}} ---
const md = readFileSync(join(REPO, 'NOINDEXED_SPOTS.md'), 'utf-8');
const mdEntries = new Map();
for (const line of md.split('\n')) {
  const m = line.match(/^\|\s*(\w+)\s*\|\s*([\w-]+)\s*\|\s*(.+?)\s*\|\s*([\d-]+)\s*\|$/);
  if (m && m[1] !== 'Activity') mdEntries.set(`${m[1]}/${m[2]}`, { reason: m[3], date: m[4] });
}
console.log(`NOINDEXED_SPOTS.md entries: ${mdEntries.size}`);

const report = { noindexSet: 0, harvested: 0, mdOnly: [], htmlOnly: [], titleMismatch: [], descMismatch: [], frLdDiff: [] };

for (const act of ACTIVITIES) {
  const dataPath = join(REPO, 'data', `${act}.json`);
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

  for (const spot of data.spots) {
    const enHtml = readFileSync(join(REPO, 'en', act, `${spot.slug}.html`), 'utf-8');
    const frHtml = readFileSync(join(REPO, 'fr', act, `${spot.slug}.html`), 'utf-8');

    // --- 1. noindex flag ---
    const htmlNoindex = /name="robots" content="noindex/.test(enHtml);
    const mdEntry = mdEntries.get(`${act}/${spot.slug}`);
    if (htmlNoindex && !mdEntry) report.htmlOnly.push(`${act}/${spot.slug}`);
    if (!htmlNoindex && mdEntry) report.mdOnly.push(`${act}/${spot.slug}`);
    if (htmlNoindex) {
      spot.noindex = true;
      spot.noindex_reason = mdEntry ? mdEntry.reason : 'noindexed in HTML; reason not recorded in NOINDEXED_SPOTS.md';
      if (mdEntry) spot.noindexed_at = mdEntry.date;
      report.noindexSet++;
    }

    // --- 2. harvest legacy JSON-LD description/keywords ---
    const ldm = enHtml.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":\["TouristAttraction[\s\S]*?)<\/script>/);
    if (ldm) {
      const ld = JSON.parse(ldm[1]);
      if (ld.description) spot.schema_description = ld.description;
      if (ld.keywords) spot.schema_keywords = ld.keywords;
      report.harvested++;

      // FR page should carry identical LD text (only url differs)
      const frLdm = frHtml.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":\["TouristAttraction[\s\S]*?)<\/script>/);
      if (frLdm) {
        const frLd = JSON.parse(frLdm[1]);
        if (frLd.description !== ld.description || frLd.keywords !== ld.keywords) {
          report.frLdDiff.push(`${act}/${spot.slug}`);
        }
      }
    }

    // --- 3. formula verification (report only) ---
    const title = (enHtml.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    if (title && !title.startsWith(`${spot.name} | `)) {
      report.titleMismatch.push(`${act}/${spot.slug}: "${title}"`);
    }
    const desc = (enHtml.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    if (desc && !desc.includes(spot.name)) {
      report.descMismatch.push(`${act}/${spot.slug}: "${(desc || '').slice(0, 80)}"`);
    }
  }

  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`updated data/${act}.json (${data.spots.length} spots)`);
}

console.log(`\nnoindex flags set: ${report.noindexSet}`);
console.log(`JSON-LD harvested: ${report.harvested}`);
for (const k of ['mdOnly', 'htmlOnly', 'frLdDiff', 'titleMismatch', 'descMismatch']) {
  console.log(`${k}: ${report[k].length}`);
  report[k].slice(0, 8).forEach(x => console.log(`  ${x}`));
}
