#!/usr/bin/env node
/**
 * Parity gate: diff a built dist/ against the committed Phase-0 baseline.
 *
 * Hard signals (must match, or the migration regressed SEO):
 *   URL inventory, title, meta description, robots, canonical, hreflang set,
 *   og/twitter tags, geo metas, JSON-LD (structural), GA4 presence, html lang.
 * Soft signals (reported, reviewed by hand):
 *   body-text checksum, amazon link counts.
 *
 * Usage:
 *   node scripts/parity/compare.mjs           # strict: exit 1 on hard diffs
 *   node scripts/parity/compare.mjs --warn    # report only (used in `npm run build`)
 *   node scripts/parity/compare.mjs --show-body-diff=/en/fishing/lake-superior
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WARN = process.argv.includes('--warn');
const showBodyDiff = (process.argv.find(a => a.startsWith('--show-body-diff=')) || '').split('=')[1];

// Snapshot the built site with the exact same recorder as the baseline.
const distSnapPath = join(REPO, 'dist', '.parity-snapshot.json');
execFileSync('node', [join(REPO, 'scripts', 'parity', 'snapshot.mjs'), '--root=dist', `--out=${distSnapPath}`], { stdio: 'inherit' });

const base = JSON.parse(readFileSync(join(REPO, 'scripts', 'parity', 'baseline.json'), 'utf-8'));
const dist = JSON.parse(readFileSync(distSnapPath, 'utf-8'));

// Intentional new URLs (e.g. the four FR pages the migration adds) live here.
const allowlistPath = join(REPO, 'scripts', 'parity', 'allowlist.json');
const allow = existsSync(allowlistPath) ? JSON.parse(readFileSync(allowlistPath, 'utf-8')) : { added_urls: [], explained: {} };

const baseUrls = new Set(Object.keys(base.pages));
const distUrls = new Set(Object.keys(dist.pages));

const missing = [...baseUrls].filter(u => !distUrls.has(u));
const added = [...distUrls].filter(u => !baseUrls.has(u) && !allow.added_urls.includes(u));

const HARD = ['title', 'canonical', 'ga4', 'lang'];
const HARD_OBJ = ['meta', 'og', 'twitter', 'geo', 'hreflang', 'jsonld'];

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hardDiffs = [];
const bodyDiffs = [];
const amazonDiffs = [];

for (const url of baseUrls) {
  if (!distUrls.has(url)) continue;
  const b = base.pages[url];
  const d = dist.pages[url];
  const fields = [];
  for (const k of HARD) if (!eq(b[k], d[k])) fields.push(k);
  for (const k of HARD_OBJ) if (!eq(b[k], d[k])) fields.push(k);
  const explained = allow.explained[url] || [];
  const real = fields.filter(f => !explained.includes(f));
  if (real.length) hardDiffs.push({ url, fields: real, b, d });
  if (b.bodyHash !== d.bodyHash) bodyDiffs.push(url);
  if (b.amazonLinks !== d.amazonLinks) amazonDiffs.push(`${url} (${b.amazonLinks} -> ${d.amazonLinks})`);
}

console.log('\n=== PARITY REPORT ===');
console.log(`pages: baseline ${baseUrls.size}, dist ${distUrls.size}`);
console.log(`missing URLs: ${missing.length}`);
missing.slice(0, 10).forEach(u => console.log(`  MISSING ${u}`));
console.log(`unexpected added URLs: ${added.length}`);
added.slice(0, 10).forEach(u => console.log(`  ADDED ${u}`));
console.log(`hard-signal diffs: ${hardDiffs.length}`);
for (const h of hardDiffs) console.log(`  ${h.url}: ${h.fields.join(', ')}`);
for (const h of hardDiffs.slice(0, 6)) {
  console.log(`  -- ${h.url}`);
  for (const f of h.fields.slice(0, 3)) {
    const bv = JSON.stringify(h.b[f]); const dv = JSON.stringify(h.d[f]);
    if ((bv || '').length < 400) console.log(`     base: ${bv}\n     dist: ${dv}`);
  }
}
console.log(`body-text diffs (soft, review): ${bodyDiffs.length}`);
bodyDiffs.slice(0, 15).forEach(u => console.log(`  body ${u}`));
console.log(`amazon-link count diffs (soft): ${amazonDiffs.length}`);
amazonDiffs.slice(0, 8).forEach(x => console.log(`  ${x}`));

if (showBodyDiff) {
  // Re-derive normalized body text for one page from both trees and diff it.
  const norm = (html) => html
    .replace(/^[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&(amp|lt|gt|quot|nbsp|rarr|mdash|deg|copy|bull|eacute|egrave|agrave|ccedil|ecirc|rsquo|hellip);/g,
      (m, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', rarr: '→', mdash: '—', deg: '°', copy: '©', bull: '•', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', ecirc: 'ê', rsquo: '’', hellip: '…' }[n] || m))
    .replace(/\s+/g, ' ').trim();
  const rel = showBodyDiff.replace(/^\//, '') + '.html';
  const a = norm(readFileSync(join(REPO, rel), 'utf-8')).split(' ');
  const c = norm(readFileSync(join(REPO, 'dist', rel), 'utf-8')).split(' ');
  let i = 0;
  while (i < Math.min(a.length, c.length) && a[i] === c[i]) i++;
  console.log(`\nbody diff for ${showBodyDiff} at word ${i}:`);
  console.log('  legacy:', a.slice(Math.max(0, i - 8), i + 15).join(' '));
  console.log('  dist:  ', c.slice(Math.max(0, i - 8), i + 15).join(' '));
}

const failed = missing.length || added.length || hardDiffs.length;
if (failed && !WARN) {
  console.log('\nPARITY: FAIL');
  process.exit(1);
}
console.log(failed ? '\nPARITY: DIFFS PRESENT (warn mode)' : '\nPARITY: OK');
