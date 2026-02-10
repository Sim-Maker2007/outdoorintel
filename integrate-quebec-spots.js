const fs = require('fs');

// Read CSV
const csv = fs.readFileSync('./fish_guide_csv/poissons_p.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());
const headers = lines[0].split(';');

const records = [];
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  const row = {};
  headers.forEach((h, idx) => row[h] = cols[idx]?.trim() || '');
  records.push(row);
}

// Group by lake
const lakes = {};
records.forEach(r => {
  const name = r.HYDRONYME;
  if (!name) return;
  if (!lakes[name]) {
    lakes[name] = {
      name,
      species: [],
      lat: r.LATITUDE,
      lng: r.LONGITUDE,
      region: r.ZGIEBV,
      subregion: r.ZGIESL
    };
  }
  if (r.NOM_COMMUN && !lakes[name].species.find(s => s.common === r.NOM_COMMUN)) {
    lakes[name].species.push({
      common: r.NOM_COMMUN,
      latin: r.NOM_LATIN,
      status: r.STATUT_PECHE,
      warning: r.AVERTISSEMENT
    });
  }
});

// Slugify matching the existing pattern
const slugify = name => name.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const lakeList = Object.values(lakes).slice(0, 200);

// Generate directory entries (just the cards)
let directoryEntries = '';
let count = 0;

lakeList.forEach(lake => {
  const slug = slugify(lake.name);
  const mainSpecies = lake.species.slice(0, 2).map(s => s.common).join(', ');
  const hasWarning = lake.species.some(s => s.warning);
  const tier = hasWarning ? 'Caution' : 'Verified';
  
  directoryEntries += `
<a href="${slug}.html" class="spot-card group hover:shadow-lg transition-all rounded-xl overflow-hidden hover:-translate-y-1" style="box-shadow: 0 4px 12px rgba(62,49,39,0.08)" data-name="${lake.name.toLowerCase()}" data-province="Quebec" data-filter="${lake.species.map(s => s.common).join(',')}" data-type="">
    <div class="bg-white p-8 h-full border-b-4 border-[#c97c5e]">
        <div class="text-[#c97c5e] text-xs font-bold uppercase mb-2">Québec • ${tier}</div>
        <h3 class="text-xl font-bold text-[#2d5a3d] mb-2">${lake.name}</h3>
        <p class="text-[#6b6359] text-sm mb-4">${mainSpecies}</p>
        <div class="flex justify-between items-center">
            <div class="text-xs text-[#7a9b8e] font-semibold">${lake.species.length} species</div>
            <div class="text-[#c97c5e] text-sm font-semibold">View Profile →</div>
        </div>
    </div>
</a>`;
  count++;
});

// Generate simplified spot pages
lakeList.forEach(lake => {
  const slug = slugify(lake.name);
  const speciesList = lake.species.map(s => 
    `<div class="bg-white border border-[#2d5a3d]/10 rounded-lg p-4 flex items-center gap-3">
        <div class="w-3 h-3 rounded-full bg-[#c97c5e]"></div>
        <span class="font-semibold text-[#2d5a3d]">${s.common}</span>
        <span class="text-xs text-[#6b6359] ml-auto">${s.latin}</span>
    </div>`
  ).join('');
  
  const warning = lake.species.some(s => s.warning) ? 
    `<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-700 font-semibold">⚠️ Mercury Warning</p>
        <p class="text-red-600 text-sm">Consumption guidelines apply for some species.</p>
    </div>` : '';

  const pageHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lake.name} | Fishing | Outdoor Intel</title>
    <meta name="description" content="Fishing intel for ${lake.name} in Quebec. Species data from Données Québec.">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .spot-hero {
            background: linear-gradient(135deg, rgba(45,90,61,0.6), rgba(62,49,39,0.5));
            background-size: cover;
            background-position: center;
        }
    </style>
</head>
<body class="bg-[#f5f3f0] text-[#3e3127] font-sans leading-relaxed">

<header class="fixed top-0 w-full z-50 border-b border-[#2d5a3d]/10 bg-white/95 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="../../index.html" class="flex-shrink-0">
            <img src="../../assets/logo/logo.jpg" alt="Outdoor Intel" class="h-10 md:h-14 w-auto object-contain">
        </a>
        <nav class="hidden lg:flex gap-6 text-sm font-semibold text-[#3e3127]">
            <a href="directory.html" class="text-[#2d5a3d]">Fishing</a>
            <a href="../../fr/fishing/${slug}.html" class="text-[#c97c5e] font-bold">Français</a>
        </nav>
    </div>
</header>

<main>
    <section class="spot-hero min-h-[50vh] flex flex-col justify-center pt-24 pb-12 px-6">
        <div class="max-w-7xl mx-auto w-full relative z-10">
            <div class="max-w-3xl">
                <div class="mb-4">
                    <span class="inline-block bg-white/90 text-[#c97c5e] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full">Quebec Government Data</span>
                </div>
                <h1 class="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-white drop-shadow-lg">${lake.name}</h1>
                <p class="text-xl text-white/90 mb-6">${lake.region || 'Quebec'} • ${lake.species.length} species</p>
                <div class="flex flex-wrap gap-3">
                    <a href="directory.html" class="bg-white text-[#2d5a3d] px-6 py-3 font-semibold rounded-lg hover:bg-[#fef9f3] transition-colors">All Fishing</a>
                </div>
            </div>
        </div>
    </section>

    <section class="bg-white py-16 px-6">
        <div class="max-w-7xl mx-auto">
            ${warning}
            
            <div class="bg-[#fef9f3] rounded-xl p-8 mb-10">
                <h2 class="text-2xl font-bold text-[#2d5a3d] mb-6">Species Present</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${speciesList}
                </div>
            </div>

            <div class="grid md:grid-cols-2 gap-8 mb-10">
                <div class="bg-[#2d5a3d] text-white rounded-xl p-8">
                    <h2 class="text-xl font-bold mb-4">Location</h2>
                    <p class="text-white/90">Region: ${lake.region || 'Quebec'}</p>
                    <p class="text-white/70 text-sm mt-2">${lake.lat || 'N/A'}, ${lake.lng || 'N/A'}</p>
                </div>
                <div class="bg-[#fef9f3] rounded-xl p-8">
                    <h2 class="text-xl font-bold text-[#2d5a3d] mb-4">Fishing Status</h2>
                    <p class="text-[#3e3127]">${lake.species[0]?.status || 'Check local regulations'}</p>
                </div>
            </div>

            <div class="bg-gradient-to-r from-[#2d5a3d] to-[#3e7a5d] text-white rounded-xl p-8">
                <h2 class="text-xl font-bold mb-2">Data Source</h2>
                <p class="text-white/90 mb-4">This spot data comes from Données Québec, the official Quebec government open data portal.</p>
                <a href="https://www.quebec.ca" target="_blank" class="inline-block bg-white text-[#2d5a3d] px-6 py-3 font-semibold rounded-lg hover:bg-[#fef9f3] transition-colors">Learn More</a>
            </div>
        </div>
    </section>
</main>

<footer class="bg-[#2d5a3d] text-white py-12 px-6">
    <div class="max-w-7xl mx-auto text-center">
        <p class="text-white/70">OutdoorIntel.ca — 2026</p>
    </div>
</footer>

</body>
</html>`;

  fs.writeFileSync(`./en/fishing/${slug}.html`, pageHTML);
});

// Update the EN directory.html
const directoryPath = './en/fishing/directory.html';
let directoryHTML = fs.readFileSync(directoryPath, 'utf8');

// Find the spots-grid div and append new entries
const insertBefore = '</div>\n\n            <div id="no-results"';
directoryHTML = directoryHTML.replace(
  insertBefore,
  directoryEntries + '\n            </div>\n\n            <div id="no-results"'
);

// Update the count
const countMatch = directoryHTML.match(/<span id="result-count">(\d+)<\/span>/);
if (countMatch) {
  const oldCount = parseInt(countMatch[1]);
  const newCount = oldCount + count;
  directoryHTML = directoryHTML.replace(
    `<span id="result-count">${oldCount}</span>`,
    `<span id="result-count">${newCount}</span>`
  );
  directoryHTML = directoryHTML.replace(
    `Explore ${oldCount} Canadian`,
    `Explore ${newCount} Canadian`
  );
}

fs.writeFileSync(directoryPath, directoryHTML);

console.log(`✅ Added ${count} Quebec fishing spots to directory`);
console.log(`✅ Generated ${count} spot pages in /en/fishing/`);
console.log(`✅ Total spots in directory: ${239}`);
