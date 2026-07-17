#!/usr/bin/env node
/* Injects the Add-to-trip layer (assets/js/oi-plan.js) into every spot page
 * and directory page. Idempotent: skips files that already reference it.
 * Targets are identified by the presence of a spot card or a spot hero. */
const fs = require('fs');
const path = require('path');

const ROOTS = ['en', 'fr'];
const TAG = '<script defer src="/assets/js/oi-plan.js?v=1"></script>';

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = [];
ROOTS.forEach(r => { if (fs.existsSync(r)) walk(r, files); });
if (fs.existsSync('index.html')) files.push('index.html');

let injected = 0, skipped = 0, irrelevant = 0;
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('oi-plan.js')) { skipped++; continue; }
  if (!/class="[^"]*spot-card|class="[^"]*spot-hero|class="spot-hero/.test(html)) { irrelevant++; continue; }
  const idx = html.lastIndexOf('</body>');
  if (idx === -1) { irrelevant++; continue; }
  html = html.slice(0, idx) + TAG + '\n' + html.slice(idx);
  fs.writeFileSync(file, html);
  injected++;
}

console.log(`Injected: ${injected} | Already had it: ${skipped} | Not a spot/directory page: ${irrelevant} | Total scanned: ${files.length}`);
