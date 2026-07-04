#!/usr/bin/env node
/*
 * inject-community-intel.js
 * Replaces the legacy anonymous "Community Tips" comment section + its inline
 * Supabase IIFE on every spot page with the Phase-1 Community Intel container
 * (structured trip reports / photos / votes / corrections), served by the
 * shared script assets/js/community-intel.js.
 *
 * Idempotent: pages already carrying <div id="ci-root"> are skipped.
 *
 * Usage:
 *   node scripts/inject-community-intel.js            # all spot pages (en + fr)
 *   node scripts/inject-community-intel.js <files...> # only the given files
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ACTIVITIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
// Version query busts the immutable /assets/* cache (vercel.json). Bump on change.
const SHARED_SRC = '/assets/js/community-intel.js?v=1';

function walkSpotPages() {
  const out = [];
  for (const lang of ['en', 'fr']) {
    for (const act of ACTIVITIES) {
      const dir = path.join(ROOT, lang, act);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.html')) continue;
        if (f === 'directory.html' || f === 'index.html') continue;
        out.push(path.join(dir, f));
      }
    }
  }
  return out;
}

// Find <section ...id="community"> ... </section> honoring nested <section>.
function findCommunitySection(html) {
  const idIdx = html.indexOf('id="community"');
  if (idIdx === -1) return null;
  const start = html.lastIndexOf('<section', idIdx);
  if (start === -1) return null;
  const re = /<section\b|<\/section>/gi;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    if (m[0].toLowerCase().startsWith('<section')) depth++;
    else { depth--; if (depth === 0) return {start, end: m.index + m[0].length}; }
  }
  return null;
}

// Remove the inline <script> block that wired the old comment form.
function stripLegacyScript(html) {
  const re = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
  return html.replace(re, (block) =>
    /getElementById\(['"]comment-form['"]\)/.test(block) ? '' : block);
}

function extractName(html) {
  const m = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, 80);
}

function meta(file, html) {
  const rel = path.relative(ROOT, file).split(path.sep);
  const lang = rel[0] === 'fr' ? 'fr' : 'en';
  let act = rel[1];
  let slug = path.basename(file, '.html');
  const am = html.match(/var\s+ACT\s*=\s*'([^']+)'/);
  const sm = html.match(/var\s+SPOT\s*=\s*'([^']+)'/);
  if (am) act = am[1];
  if (sm) slug = sm[1];
  return {lang, act, slug, name: extractName(html)};
}

function newSection({lang, act, slug, name}) {
  const attr = (s) => String(s).replace(/"/g, '&quot;');
  const loading = lang === 'fr' ? 'Chargement de l’intel communautaire…' : 'Loading community intel…';
  return (
`        <section class="bg-white py-16 px-6" id="community">
            <div id="ci-root" data-activity="${attr(act)}" data-spot="${attr(slug)}" data-lang="${lang}" data-name="${attr(name)}">
                <div class="max-w-4xl mx-auto text-center py-8 text-[#6b6359]">${loading}</div>
            </div>
        </section>`);
}

function ensureSharedScript(html) {
  if (html.includes(SHARED_SRC)) return html;
  const tag = `    <script defer src="${SHARED_SRC}"></script>\n`;
  if (html.includes('</body>')) return html.replace('</body>', tag + '</body>');
  return html + '\n' + tag;
}

function processFile(file) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('id="ci-root"')) return 'skip';       // already migrated
  const sec = findCommunitySection(html);
  if (!sec) return 'nosection';
  const info = meta(file, html);
  html = html.slice(0, sec.start) + newSection(info) + html.slice(sec.end);
  html = stripLegacyScript(html);
  html = ensureSharedScript(html);
  fs.writeFileSync(file, html);
  return 'done';
}

function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const files = args.length ? args.map(a => path.resolve(a)) : walkSpotPages();
  const tally = {done: 0, skip: 0, nosection: 0};
  for (const f of files) {
    try { tally[processFile(f)]++; }
    catch (e) { console.error('ERROR', path.relative(ROOT, f), e.message); }
  }
  console.log(`Community Intel injected: ${tally.done} updated, ${tally.skip} already done, ${tally.nosection} without a community section.`);
}

main();
