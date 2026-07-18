#!/usr/bin/env node
/* Generates en/field-notes.html and fr/field-notes.html by cloning an existing
 * page shell (header/footer/scripts) and swapping in the Field Notes feed. */
const fs = require('fs');

function build(shellPath, outPath, lang, fields, mainHtml) {
  let html = fs.readFileSync(shellPath, 'utf8');

  // Swap <main ...>...</main>
  html = html.replace(/<main[\s\S]*?<\/main>/, mainHtml);

  // Head fields
  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + fields.title + '</title>');
  html = html.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + fields.desc + '">');
  html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + fields.canonical + '">');
  html = html.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + fields.title + '">');
  html = html.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + fields.desc + '">');
  html = html.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + fields.canonical + '">');

  // Ensure feed script present, before </body>
  if (!html.includes('field-notes.js')) {
    const tag = '<script defer src="/assets/js/field-notes.js?v=1"></script>';
    const i = html.lastIndexOf('</body>');
    html = html.slice(0, i) + tag + '\n' + html.slice(i);
  }
  fs.writeFileSync(outPath, html);
  console.log('Wrote ' + outPath);
}

const mainEn = `<main class="pt-28 pb-20 px-6">
        <div class="max-w-6xl mx-auto">
            <div class="mb-8">
                <p class="text-[#305e3c] text-xs font-bold uppercase tracking-[0.2em] mb-3">Field Notes</p>
                <h1 class="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1c2b21] mb-3">Fresh from the field</h1>
                <p class="text-lg text-[#5c6b5f] max-w-2xl">The latest trip reports, conditions and photos from people who were just out there &mdash; across every activity in Canada. Updated as scouts post.</p>
            </div>
            <div id="fn-filters" class="flex flex-wrap gap-2 mb-6"></div>
            <div id="fn-status" class="text-[#5c6b5f] text-sm mb-6">Loading the latest reports&hellip;</div>
            <div id="fn-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"></div>
            <div class="mt-14 text-center">
                <p class="text-[#5c6b5f] mb-4">Been out lately? Add your report from any spot page &mdash; 30 seconds, no account.</p>
                <a href="/en/map" class="inline-block bg-[#305e3c] text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-[#3d7a4d] transition-colors">Find a spot to report on</a>
            </div>
        </div>
    </main>`;

const mainFr = `<main class="pt-28 pb-20 px-6">
        <div class="max-w-6xl mx-auto">
            <div class="mb-8">
                <p class="text-[#305e3c] text-xs font-bold uppercase tracking-[0.2em] mb-3">Carnet de terrain</p>
                <h1 class="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1c2b21] mb-3">Des nouvelles du terrain</h1>
                <p class="text-lg text-[#5c6b5f] max-w-2xl">Les derniers rapports, conditions et photos de gens qui reviennent tout juste du terrain &mdash; pour chaque activit&eacute; au Canada. Mis &agrave; jour au fil des publications.</p>
            </div>
            <div id="fn-filters" class="flex flex-wrap gap-2 mb-6"></div>
            <div id="fn-status" class="text-[#5c6b5f] text-sm mb-6">Chargement des derniers rapports&hellip;</div>
            <div id="fn-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"></div>
            <div class="mt-14 text-center">
                <p class="text-[#5c6b5f] mb-4">Vous &eacute;tiez dehors r&eacute;cemment&nbsp;? Ajoutez votre rapport depuis une page de spot &mdash; 30&nbsp;secondes, sans compte.</p>
                <a href="/fr/map" class="inline-block bg-[#305e3c] text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-[#3d7a4d] transition-colors">Trouver un spot &agrave; commenter</a>
            </div>
        </div>
    </main>`;

build('en/about.html', 'en/field-notes.html', 'en', {
  title: 'Field Notes | Outdoor Intel',
  desc: 'The latest community trip reports, conditions and photos from Canadian fishing, hunting, camping, kayaking, skiing and hiking spots.',
  canonical: 'https://outdoorintel.ca/en/field-notes'
}, mainEn);

build('fr/trust.html', 'fr/field-notes.html', 'fr', {
  title: 'Carnet de terrain | Outdoor Intel',
  desc: 'Les derniers rapports, conditions et photos de la communaut&eacute; pour les spots de p&ecirc;che, chasse, camping, kayak, ski et randonn&eacute;e au Canada.',
  canonical: 'https://outdoorintel.ca/fr/field-notes'
}, mainFr);
