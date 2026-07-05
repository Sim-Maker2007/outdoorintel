#!/usr/bin/env node
/**
 * Applies the new Outdoor Intel design system (dark-green "Clean Parks" look)
 * to every EN/FR page: replaces the legacy white header + green footer with
 * the new templates, remaps the old palette to the new one, and adds a
 * working newsletter signup to every footer.
 *
 * Idempotent: pages already carrying the new header (marker `data-oi-ds`)
 * are skipped for the header/footer swap; palette replaces are no-ops on
 * already-converted values.
 *
 * Usage: node scripts/apply-design-system.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Old palette -> new palette (applied to full file contents, incl. inline JS)
const PALETTE = [
  ['#2d5a3d', '#305e3c'], // primary green
  ['#c97c5e', '#3d7a4d'], // orange accent -> lighter green
  ['#fef9f3', '#f4f3ec'], // cream section bg
  ['#f5f3f0', '#fbfaf7'], // body bg
  ['#3e3127', '#1c2b21'], // dark text
  ['#6b6359', '#5c6b5f'], // muted text
];

const DS_STYLE = `<style id="oi-ds">.explore-dropdown{visibility:hidden;opacity:0;transform:translateY(6px);transition:opacity .15s ease,transform .15s ease,visibility .15s}.explore-group:hover .explore-dropdown,.explore-group:focus-within .explore-dropdown{visibility:visible;opacity:1;transform:translateY(0)}</style>`;

const NAV = {
  en: {
    explore: 'Explore', map: 'Map', planner: 'Trip Planner', blog: 'Blog',
    trust: 'Trust & sources', about: 'About', licenses: 'Licenses & regs',
    product: 'Product', aboutCol: 'About', exploreCol: 'Explore',
    blurb: 'Sourced outdoor data for better trips across Canada. Every spot is verified and cited.',
    nlLabel: 'Weekly intel, free', nlPlaceholder: 'Your email', nlBtn: 'Subscribe',
    nlHint: 'One email a week. No spam.',
    acts: [
      ['fishing', '🎣 Fishing', 'Fishing'], ['hunting', '🦌 Hunting', 'Hunting'],
      ['camping', '⛺ Camping', 'Camping'], ['kayaking', '🛶 Kayaking', 'Kayaking'],
      ['skiing', '⛷️ Skiing', 'Skiing'], ['hiking', '🥾 Hiking', 'Hiking'],
    ],
    home: '/', dirBase: '/en', mapHref: '/en/map', plannerHref: '/en/trip-planner',
    blogHref: '/en/blog', trustHref: '/en/trust', aboutHref: '/en/about', licensesHref: '/en/licenses',
    langSelf: 'EN', langOther: 'FR', otherLangAttr: 'fr',
  },
  fr: {
    explore: 'Explorer', map: 'Carte', planner: 'Planificateur', blog: 'Blogue',
    trust: 'Confiance et sources', about: 'À propos', licenses: 'Permis et règlements',
    product: 'Produit', aboutCol: 'À propos', exploreCol: 'Explorer',
    blurb: 'Des données de plein air sourcées pour de meilleures sorties partout au Canada. Chaque site est vérifié et cité.',
    nlLabel: 'Intel hebdo, gratuit', nlPlaceholder: 'Votre courriel', nlBtn: 'S’abonner',
    nlHint: 'Un courriel par semaine. Pas de spam.',
    acts: [
      ['fishing', '🎣 Pêche', 'Pêche'], ['hunting', '🦌 Chasse', 'Chasse'],
      ['camping', '⛺ Camping', 'Camping'], ['kayaking', '🛶 Kayak', 'Kayak'],
      ['skiing', '⛷️ Ski', 'Ski'], ['hiking', '🥾 Randonnée', 'Randonnée'],
    ],
    home: '/fr/', dirBase: '/fr', mapHref: '/en/map', plannerHref: '/en/trip-planner',
    blogHref: '/fr/blog', trustHref: '/fr/trust', aboutHref: '/en/about', licensesHref: '/en/licenses',
    langSelf: 'FR', langOther: 'EN', otherLangAttr: 'en',
  },
};

function headerTemplate(lang, langToggleUrl) {
  const t = NAV[lang];
  const dropdown = t.acts.map(([slug, label]) =>
    `                        <a href="${t.dirBase}/${slug}/directory" class="block px-4 py-2 text-[#1c2b21] hover:bg-[#f0f4ee] hover:text-[#305e3c]">${label}</a>`
  ).join('\n');
  const mobile = t.acts.map(([slug, label]) =>
    `            <a href="${t.dirBase}/${slug}/directory" class="block py-2 hover:text-[#a2c99a]">${label}</a>`
  ).join('\n');
  const pill = lang === 'en'
    ? `<span class="text-white">EN</span><span class="text-white/30">|</span><a href="${langToggleUrl}" class="text-[#a2c99a] hover:text-white transition-colors" lang="fr">FR</a>`
    : `<a href="${langToggleUrl}" class="text-[#a2c99a] hover:text-white transition-colors" lang="en">EN</a><span class="text-white/30">|</span><span class="text-white">FR</span>`;
  return `<header data-oi-ds class="fixed top-0 w-full z-[1000] bg-[#14251a] border-b border-white/10">
    <div class="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between gap-6">
        <a href="${t.home}" class="flex items-center gap-3 flex-shrink-0" aria-label="Outdoor Intel">
            <span class="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#14251a] font-extrabold text-sm tracking-tight">OI</span>
            <span class="text-white font-bold text-lg tracking-tight">Outdoor Intel</span>
        </a>
        <nav class="hidden lg:flex items-center gap-8 text-sm font-semibold text-white/90">
            <div class="explore-group relative">
                <button class="flex items-center gap-1.5 py-2 hover:text-white transition-colors" aria-haspopup="true">
                    ${t.explore}
                    <svg class="w-3.5 h-3.5 text-[#a2c99a]" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
                </button>
                <div class="explore-dropdown absolute left-0 top-full pt-2 w-52">
                    <div class="bg-white rounded-xl py-2 shadow-xl border border-[#14251a]/10">
${dropdown}
                    </div>
                </div>
            </div>
            <a href="${t.mapHref}" class="py-2 hover:text-white transition-colors">${t.map}</a>
            <a href="${t.plannerHref}" class="py-2 hover:text-white transition-colors">${t.planner}</a>
            <a href="${t.blogHref}" class="py-2 hover:text-white transition-colors">${t.blog}</a>
            <span class="inline-flex items-center gap-1.5 border border-white/25 rounded-full px-4 py-1.5 text-xs font-bold">${pill}</span>
            <button id="global-search-toggle" class="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center hover:bg-white/10 transition-colors" aria-label="Search">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </button>
        </nav>
        <button id="menu-toggle" class="lg:hidden p-2 text-white" aria-label="Menu" aria-expanded="false">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
        </button>
    </div>
    <nav id="mobile-menu" class="hidden lg:hidden bg-[#14251a] border-t border-white/10">
        <div class="max-w-6xl mx-auto px-6 py-4 space-y-1 text-white/90">
${mobile}
            <a href="${t.mapHref}" class="block py-2 hover:text-[#a2c99a]">${t.map}</a>
            <a href="${t.plannerHref}" class="block py-2 hover:text-[#a2c99a]">${t.planner}</a>
            <a href="${t.trustHref}" class="block py-2 hover:text-[#a2c99a]">${t.trust}</a>
            <a href="${t.blogHref}" class="block py-2 font-semibold hover:text-[#a2c99a]">${t.blog}</a>
            <a href="${langToggleUrl}" class="block py-2 text-[#a2c99a] font-bold mt-2" lang="${t.otherLangAttr}">${lang === 'en' ? 'Français' : 'English'}</a>
        </div>
    </nav>
</header>`;
}

function footerTemplate(lang, langToggleUrl) {
  const t = NAV[lang];
  const explore = t.acts.map(([slug, , plain]) =>
    `                    <li><a href="${t.dirBase}/${slug}/directory" class="hover:text-white transition-colors">${plain}</a></li>`
  ).join('\n');
  const pill = lang === 'en'
    ? `<span class="text-white/50">EN</span><span class="text-white/30">&nbsp;|&nbsp;</span><a href="${langToggleUrl}" class="text-[#a2c99a] hover:text-white transition-colors" lang="fr">FR</a>`
    : `<a href="${langToggleUrl}" class="text-[#a2c99a] hover:text-white transition-colors" lang="en">EN</a><span class="text-white/30">&nbsp;|&nbsp;</span><span class="text-white/50">FR</span>`;
  return `<footer data-oi-ds class="bg-[#14251a] text-white">
    <div class="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <div class="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 pb-12">
            <div class="col-span-2 md:col-span-1">
                <a href="${t.home}" class="flex items-center gap-3 mb-5" aria-label="Outdoor Intel">
                    <span class="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#14251a] font-extrabold text-sm tracking-tight">OI</span>
                    <span class="text-white font-bold text-lg tracking-tight">Outdoor Intel</span>
                </a>
                <p class="text-white/60 text-sm leading-relaxed max-w-xs mb-6">${t.blurb}</p>
                <p class="text-[#a2c99a] text-xs font-bold uppercase tracking-widest mb-2">${t.nlLabel}</p>
                <form class="js-newsletter-form flex gap-2 max-w-xs" data-lang="${lang}">
                    <input type="email" name="email" required placeholder="${t.nlPlaceholder}" autocomplete="email" class="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm text-[#1c2b21] bg-white placeholder-[#5c6b5f] outline-none focus:ring-2 focus:ring-[#a2c99a]">
                    <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-5000px">
                    <button type="submit" class="bg-[#305e3c] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#3d7a4d] transition-colors whitespace-nowrap">${t.nlBtn}</button>
                </form>
                <p class="js-newsletter-msg text-white/50 text-xs mt-2">${t.nlHint}</p>
            </div>
            <div>
                <h4 class="text-[#a2c99a] text-xs font-bold uppercase tracking-widest mb-4">${t.exploreCol}</h4>
                <ul class="space-y-2.5 text-sm text-white/70">
${explore}
                </ul>
            </div>
            <div>
                <h4 class="text-[#a2c99a] text-xs font-bold uppercase tracking-widest mb-4">${t.product}</h4>
                <ul class="space-y-2.5 text-sm text-white/70">
                    <li><a href="${t.mapHref}" class="hover:text-white transition-colors">${t.map}</a></li>
                    <li><a href="${t.plannerHref}" class="hover:text-white transition-colors">${t.planner}</a></li>
                    <li><a href="${t.blogHref}" class="hover:text-white transition-colors">${t.blog}</a></li>
                </ul>
            </div>
            <div>
                <h4 class="text-[#a2c99a] text-xs font-bold uppercase tracking-widest mb-4">${t.aboutCol}</h4>
                <ul class="space-y-2.5 text-sm text-white/70">
                    <li><a href="${t.trustHref}" class="hover:text-white transition-colors">${t.trust}</a></li>
                    <li><a href="${t.aboutHref}" class="hover:text-white transition-colors">${t.about}</a></li>
                    <li><a href="${t.licensesHref}" class="hover:text-white transition-colors">${t.licenses}</a></li>
                </ul>
            </div>
        </div>
        <div class="border-t border-white/15 pt-6 flex items-center justify-between text-sm">
            <p class="text-white/50">&copy; 2026 Outdoor Intel</p>
            <p class="font-bold text-xs">${pill}</p>
        </div>
    </div>
</footer>`;
}

// --- gather files -----------------------------------------------------------
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
files.push(path.join(ROOT, '404.html'));

// clean URL for a repo-relative html path
function cleanUrl(rel) {
  let u = '/' + rel.replace(/\\/g, '/');
  u = u.replace(/\.html$/, '');
  if (u === '/index') u = '/';
  if (u.endsWith('/index')) u = u.slice(0, -('index'.length));
  return u;
}

function langToggleFor(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const isFr = rel.startsWith('fr/');
  const counterpart = isFr ? rel.replace(/^fr\//, 'en/') : rel.replace(/^en\//, 'fr/');
  if ((rel.startsWith('en/') || isFr) && fs.existsSync(path.join(ROOT, counterpart))) {
    return cleanUrl(counterpart);
  }
  return isFr ? '/' : '/fr/';
}

const HEADER_RE = /<header class="[^"]*border-\[#2d5a3d\]\/10 bg-white[^"]*">[\s\S]*?<\/header>/;
const FOOTER_RE = /<footer class="bg-\[#2d5a3d\][^"]*">[\s\S]*?<\/footer>/g;

let headerCount = 0, footerCount = 0, paletteCount = 0, skipped = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lang = rel.startsWith('fr/') ? 'fr' : 'en';
  const toggleUrl = langToggleFor(file);

  if (!html.includes('data-oi-ds')) {
    if (HEADER_RE.test(html)) {
      html = html.replace(HEADER_RE, headerTemplate(lang, toggleUrl));
      headerCount++;
      // pages whose old header was static (in-flow) need an offset for the fixed one
      if (/en\/trust\.html$|fr\/trust\.html$/.test(rel)) {
        html = html.replace(/<body class="([^"]*)"/, '<body class="$1 pt-[72px]"');
      }
    }
    if (FOOTER_RE.test(html)) {
      html = html.replace(FOOTER_RE, footerTemplate(lang, toggleUrl));
      footerCount++;
    }
    if (!html.includes('id="oi-ds"')) {
      html = html.replace('</head>', DS_STYLE + '\n</head>');
    }
    if (!html.includes('assets/js/newsletter.js') && html.includes('js-newsletter-form')) {
      html = html.replace('</body>', '<script defer src="/assets/js/newsletter.js?v=1"></script>\n</body>');
    }
  } else {
    skipped++;
  }

  for (const [from, to] of PALETTE) {
    if (html.includes(from)) { html = html.split(from).join(to); }
  }
  html = html.replace(/<meta name="theme-color" content="#[0-9a-f]{6}">/, '<meta name="theme-color" content="#14251a">');
  if (html !== before) {
    fs.writeFileSync(file, html);
    paletteCount++;
  }
}

console.log(`files scanned: ${files.length}`);
console.log(`headers replaced: ${headerCount}`);
console.log(`footers replaced: ${footerCount}`);
console.log(`files modified: ${paletteCount} (skipped already-converted: ${skipped})`);
