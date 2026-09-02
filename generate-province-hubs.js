const fs = require('fs');
const path = require('path');

const CATEGORIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const CAT_ICONS = { fishing: '🎣', hunting: '🦌', camping: '⛺', kayaking: '🛶', skiing: '⛷️', hiking: '🥾' };
const CAT_LABELS_FR = { fishing: 'Pêche', hunting: 'Chasse', camping: 'Camping', kayaking: 'Kayak', skiing: 'Ski', hiking: 'Randonnée' };

// Load all spots grouped by province
const provinceSpots = {};

CATEGORIES.forEach(cat => {
    const dataFile = path.join(__dirname, 'data', `${cat}.json`);
    if (!fs.existsSync(dataFile)) return;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    data.spots.forEach(s => {
        if (!provinceSpots[s.province]) provinceSpots[s.province] = {};
        if (!provinceSpots[s.province][cat]) provinceSpots[s.province][cat] = [];
        provinceSpots[s.province][cat].push(s);
    });
});

const PROVINCE_SLUGS = {};
const PROVINCE_FR = {
    'Ontario': 'Ontario', 'Quebec': 'Québec', 'British Columbia': 'Colombie-Britannique',
    'Alberta': 'Alberta', 'Manitoba': 'Manitoba', 'Saskatchewan': 'Saskatchewan',
    'Nova Scotia': 'Nouvelle-Écosse', 'New Brunswick': 'Nouveau-Brunswick',
    'Newfoundland and Labrador': 'Terre-Neuve-et-Labrador', 'Prince Edward Island': 'Île-du-Prince-Édouard',
    'Northwest Territories': 'Territoires du Nord-Ouest', 'Yukon': 'Yukon', 'Nunavut': 'Nunavut'
};

Object.keys(provinceSpots).forEach(p => {
    PROVINCE_SLUGS[p] = p.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
});

function generateHubPage(province, lang) {
    const spots = provinceSpots[province];
    const totalSpots = Object.values(spots).reduce((sum, arr) => sum + arr.length, 0);
    const slug = PROVINCE_SLUGS[province];
    const provName = lang === 'fr' ? (PROVINCE_FR[province] || province) : province;

    const title = lang === 'fr'
        ? `${provName} | Guide plein air | Outdoor Intel`
        : `${provName} Outdoor Guide | Outdoor Intel`;
    const desc = lang === 'fr'
        ? `Guide complet pour ${provName}: ${totalSpots} destinations de plein air incluant pêche, chasse, camping, kayak, ski et randonnée.`
        : `Complete outdoor guide for ${provName}: ${totalSpots} destinations including fishing, hunting, camping, kayaking, skiing, and hiking.`;
    const heroTitle = lang === 'fr' ? `Guide plein air: ${provName}` : `${provName} Outdoor Guide`;
    const heroSub = lang === 'fr'
        ? `${totalSpots} destinations vérifiées à travers ${provName}`
        : `${totalSpots} verified destinations across ${provName}`;
    const exploreTitle = lang === 'fr' ? 'Explorer par activité' : 'Explore by Activity';

    // Build category sections
    let categorySections = '';
    CATEGORIES.forEach(cat => {
        if (!spots[cat] || spots[cat].length === 0) return;
        const catLabel = lang === 'fr' ? CAT_LABELS_FR[cat] : cat.charAt(0).toUpperCase() + cat.slice(1);
        const icon = CAT_ICONS[cat];
        const spotCards = spots[cat].slice(0, 6).map(s => {
            const species = s.primary_species || s.primary_game || s.features || [];
            const speciesStr = species.slice(0, 2).join(', ');
            return `
                    <a href="../${cat}/${s.slug}.html" class="group bg-white rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all border-b-4 border-[#c97c5e]" style="box-shadow: 0 4px 12px rgba(62,49,39,0.08)">
                        <div class="text-xs font-bold text-[#c97c5e] uppercase mb-1">${s.scout_level || ''}</div>
                        <h3 class="text-lg font-bold text-[#2d5a3d] mb-1 group-hover:text-[#c97c5e] transition-colors">${s.name}</h3>
                        <p class="text-sm text-[#6b6359] mb-2">${speciesStr}</p>
                        <span class="text-xs font-semibold text-[#c97c5e]">${lang === 'fr' ? 'Voir le profil' : 'View Profile'} &rarr;</span>
                    </a>`;
        }).join('');

        const viewAll = spots[cat].length > 6
            ? `<div class="mt-6 text-center"><a href="../${cat}/directory.html" class="text-sm font-semibold text-[#c97c5e] hover:text-[#2d5a3d] transition-colors">${lang === 'fr' ? `Voir les ${spots[cat].length} spots de ${catLabel.toLowerCase()}` : `View all ${spots[cat].length} ${catLabel.toLowerCase()} spots`} &rarr;</a></div>`
            : '';

        categorySections += `
        <section class="py-12 px-6${CATEGORIES.indexOf(cat) % 2 === 0 ? '' : ' bg-[#f5f3f0]'}">
            <div class="max-w-7xl mx-auto">
                <div class="flex items-center gap-3 mb-8">
                    <span class="text-3xl">${icon}</span>
                    <h2 class="text-2xl font-bold text-[#2d5a3d]">${catLabel}</h2>
                    <span class="text-sm text-[#6b6359]">(${spots[cat].length} ${lang === 'fr' ? 'spots' : 'spots'})</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${spotCards}
                </div>
                ${viewAll}
            </div>
        </section>`;
    });

    // Quick stats
    const statCats = CATEGORIES.filter(c => spots[c] && spots[c].length > 0);
    const statsHtml = statCats.map(c => {
        const label = lang === 'fr' ? CAT_LABELS_FR[c] : c.charAt(0).toUpperCase() + c.slice(1);
        return `<div class="text-center"><div class="text-3xl font-bold text-[#c97c5e]">${spots[c].length}</div><div class="text-xs uppercase tracking-wider text-[#7a9b8e] font-semibold mt-1">${label}</div></div>`;
    }).join('');

    const frLink = lang === 'en' ? `../../fr/provinces/${slug}.html` : `../../en/provinces/${slug}.html`;
    const frLabel = lang === 'en' ? 'Français' : 'English';

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg?v=2">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png?v=2">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#2d5a3d">
    <link rel="preconnect" href="https://cdn.tailwindcss.com" crossorigin>
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://outdoorintel.ca/${lang}/provinces/${slug}.html">
    <link rel="alternate" hreflang="en" href="https://outdoorintel.ca/en/provinces/${slug}.html">
    <link rel="alternate" hreflang="fr" href="https://outdoorintel.ca/fr/provinces/${slug}.html">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="https://outdoorintel.ca/${lang}/provinces/${slug}.html">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Outdoor Intel">
    <script src="https://cdn.tailwindcss.com"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-QY8Q00962P"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-QY8Q00962P');</script>
    <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: desc,
        url: `https://outdoorintel.ca/${lang}/provinces/${slug}.html`,
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://outdoorintel.ca' },
                { '@type': 'ListItem', position: 2, name: lang === 'fr' ? 'Provinces' : 'Provinces', item: `https://outdoorintel.ca/${lang}/provinces/` },
                { '@type': 'ListItem', position: 3, name: provName }
            ]
        }
    })}</script>
</head>
<body class="bg-[#f5f3f0] text-[#3e3127] font-sans leading-relaxed">
    <header class="fixed top-0 w-full z-50 border-b border-[#2d5a3d]/10 bg-white/95 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="../../index.html" class="flex-shrink-0">
            <img src="../../assets/logo/logo.jpg" alt="Outdoor Intel" width="180" height="101" class="h-10 md:h-14 w-auto object-contain">
        </a>
        <nav class="hidden lg:flex gap-6 text-sm font-semibold text-[#3e3127]">
            <a href="../fishing/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Pêche' : 'Fishing'}</a>
            <a href="../hunting/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Chasse' : 'Hunting'}</a>
            <a href="../camping/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">Camping</a>
            <a href="../kayaking/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Kayak' : 'Kayaking'}</a>
            <a href="../skiing/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Ski' : 'Skiing'}</a>
            <a href="../hiking/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Randonnée' : 'Hiking'}</a>
            <a href="../map.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Carte' : 'Map'}</a>
            <a href="${frLink}" class="text-[#c97c5e] font-bold hover:text-[#2d5a3d] transition-colors py-2">${frLabel}</a>
        </nav>
        <button id="menu-toggle" class="lg:hidden p-2 text-[#3e3127]" aria-label="Toggle menu">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
    </div>
    </header>

    <main>
        <section class="bg-[#2d5a3d] pt-32 pb-16 px-6">
            <div class="max-w-7xl mx-auto">
                <nav class="flex items-center text-sm mb-6 text-white/60" aria-label="Breadcrumb">
                    <a href="../../index.html" class="hover:text-white transition-colors">Home</a>
                    <svg class="w-3 h-3 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    <span class="text-white font-semibold">${provName}</span>
                </nav>
                <h1 class="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">${heroTitle}</h1>
                <p class="text-xl text-white/80 mb-10 max-w-2xl">${heroSub}</p>
                <div class="bg-white/10 backdrop-blur rounded-xl p-8 inline-block">
                    <div class="flex flex-wrap gap-10">
                        <div class="text-center">
                            <div class="text-3xl font-bold text-white">${totalSpots}</div>
                            <div class="text-xs uppercase tracking-wider text-white/60 font-semibold mt-1">${lang === 'fr' ? 'Total spots' : 'Total Spots'}</div>
                        </div>
                        ${statsHtml}
                    </div>
                </div>
            </div>
        </section>

        <section class="bg-white py-8 px-6 border-b border-[#2d5a3d]/10">
            <div class="max-w-7xl mx-auto">
                <h2 class="text-lg font-bold text-[#2d5a3d] mb-4">${exploreTitle}</h2>
                <div class="flex flex-wrap gap-3">
                    ${statCats.map(c => `<a href="#${c}" class="px-4 py-2 bg-[#fef9f3] rounded-full text-sm font-semibold text-[#2d5a3d] hover:bg-[#2d5a3d] hover:text-white transition-colors">${CAT_ICONS[c]} ${lang === 'fr' ? CAT_LABELS_FR[c] : c.charAt(0).toUpperCase() + c.slice(1)}</a>`).join('\n                    ')}
                </div>
            </div>
        </section>

        ${categorySections}
    </main>

    <footer class="bg-[#2d5a3d] text-white py-16 px-6">
    <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
            <img src="../../assets/logo/logo.jpg" alt="Outdoor Intel" class="h-10 w-auto mb-4 brightness-200">
            <p class="text-white/70 text-sm">${lang === 'fr' ? "La destination ultime du plein air au Canada." : "Canada's ultimate outdoor destination."}</p>
        </div>
        <div>
            <h4 class="font-bold mb-4 text-[#c97c5e]">${lang === 'fr' ? 'Activités' : 'Activities'}</h4>
            <ul class="space-y-2 text-white/70 text-sm">
                ${CATEGORIES.map(c => `<li><a href="../${c}/directory.html" class="hover:text-[#c97c5e] transition-colors">${lang === 'fr' ? CAT_LABELS_FR[c] : c.charAt(0).toUpperCase() + c.slice(1)}</a></li>`).join('\n                ')}
            </ul>
        </div>
        <div>
            <h4 class="font-bold mb-4 text-[#c97c5e]">Resources</h4>
            <ul class="space-y-2 text-white/70 text-sm">
                <li><a href="../about.html" class="hover:text-[#c97c5e] transition-colors">${lang === 'fr' ? 'À propos' : 'About'}</a></li>
                <li><a href="../map.html" class="hover:text-[#c97c5e] transition-colors">${lang === 'fr' ? 'Carte interactive' : 'Interactive Map'}</a></li>
            </ul>
        </div>
        <div>
            <h4 class="font-bold mb-4 text-[#c97c5e]">${lang === 'fr' ? 'Langue' : 'Language'}</h4>
            <ul class="space-y-2 text-white/70 text-sm">
                <li><a href="../../en/provinces/${slug}.html" class="hover:text-[#c97c5e] transition-colors">English</a></li>
                <li><a href="../../fr/provinces/${slug}.html" class="hover:text-[#c97c5e] transition-colors">Français</a></li>
            </ul>
        </div>
    </div>
    <div class="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/20 text-center text-white/50 text-sm">
        <p>OutdoorIntel.ca &mdash; 2026. All rights reserved.</p>
    </div>
    </footer>
    <script>
    const toggle=document.getElementById('menu-toggle');const menu=document.getElementById('mobile-menu');
    if(toggle&&menu){toggle.addEventListener('click',()=>{menu.classList.toggle('hidden');});}
    </script>
    <script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js');}</script>
</body>
</html>`;
}

// Create output directories
['en/provinces', 'fr/provinces'].forEach(d => {
    const dir = path.join(__dirname, d);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let created = 0;
Object.keys(provinceSpots).forEach(province => {
    const slug = PROVINCE_SLUGS[province];
    ['en', 'fr'].forEach(lang => {
        const outFile = path.join(__dirname, lang, 'provinces', `${slug}.html`);
        fs.writeFileSync(outFile, generateHubPage(province, lang));
        created++;
    });
});

// Generate provinces index page
function generateProvinceIndex(lang) {
    const provinces = Object.keys(provinceSpots).sort();
    const title = lang === 'fr' ? 'Provinces et territoires | Outdoor Intel' : 'Provinces & Territories | Outdoor Intel';
    const heroTitle = lang === 'fr' ? 'Explorer par province' : 'Explore by Province';

    const cards = provinces.map(p => {
        const slug = PROVINCE_SLUGS[p];
        const total = Object.values(provinceSpots[p]).reduce((s, a) => s + a.length, 0);
        const cats = CATEGORIES.filter(c => provinceSpots[p][c] && provinceSpots[p][c].length > 0);
        const provName = lang === 'fr' ? (PROVINCE_FR[p] || p) : p;
        return `
                <a href="${slug}.html" class="group bg-white rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all" style="box-shadow: 0 4px 12px rgba(62,49,39,0.08)">
                    <h3 class="text-xl font-bold text-[#2d5a3d] mb-2 group-hover:text-[#c97c5e] transition-colors">${provName}</h3>
                    <p class="text-2xl font-bold text-[#c97c5e] mb-2">${total} <span class="text-sm text-[#6b6359] font-normal">${lang === 'fr' ? 'spots' : 'spots'}</span></p>
                    <div class="flex gap-1 text-lg">${cats.map(c => CAT_ICONS[c]).join(' ')}</div>
                </a>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg?v=2">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png?v=2">
    <meta name="theme-color" content="#2d5a3d">
    <title>${title}</title>
    <meta name="description" content="${lang === 'fr' ? 'Explorez les meilleures destinations de plein air du Canada par province.' : "Explore Canada's best outdoor destinations by province and territory."}">
    <link rel="canonical" href="https://outdoorintel.ca/${lang}/provinces/">
    <script src="https://cdn.tailwindcss.com"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-QY8Q00962P"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-QY8Q00962P');</script>
</head>
<body class="bg-[#f5f3f0] text-[#3e3127] font-sans leading-relaxed">
    <header class="fixed top-0 w-full z-50 border-b border-[#2d5a3d]/10 bg-white/95 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="../../index.html" class="flex-shrink-0">
            <img src="../../assets/logo/logo.jpg" alt="Outdoor Intel" width="180" height="101" class="h-10 md:h-14 w-auto object-contain">
        </a>
        <nav class="hidden lg:flex gap-6 text-sm font-semibold text-[#3e3127]">
            <a href="../fishing/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Pêche' : 'Fishing'}</a>
            <a href="../hunting/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Chasse' : 'Hunting'}</a>
            <a href="../camping/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">Camping</a>
            <a href="../kayaking/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Kayak' : 'Kayaking'}</a>
            <a href="../skiing/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Ski' : 'Skiing'}</a>
            <a href="../hiking/directory.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Randonnée' : 'Hiking'}</a>
            <a href="../map.html" class="hover:text-[#c97c5e] transition-colors py-2">${lang === 'fr' ? 'Carte' : 'Map'}</a>
        </nav>
    </div>
    </header>
    <main>
        <section class="bg-[#2d5a3d] pt-32 pb-16 px-6">
            <div class="max-w-7xl mx-auto">
                <h1 class="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">${heroTitle}</h1>
                <p class="text-xl text-white/80 max-w-2xl">${lang === 'fr' ? `${provinces.length} provinces et territoires, ${Object.values(provinceSpots).reduce((s, p) => s + Object.values(p).reduce((s2, a) => s2 + a.length, 0), 0)}+ spots` : `${provinces.length} provinces & territories, ${Object.values(provinceSpots).reduce((s, p) => s + Object.values(p).reduce((s2, a) => s2 + a.length, 0), 0)}+ spots`}</p>
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
        <p class="text-white/50 text-sm">OutdoorIntel.ca &mdash; 2026. All rights reserved.</p>
    </footer>
    <script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js');}</script>
</body>
</html>`;
}

// Write index pages
fs.writeFileSync(path.join(__dirname, 'en', 'provinces', 'index.html'), generateProvinceIndex('en'));
fs.writeFileSync(path.join(__dirname, 'fr', 'provinces', 'index.html'), generateProvinceIndex('fr'));
created += 2;

console.log(`Generated ${created} province hub pages.`);
