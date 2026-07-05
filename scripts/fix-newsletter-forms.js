#!/usr/bin/env node
/**
 * Rewires every legacy Mailchimp newsletter form (action="YOUR_MAILCHIMP_...")
 * to the working /api/newsletter/subscribe endpoint handled by
 * assets/js/newsletter.js. Also appends the site footer to pages that never
 * had one (trust pages).
 *
 * Usage: node scripts/fix-newsletter-forms.js
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

const FORM_RE = /<form([^>]*)action="YOUR_MAILCHIMP_FORM_ACTION_URL"([^>]*)>([\s\S]*?)<\/form>/g;

let formCount = 0, fileCount = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lang = rel.startsWith('fr/') ? 'fr' : 'en';

  html = html.replace(FORM_RE, (m, pre, post, inner, offset) => {
    formCount++;
    // dark section? (article CTA bands are bg-[#305e3c])
    const sectionStart = html.lastIndexOf('<section', offset);
    const sectionTag = sectionStart >= 0 ? html.slice(sectionStart, html.indexOf('>', sectionStart) + 1) : '';
    const onDark = sectionTag.includes('bg-[#305e3c]') || sectionTag.includes('bg-[#14251a]');

    let attrs = (pre + ' ' + post)
      .replace(/method="[^"]*"/g, '')
      .replace(/target="[^"]*"/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    // merge our hook class into any existing class attr
    if (/class="/.test(attrs)) attrs = attrs.replace(/class="/, 'class="js-newsletter-form ');
    else attrs += ' class="js-newsletter-form"';
    attrs += ` data-lang="${lang}"` + (onDark ? ' data-on-dark' : '');

    let body = inner
      .replace(/name="EMAIL"/g, 'name="email"')
      .replace(/name="b_mailchimp_honeypot"/g, 'name="website"');

    return `<form ${attrs}>${body}<p class="js-newsletter-msg text-xs mt-2 w-full"></p></form>`;
  });

  if (html.includes('js-newsletter-form') && !html.includes('assets/js/newsletter.js')) {
    html = html.replace('</body>', '<script defer src="/assets/js/newsletter.js?v=1"></script>\n</body>');
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    fileCount++;
  }
}

console.log(`forms rewired: ${formCount} across ${fileCount} files`);

// --- trust pages: add the footer they never had ------------------------------
// Reuse the language-matched footer already rendered into the blog listing.
for (const [rel, donor] of [['en/trust.html', 'en/blog.html'], ['fr/trust.html', 'fr/blog.html']]) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('footer data-oi-ds')) continue;
  const donorHtml = fs.readFileSync(path.join(ROOT, donor), 'utf8');
  const m = donorHtml.match(/<footer data-oi-ds[\s\S]*?<\/footer>/);
  if (!m) { console.warn(`no donor footer found in ${donor}`); continue; }
  html = html.replace('</body>', m[0] + '\n<script defer src="/assets/js/newsletter.js?v=1"></script>\n</body>');
  fs.writeFileSync(file, html);
  console.log(`footer added to ${rel}`);
}
