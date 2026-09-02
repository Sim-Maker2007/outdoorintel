const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CATEGORIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const CATEGORY_LABELS = {
  en: { fishing: 'Fishing', hunting: 'Hunting', camping: 'Camping', kayaking: 'Kayaking', skiing: 'Skiing', hiking: 'Hiking' },
  fr: { fishing: 'Peche', hunting: 'Chasse', camping: 'Camping', kayaking: 'Kayak', skiing: 'Ski', hiking: 'Randonnee' }
};
const PROVINCE_ORDER = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon'
];
const PROVINCE_FR = {
  Alberta: 'Alberta',
  'British Columbia': 'Colombie-Britannique',
  Manitoba: 'Manitoba',
  'New Brunswick': 'Nouveau-Brunswick',
  'Newfoundland and Labrador': 'Terre-Neuve-et-Labrador',
  'Northwest Territories': 'Territoires du Nord-Ouest',
  'Nova Scotia': 'Nouvelle-Ecosse',
  Nunavut: 'Nunavut',
  Ontario: 'Ontario',
  'Prince Edward Island': 'Ile-du-Prince-Edouard',
  Quebec: 'Quebec',
  Saskatchewan: 'Saskatchewan',
  Yukon: 'Yukon'
};

function slugify(value) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const provinceStats = new Map();
for (const province of PROVINCE_ORDER) {
  provinceStats.set(province, { total: 0, categories: new Map() });
}

for (const category of CATEGORIES) {
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${category}.json`), 'utf8'));
  for (const spot of data.spots) {
    if (!provinceStats.has(spot.province)) {
      throw new Error(`Unexpected province in data: ${spot.province}`);
    }
    const stats = provinceStats.get(spot.province);
    stats.total += 1;
    stats.categories.set(category, (stats.categories.get(category) || 0) + 1);
  }
}

function render(lang) {
  const labels = CATEGORY_LABELS[lang];
  const isFr = lang === 'fr';
  const dirPrefix = isFr ? '../../fr' : '../../en';
  const cards = PROVINCE_ORDER.map(province => {
    const stats = provinceStats.get(province);
    const name = isFr ? PROVINCE_FR[province] : province;
    const activityList = CATEGORIES
      .filter(category => stats.categories.has(category))
      .map(category => `${labels[category]} (${stats.categories.get(category)})`)
      .join(' / ');
    return `                <a href="${slugify(province)}.html" class="group bg-white rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all border-b-4 border-[#c97c5e]" style="box-shadow: 0 4px 12px rgba(62,49,39,0.08)">
                    <h3 class="text-xl font-bold text-[#2d5a3d] mb-2 group-hover:text-[#c97c5e] transition-colors">${name}</h3>
                    <p class="text-2xl font-bold text-[#c97c5e] mb-2">${stats.total} <span class="text-sm text-[#6b6359] font-normal">spots</span></p>
                    <p class="text-sm text-[#6b6359]">${activityList}</p>
                </a>`;
  }).join('\n');

  const title = isFr ? 'Provinces et territoires | Outdoor Intel' : 'Provinces & Territories | Outdoor Intel';
  const description = isFr
    ? 'Explorez les destinations plein air canadiennes par province et territoire.'
    : 'Explore Canadian outdoor destinations by province and territory.';
  const h1 = isFr ? 'Explorer par province et territoire' : 'Explore by Province and Territory';
  const sub = isFr
    ? '13 provinces et territoires, 499 spots avec sources et liens officiels'
    : '13 provinces and territories, 499 spots with source and official-resource links';
  const trust = isFr ? 'Confiance et sources' : 'Trust & Sources';
  const map = isFr ? 'Carte' : 'Map';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg?v=2">
    <meta name="theme-color" content="#2d5a3d">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="https://outdoorintel.ca/${lang}/provinces/">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#f5f3f0] text-[#3e3127] font-sans leading-relaxed">
    <header class="fixed top-0 w-full z-50 border-b border-[#2d5a3d]/10 bg-white/95 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <a href="../../index.html" class="flex-shrink-0"><img src="../../assets/logo/logo.jpg" alt="Outdoor Intel" width="180" height="101" class="h-10 md:h-14 w-auto object-contain"></a>
            <nav class="hidden lg:flex gap-6 text-sm font-semibold text-[#3e3127]">
                ${CATEGORIES.map(category => `<a href="../${category}/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${labels[category]}</a>`).join('\n                ')}
                <a href="../map.html" class="hover:text-[#c97c5e] transition-colors py-2">${map}</a>
                <a href="../trust.html" class="hover:text-[#c97c5e] transition-colors py-2">${trust}</a>
            </nav>
        </div>
    </header>
    <main>
        <section class="bg-[#2d5a3d] pt-32 pb-16 px-6">
            <div class="max-w-7xl mx-auto">
                <p class="text-sm font-bold uppercase tracking-widest text-[#c97c5e] mb-3">Outdoor Intel Canada</p>
                <h1 class="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">${h1}</h1>
                <p class="text-xl text-white/80 max-w-2xl">${sub}</p>
            </div>
        </section>
        <section class="py-12 px-6">
            <div class="max-w-7xl mx-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
${cards}
                </div>
            </div>
        </section>
    </main>
    <footer class="bg-[#2d5a3d] text-white py-12 px-6 text-center">
        <p class="text-white/50 text-sm">OutdoorIntel.ca - 2026. ${isFr ? 'Tous droits reserves.' : 'All rights reserved.'}</p>
    </footer>
</body>
</html>
`;
}

fs.writeFileSync(path.join(ROOT, 'en/provinces/index.html'), render('en'));
fs.writeFileSync(path.join(ROOT, 'fr/provinces/index.html'), render('fr'));
console.log('Rebuilt en/fr province index pages from normalized data.');
