#!/usr/bin/env node
/**
 * Post-build step: make dist/ the COMPLETE site.
 *
 * Astro currently templates only the spot pages. Everything else — directory
 * pages, province hubs, guides, blog posts, misc pages, the root homepage,
 * assets/, data/ — is copied verbatim from the legacy trees. A legacy file is
 * skipped whenever the Astro build already produced that path (templated
 * pages win), so pages migrate incrementally with zero URL churn.
 *
 * vercel.json / package.json / scripts are intentionally NOT copied — they
 * are repo configuration, not site output.
 */
import { cpSync, existsSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(REPO, 'dist');

if (!existsSync(DIST)) {
  console.error('dist/ not found — run `astro build` first');
  process.exit(1);
}

// Whole directories copied as-is (no templated equivalents).
for (const dir of ['assets', 'data']) {
  cpSync(join(REPO, dir), join(DIST, dir), { recursive: true });
}

// Root-level site files.
const ROOT_FILES = ['index.html', '404.html', 'manifest.json', 'robots.txt', 'sitemap.xml', 'rss.xml', 'sw.js'];
for (const f of ROOT_FILES) {
  if (existsSync(join(REPO, f))) copyFileSync(join(REPO, f), join(DIST, f));
}

// Legacy language trees: copy every file the build didn't generate.
let copied = 0;
let skipped = 0;
function mergeTree(srcDir, outDir) {
  for (const name of readdirSync(srcDir)) {
    const src = join(srcDir, name);
    const out = join(outDir, name);
    if (statSync(src).isDirectory()) {
      mergeTree(src, out);
    } else if (existsSync(out)) {
      skipped++; // Astro-generated page wins
    } else {
      mkdirSync(dirname(out), { recursive: true });
      copyFileSync(src, out);
      copied++;
    }
  }
}
mergeTree(join(REPO, 'en'), join(DIST, 'en'));
mergeTree(join(REPO, 'fr'), join(DIST, 'fr'));

console.log(`merge-legacy: ${copied} legacy files copied, ${skipped} already templated`);
