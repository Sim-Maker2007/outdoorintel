#!/usr/bin/env node
/**
 * One-off backfill (migration Phase 0/1): re-sync related_spots with reality.
 *
 * The legacy pages' "Nearby Spots" cards were generated from an older dataset;
 * data/*.json's related_spots was edited afterwards and now references slugs
 * that don't exist as spots (e.g. muskoka-lakes -> lake-joseph). Rendering
 * from the data would silently drop ~200 pages' internal-link blocks — an SEO
 * regression. This harvests the card links actually rendered on each EN page,
 * keeps only slugs that resolve to real spots, and writes them back to
 * related_spots so the templated pages reproduce today's link graph exactly.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const ACTIVITIES = ['fishing', 'hunting', 'camping', 'hiking', 'kayaking', 'skiing'];

const datasets = {};
const exists = new Set();
for (const act of ACTIVITIES) {
  datasets[act] = JSON.parse(readFileSync(join(REPO, 'data', `${act}.json`), 'utf-8'));
  for (const s of datasets[act].spots) exists.add(`${act}/${s.slug}`);
}

let changed = 0;
let dropped = 0;
for (const act of ACTIVITIES) {
  for (const spot of datasets[act].spots) {
    const html = readFileSync(join(REPO, 'en', act, `${spot.slug}.html`), 'utf-8');
    const section = (html.match(/Nearby Spots<\/h2>[\s\S]*?<\/section>/) || [''])[0];
    const rendered = [...section.matchAll(new RegExp(`<a href="/en/${act}/([a-z0-9-]+)"`, 'g'))].map(m => m[1]);
    const resolvable = rendered.filter(slug => exists.has(`${act}/${slug}`));
    dropped += rendered.length - resolvable.length;
    if (JSON.stringify(resolvable) !== JSON.stringify(spot.related_spots || [])) {
      spot.related_spots = resolvable;
      changed++;
    }
  }
  writeFileSync(join(REPO, 'data', `${act}.json`), JSON.stringify(datasets[act], null, 2) + '\n');
}
console.log(`related_spots rewritten on ${changed} spots; ${dropped} rendered links pointed at nonexistent spots and were dropped`);
