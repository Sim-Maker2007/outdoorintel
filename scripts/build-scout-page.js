#!/usr/bin/env node
/* Generates en/scout.html and fr/scout.html from an existing page shell. */
const fs = require('fs');

var STYLE = `<style>
.scout-shell{max-width:820px;margin:0 auto}
#scout-log{min-height:320px;max-height:58vh;overflow-y:auto;padding:8px 2px}
.scout-row{display:flex;margin:10px 0}
.scout-row-user{justify-content:flex-end}
.scout-bubble{padding:12px 16px;border-radius:16px;font-size:14px;line-height:1.55;max-width:82%}
.scout-bubble-user{background:#305e3c;color:#fff;border-bottom-right-radius:4px}
.scout-bubble-ai{background:#fff;color:#1c2b21;border:1px solid #e8e4df;border-bottom-left-radius:4px;box-shadow:0 2px 10px rgba(62,49,39,.06)}
.scout-typing span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#a2c99a;margin-right:3px;animation:scoutb 1s infinite}
.scout-typing span:nth-child(2){animation-delay:.15s}.scout-typing span:nth-child(3){animation-delay:.3s}
@keyframes scoutb{0%,60%,100%{opacity:.3}30%{opacity:1}}
.scout-stops{display:flex;flex-direction:column;gap:8px}
.scout-stop{display:flex;align-items:flex-start;gap:12px;padding:12px;border:1px solid #ececec;border-radius:12px;background:#fbfaf7}
.scout-stop-num{width:24px;height:24px;border-radius:50%;background:#305e3c;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.scout-stop-view{flex-shrink:0;font-size:12px;font-weight:700;color:#305e3c;text-decoration:none;border:1px solid rgba(48,94,60,.25);padding:6px 12px;border-radius:8px;align-self:center}
.scout-notes{margin-top:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;font-size:13px;color:#7c4a12;line-height:1.55}
.scout-notes-h{font-weight:800;text-transform:uppercase;letter-spacing:.5px;font-size:10px;margin-bottom:4px;color:#92400e}
.scout-addall{display:inline-flex;align-items:center;gap:8px;margin-top:14px;background:#f4a825;color:#1c2b21;font-weight:800;padding:12px 22px;border-radius:10px;text-decoration:none}
.scout-addall:hover{background:#f7b943}
.scout-example{background:#fff;border:1px solid rgba(48,94,60,.2);color:#305e3c;font-weight:600;font-size:13px;padding:8px 14px;border-radius:20px;cursor:pointer;transition:all .15s}
.scout-example:hover{border-color:#3d7a4d;background:#f4f3ec}
#scout-form{display:flex;gap:10px;margin-top:16px}
#scout-input{flex:1;padding:14px 16px;border:1.5px solid #e0dbd5;border-radius:12px;font-size:15px;outline:none;font-family:inherit}
#scout-input:focus{border-color:#305e3c}
#scout-send{background:#305e3c;color:#fff;border:none;border-radius:12px;padding:0 22px;font-weight:700;cursor:pointer}
#scout-send:hover{background:#3d7a4d}
#scout-geo{background:none;border:1px solid rgba(48,94,60,.25);color:#305e3c;font-size:12px;font-weight:600;padding:8px 12px;border-radius:20px;cursor:pointer}
.scout-geo-on{background:#e8f5e9;border-color:#a5d6a7}
</style>`;

function page(intro, examples, greeting, disclaimer, geoLabel) {
  return `<main class="pt-28 pb-20 px-6">${STYLE}
        <div class="scout-shell">
            <div class="mb-6">
                <p class="text-[#305e3c] text-xs font-bold uppercase tracking-[0.2em] mb-3">Scout &middot; AI trip planner</p>
                <h1 class="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1c2b21] mb-3">${intro.h1}</h1>
                <p class="text-lg text-[#5c6b5f]">${intro.sub}</p>
            </div>
            <div class="flex flex-wrap gap-2 mb-5">
                ${examples.map(function (e) { return '<button type="button" class="scout-example">' + e + '</button>'; }).join('\n                ')}
                <button type="button" id="scout-geo">${geoLabel}</button>
            </div>
            <div id="scout-log">
                <div class="scout-row scout-row-ai"><div class="scout-bubble scout-bubble-ai">${greeting}</div></div>
            </div>
            <form id="scout-form" autocomplete="off">
                <input id="scout-input" type="text" aria-label="Message Scout">
                <button id="scout-send" type="submit">${intro.send}</button>
            </form>
            <p class="text-xs text-[#7a9b8e] mt-3">${disclaimer}</p>
        </div>
    </main>`;
}

function build(shellPath, outPath, fields, mainHtml) {
  let html = fs.readFileSync(shellPath, 'utf8');
  html = html.replace(/<main[\s\S]*?<\/main>/, mainHtml);
  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + fields.title + '</title>');
  html = html.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + fields.desc + '">');
  html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + fields.canonical + '">');
  html = html.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + fields.title + '">');
  html = html.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + fields.desc + '">');
  html = html.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + fields.canonical + '">');
  if (!html.includes('scout.js')) {
    const tag = '<script defer src="/assets/js/scout.js?v=1"></script>';
    const i = html.lastIndexOf('</body>');
    html = html.slice(0, i) + tag + '\n' + html.slice(i);
  }
  fs.writeFileSync(outPath, html);
  console.log('Wrote ' + outPath);
}

build('en/about.html', 'en/scout.html', {
  title: 'Scout — AI Trip Planner | Outdoor Intel',
  desc: 'Tell Scout what you want and get a real Canadian outdoor itinerary — grounded in 499 sourced spots, sorted to your area, straight into your Trip Planner.',
  canonical: 'https://outdoorintel.ca/en/scout'
}, page(
  { h1: 'Plan a trip in plain English', sub: 'Tell Scout what you’re after and get a real itinerary — built only from Outdoor Intel’s sourced spots, ready to drop into your Trip Planner.', send: 'Send' },
  ['Weekend fishing within 3 hours of Toronto', 'A 3-day canoe &amp; camping loop in Ontario', 'Beginner-friendly ski hills near Montreal', 'Brook trout lakes in Quebec'],
  'Hi, I’m <strong>Scout</strong>. Tell me the activity, roughly where, and when — I’ll pull together a trip from real, sourced spots and you can send it straight to your planner. What are you thinking?',
  'Scout only suggests real, sourced spots from Outdoor Intel — never invented places. Always confirm current regulations and conditions before you go.',
  '📍 Use my location'
));

build('fr/trust.html', 'fr/scout.html', {
  title: 'Scout — Planificateur IA | Outdoor Intel',
  desc: 'Dites &agrave; Scout ce que vous cherchez et obtenez un vrai itin&eacute;raire plein air canadien — bas&eacute; sur 499 spots sourc&eacute;s, tri&eacute;s pour votre r&eacute;gion.',
  canonical: 'https://outdoorintel.ca/fr/scout'
}, page(
  { h1: 'Planifiez en langage naturel', sub: 'Dites &agrave; Scout ce que vous cherchez et obtenez un vrai itin&eacute;raire — construit uniquement &agrave; partir des spots sourc&eacute;s d’Outdoor Intel, pr&ecirc;t pour votre planificateur.', send: 'Envoyer' },
  ['P&ecirc;che de fin de semaine &agrave; 3 h de Montr&eacute;al', 'Une boucle canot &amp; camping de 3 jours', 'Stations de ski pour d&eacute;butants pr&egrave;s de Qu&eacute;bec', 'Lacs &agrave; truite mouchet&eacute;e au Qu&eacute;bec'],
  'Bonjour, je suis <strong>Scout</strong>. Dites-moi l’activit&eacute;, la r&eacute;gion et la p&eacute;riode — je b&acirc;tis un trajet &agrave; partir de vrais spots sourc&eacute;s, et vous l’envoyez au planificateur. Qu’est-ce qui vous tente ?',
  'Scout ne sugg&egrave;re que de vrais spots sourc&eacute;s d’Outdoor Intel — jamais de lieux invent&eacute;s. Confirmez toujours la r&eacute;glementation et les conditions avant de partir.',
  '📍 Utiliser ma position'
));
