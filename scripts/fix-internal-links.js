#!/usr/bin/env node
/**
 * Rewrites internal links that end in .html to clean, root-absolute URLs
 * (vercel.json has cleanUrls:true, so /page.html 308-redirects to /page —
 * this removes that hop from every click and crawl).
 *
 *   href="../../en/fishing/lake-superior.html" -> href="/en/fishing/lake-superior"
 *   href="index.html" (at root)               -> href="/"
 *
 * Only href attributes are touched; src/meta/schema URLs are left alone.
 * External and absolute (https://) links are ignored.
 *
 * Usage: node scripts/fix-internal-links.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'landlink' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (e.name.endsWith('.html')) out.push(p);
  }
}

const files = [];
walk(path.join(ROOT, 'en'), files);
walk(path.join(ROOT, 'fr'), files);
files.push(path.join(ROOT, 'index.html'), path.join(ROOT, '404.html'));

function toClean(abs) {
  let u = abs.replace(/\.html$/, '');
  if (u === '/index') u = '/';
  if (u.endsWith('/index')) u = u.slice(0, -'index'.length);
  return u;
}

let linkCount = 0, fileCount = 0, external = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const pageDir = '/' + path.relative(ROOT, path.dirname(file)).replace(/\\/g, '/');

  html = html.replace(/href="([^"#?]+\.html)([#?][^"]*)?"/g, (m, target, suffix) => {
    if (/^(https?:)?\/\//.test(target)) {
      // internal absolute links to our own domain can be cleaned too
      const own = target.match(/^https?:\/\/(www\.)?outdoorintel\.ca(\/[^"]*)$/);
      if (!own) { external++; return m; }
      linkCount++;
      return `href="https://outdoorintel.ca${toClean(own[2])}${suffix || ''}"`;
    }
    let abs;
    if (target.startsWith('/')) abs = target;
    else abs = path.posix.normalize(path.posix.join(pageDir === '/.' ? '/' : pageDir, target));
    if (abs.includes('..')) return m; // escaped the site root — leave it
    linkCount++;
    return `href="${toClean(abs)}${suffix || ''}"`;
  });

  if (html !== before) {
    fs.writeFileSync(file, html);
    fileCount++;
  }
}

console.log(`links cleaned: ${linkCount} across ${fileCount} files (external left: ${external})`);
