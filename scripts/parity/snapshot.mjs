#!/usr/bin/env node
/**
 * Parity baseline snapshotter (migration Phase 0).
 *
 * Walks every committed HTML page (root, en/, fr/) and records the
 * SEO-load-bearing signals per URL: title, meta description, robots,
 * canonical, hreflang set, og/twitter tags, geo metas, parsed JSON-LD,
 * GA4 presence, and a whitespace-normalized body-text checksum.
 * Also snapshots the sitemap.xml URL set and vercel.json redirects.
 *
 * Usage:
 *   node scripts/parity/snapshot.mjs                    -> scripts/parity/baseline.json
 *   node scripts/parity/snapshot.mjs --root=dist --out=/tmp/dist-snapshot.json
 *
 * The committed baseline.json is the frozen definition of "the site as it
 * is today"; scripts/parity/compare.mjs diffs any later build against it.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || true];
  })
);
const ROOT = args.root ? join(REPO, String(args.root)) : REPO;
const OUT = args.out ? String(args.out) : join(REPO, 'scripts', 'parity', 'baseline.json');

// Directories that are not part of the deployed main site's page set.
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'landlink', 'content', 'api', 'scripts', 'db',
  'docs', 'assets', 'data', 'dist', 'src', 'public', '.astro', '.vercel',
]);

function* walkHtml(dir, base) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (dir === base && SKIP_DIRS.has(name)) continue;
      yield* walkHtml(full, base);
    } else if (name.endsWith('.html')) {
      yield full;
    }
  }
}

function toUrl(relPath) {
  let p = '/' + relPath.replace(/\\/g, '/');
  if (p.endsWith('/index.html')) return p.slice(0, -'index.html'.length);
  return p.replace(/\.html$/, '');
}

const metaRe = /<meta\s+([^>]*?)\/?>(?:<\/meta>)?/gi;
const linkRe = /<link\s+([^>]*?)\/?>(?:<\/link>)?/gi;

function attrs(tag) {
  const out = {};
  const re = /([a-zA-Z:._-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[2];
  return out;
}

function snapshotPage(html) {
  const rec = {};
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  rec.title = title ? title[1].trim() : null;

  rec.meta = {};
  rec.og = {};
  rec.twitter = {};
  rec.geo = {};
  let m;
  metaRe.lastIndex = 0;
  while ((m = metaRe.exec(html))) {
    const a = attrs(m[1]);
    const key = a.name || a.property;
    if (!key) continue;
    if (key.startsWith('og:')) rec.og[key] = a.content;
    else if (key.startsWith('twitter:')) rec.twitter[key] = a.content;
    else if (key.startsWith('geo.') || key === 'ICBM' || key === 'icbm') rec.geo[key] = a.content;
    else if (['description', 'robots', 'theme-color'].includes(key)) rec.meta[key] = a.content;
  }

  rec.canonical = null;
  rec.hreflang = {};
  linkRe.lastIndex = 0;
  while ((m = linkRe.exec(html))) {
    const a = attrs(m[1]);
    if (a.rel === 'canonical') rec.canonical = a.href;
    if (a.rel === 'alternate' && a.hreflang) rec.hreflang[a.hreflang] = a.href;
  }

  rec.jsonld = [];
  const ldRe = /<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi;
  while ((m = ldRe.exec(html))) {
    try {
      rec.jsonld.push(JSON.parse(m[1]));
    } catch {
      rec.jsonld.push({ __unparseable: m[1].slice(0, 120) });
    }
  }

  rec.ga4 = html.includes('googletagmanager.com/gtag/js?id=G-QY8Q00962P');
  rec.lang = (html.match(/<html\s+lang="([^"]+)"/i) || [])[1] || null;
  rec.amazonLinks = (html.match(/https:\/\/www\.amazon\.ca\/s\?/g) || []).length;

  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ''])[1]
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  rec.bodyHash = createHash('sha256').update(body).digest('hex').slice(0, 16);
  rec.bodyChars = body.length;
  return rec;
}

const pages = {};
let count = 0;
for (const file of walkHtml(ROOT, ROOT)) {
  const rel = relative(ROOT, file);
  const url = toUrl(rel);
  pages[url] = snapshotPage(readFileSync(file, 'utf-8'));
  count++;
}

const snapshot = { generated_for: relative(REPO, ROOT) || '.', page_count: count, pages: sortObj(pages) };

// Sitemap URL set (from the source tree, not the build)
const sitemapPath = join(REPO, 'sitemap.xml');
if (existsSync(sitemapPath)) {
  const sm = readFileSync(sitemapPath, 'utf-8');
  snapshot.sitemap = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]).sort();
}

// Redirects contract from vercel.json
const vercel = JSON.parse(readFileSync(join(REPO, 'vercel.json'), 'utf-8'));
snapshot.redirects = vercel.redirects || [];
snapshot.rewrites = vercel.rewrites || [];

function sortObj(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : 1)));
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(snapshot, null, 1) + '\n');
console.log(`snapshot: ${count} pages -> ${relative(REPO, OUT)}`);
if (snapshot.sitemap) console.log(`sitemap: ${snapshot.sitemap.length} URLs`);
