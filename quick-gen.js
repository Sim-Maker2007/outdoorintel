const fs = require('fs');

// Read CSV manually
const csvFile = fs.readFileSync('/Users/lume/clawd/fish_guide_csv/poissons_p.csv', 'utf8');
const lines = csvFile.split('\n').filter(l => l.trim());
const headers = lines[0].split(';').map(h => h.trim());

// Parse records
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
  if (r.NOM_COMMUN) {
    lakes[name].species.push({
      common: r.NOM_COMMUN,
      latin: r.NOM_LATIN,
      status: r.STATUT_PECHE,
      warning: r.AVERTISSEMENT
    });
  }
});

// Slugify function
const slugify = name => name.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Generate pages (first 200 lakes for speed)
const lakeList = Object.values(lakes).slice(0, 200);
let count = 0;

lakeList.forEach(lake => {
  const slug = slugify(lake.name);
  const hasWarning = lake.species.some(s => s.warning);
  const warningHTML = hasWarning ? '<div class="bg-red-500/20 border border-red-500/30 p-3 rounded mb-4"><p class="text-red-400 text-sm font-semibold">⚠️ Mercury Warning / Avertissement Mercure</p></div>' : '';
  const speciesTags = lake.species.map(s => `<span class="px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full text-sm">${s.common}</span>`).join('');
  const status = lake.species[0]?.status || 'Check local regulations';

  // EN template
  const enHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${lake.name} - Fishing Intel | Outdoor Intel</title>
<meta name="description" content="Fishing data for ${lake.name} in ${lake.region || 'Quebec'}. Species: ${lake.species.map(s => s.common).join(', ')}.">
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#050a10] text-slate-100 min-h-screen">
<header class="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050a10]/95 backdrop-blur-md">
<div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
<a href="../index.html" class="text-xl font-bold tracking-tight">Outdoor<span class="text-blue-400">Intel</span></a>
<nav class="hidden md:flex gap-8 text-sm font-medium">
<a href="spot-directory.html" class="text-white">Fishing Spots</a>
<a href="../fr/${slug}.html" class="text-blue-400 hover:text-blue-300">FR</a>
</nav>
</div>
</header>
<main class="pt-32 pb-20 px-6">
<div class="max-w-4xl mx-auto">
<div class="flex items-center gap-2 text-blue-400 text-sm mb-4">
<a href="spot-directory.html" class="hover:underline">Fishing Spots</a><span>/</span><span class="text-slate-400">${lake.region || 'Quebec'}</span>
</div>
<h1 class="text-4xl md:text-5xl font-bold mb-6">${lake.name}</h1>
${warningHTML}
<div class="grid md:grid-cols-2 gap-6 mb-8">
<div class="bg-white/5 border border-white/10 rounded-lg p-6">
<h2 class="text-lg font-semibold mb-4 text-blue-400">Species Present</h2>
<div class="flex flex-wrap gap-2">${speciesTags}</div>
</div>
<div class="bg-white/5 border border-white/10 rounded-lg p-6">
<h2 class="text-lg font-semibold mb-4 text-blue-400">Location Data</h2>
<p class="text-slate-300 mb-2">Region: ${lake.region || 'N/A'}</p>
<p class="text-slate-400 text-sm">${lake.lat}, ${lake.lng}</p>
</div>
</div>
<div class="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
<h2 class="text-lg font-semibold mb-4 text-blue-400">Fishing Status</h2>
<p class="text-slate-300">${status}</p>
</div>
<div class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
<h2 class="text-lg font-semibold mb-2 text-white">Gear Up at Ecotone</h2>
<p class="text-slate-400 text-sm mb-4">Get the right equipment for ${lake.species[0]?.common || 'fishing'} at Ecotone Gatineau.</p>
<a href="https://ecotonegatineau.com" class="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition">Shop Now →</a>
</div>
</div>
</main>
</body>
</html>`;

  // FR template
  const frHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${lake.name} - Données de Pêche | Outdoor Intel</title>
<meta name="description" content="Données de pêche pour ${lake.name} dans ${lake.region || 'Québec'}. Espèces: ${lake.species.map(s => s.common).join(', ')}.">
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#050a10] text-slate-100 min-h-screen">
<header class="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050a10]/95 backdrop-blur-md">
<div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
<a href="../index.html" class="text-xl font-bold tracking-tight">Outdoor<span class="text-blue-400">Intel</span></a>
<nav class="hidden md:flex gap-8 text-sm font-medium">
<a href="spot-directory.html" class="text-white">Spots de Pêche</a>
<a href="${slug}.html" class="text-blue-400 hover:text-blue-300">EN</a>
</nav>
</div>
</header>
<main class="pt-32 pb-20 px-6">
<div class="max-w-4xl mx-auto">
<div class="flex items-center gap-2 text-blue-400 text-sm mb-4">
<a href="spot-directory.html" class="hover:underline">Spots de Pêche</a><span>/</span><span class="text-slate-400">${lake.region || 'Québec'}</span>
</div>
<h1 class="text-4xl md:text-5xl font-bold mb-6">${lake.name}</h1>
${warningHTML}
<div class="grid md:grid-cols-2 gap-6 mb-8">
<div class="bg-white/5 border border-white/10 rounded-lg p-6">
<h2 class="text-lg font-semibold mb-4 text-blue-400">Espèces Présentes</h2>
<div class="flex flex-wrap gap-2">${speciesTags}</div>
</div>
<div class="bg-white/5 border border-white/10 rounded-lg p-6">
<h2 class="text-lg font-semibold mb-4 text-blue-400">Données de Localisation</h2>
<p class="text-slate-300 mb-2">Région: ${lake.region || 'N/A'}</p>
<p class="text-slate-400 text-sm">${lake.lat}, ${lake.lng}</p>
</div>
</div>
<div class="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
<h2 class="text-lg font-semibold mb-4 text-blue-400">Statut de Pêche</h2>
<p class="text-slate-300">${status}</p>
</div>
<div class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
<h2 class="text-lg font-semibold mb-2 text-white">Équipez-vous chez Écotone</h2>
<p class="text-slate-400 text-sm mb-4">Obtenez le bon équipement pour ${lake.species[0]?.common || 'la pêche'} chez Écotone Gatineau.</p>
<a href="https://ecotonegatineau.com" class="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition">Magasiner →</a>
</div>
</div>
</main>
</body>
</html>`;

  fs.writeFileSync(`/Users/lume/clawd/en/${slug}.html`, enHTML);
  fs.writeFileSync(`/Users/lume/clawd/fr/${slug}.html`, frHTML);
  count++;
});

console.log(`✅ Generated ${count} bilingual pages (${count} EN + ${count} FR)`);
