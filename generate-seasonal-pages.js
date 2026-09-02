const fs = require('fs');
const path = require('path');

const CATEGORIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const allSpots = {};

CATEGORIES.forEach(cat => {
    const dataFile = path.join(__dirname, 'data', `${cat}.json`);
    if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        allSpots[cat] = data.spots;
    }
});

const SEASONS = [
    {
        slug: 'spring-fishing-guide',
        en: {
            title: 'Spring Fishing Guide 2026 | Ice-Out to Open Water',
            h1: 'Spring Fishing Guide: Canada',
            subtitle: 'Ice-out tactics, early-season hotspots, and gear recommendations for spring fishing across Canada.',
            intro: 'Spring is the most exciting time for Canadian anglers. As ice melts and water temperatures rise, fish become aggressively active. This guide covers the best strategies for the spring transition period across Canada\'s premier fishing destinations.',
            sections: [
                {
                    title: 'Ice-Out Strategy',
                    content: 'The first open water of the season concentrates fish near shore in warming shallows. Target south-facing bays first — they warm 3-5 degrees faster than north-facing shorelines. Focus on depths of 3-8 feet where baitfish congregate near emerging vegetation. Early morning and late afternoon remain the most productive windows, but overcast days can extend the bite throughout the day.'
                },
                {
                    title: 'Top Spring Species & Tactics',
                    content: 'Walleye: Move to river mouths and tributaries during spring spawning runs (late April - May). Use jig-and-minnow combinations in 6-12 feet of water. Drag slowly along rocky bottoms near current breaks.\n\nLake Trout: Post-ice-out lakers cruise the shallows (10-20 feet) before retreating to deeper water by mid-June. Troll spoons or cast swimbaits along rocky points.\n\nSmallmouth Bass: Target warming flats (55-65°F water temp) with drop-shot rigs or tube jigs. Smallmouth move shallow progressively as water warms.\n\nNorthern Pike: Spring pike are aggressive in marshes and shallow bays. Cast large spinnerbaits or swim jigs through emerging weed beds.'
                },
                {
                    title: 'Essential Spring Gear',
                    content: 'Water temperatures are unpredictable in spring. Pack layers including a waterproof shell — sudden rain and wind are common. Neoprene gloves are essential for early mornings. Bring multiple rod setups: a medium-light spinning rod for walleye/bass jigging, and a medium-heavy baitcaster for pike and lake trout trolling. Spring-specific lure colours: chartreuse, white, and natural baitfish patterns tend to outperform in murky spring water.'
                }
            ]
        },
        fr: {
            title: 'Guide de pêche printanière 2026 | Débâcle et eau libre',
            h1: 'Guide de pêche printanière: Canada',
            subtitle: 'Tactiques de débâcle, meilleurs spots de début de saison et recommandations d\'équipement pour la pêche printanière au Canada.',
            intro: 'Le printemps est la période la plus excitante pour les pêcheurs canadiens. Lorsque la glace fond et que les températures de l\'eau augmentent, les poissons deviennent agressivement actifs. Ce guide couvre les meilleures stratégies pour la période de transition printanière à travers les destinations de pêche du Canada.',
            sections: [
                { title: 'Stratégie de débâcle', content: 'Les premières eaux libres de la saison concentrent les poissons près des rives dans les hauts-fonds qui se réchauffent. Ciblez d\'abord les baies exposées au sud — elles se réchauffent 3 à 5 degrés plus vite que les rives exposées au nord.' },
                { title: 'Espèces et tactiques printanières', content: 'Doré: Dirigez-vous vers les embouchures de rivières pendant les montaisons printanières (fin avril - mai). Utilisez des combinaisons jig-méné en eau de 2-4 mètres.\n\nTruite de lac: Après la débâcle, les truites croisent dans les hauts-fonds (3-6 mètres) avant de retourner en profondeur à la mi-juin.\n\nBrochet: Les brochets printaniers sont agressifs dans les marais et baies peu profondes.' },
                { title: 'Équipement essentiel printanier', content: 'Les températures sont imprévisibles au printemps. Apportez des couches incluant une coquille imperméable. Les gants en néoprène sont essentiels pour les matins frais.' }
            ]
        },
        activity: 'fishing',
        spotFilter: s => s.primary_species && (s.primary_species.includes('Walleye') || s.primary_species.includes('Lake Trout') || s.primary_species.includes('Smallmouth Bass'))
    },
    {
        slug: 'fall-hunting-guide',
        en: {
            title: 'Fall Hunting Guide 2026 | Big Game Season Preparation',
            h1: 'Fall Hunting Guide: Canada',
            subtitle: 'Rut strategies, scouting tactics, and province-by-province season intel for Canadian big game hunters.',
            intro: 'Fall in Canada means big game season. From the rut-crazed whitetails of Ontario to the massive bull moose of British Columbia, autumn offers Canada\'s most productive hunting opportunities. This guide breaks down the key strategies, timing, and preparation you need for a successful fall hunt.',
            sections: [
                {
                    title: 'Rut Timing by Region',
                    content: 'The whitetail rut peaks between late October and mid-November across most of Canada, but timing varies by latitude. Northern Ontario and Quebec see pre-rut activity starting in late October, with peak breeding November 5-15. Southern Ontario and the Maritimes peak slightly later, November 10-20. Understanding your zone\'s rut timing is critical — plan your vacation days around the peak breeding phase for the best action.'
                },
                {
                    title: 'Scouting & Stand Placement',
                    content: 'Start scouting 4-6 weeks before your hunt. Focus on three key sign types: rubs (indicate buck travel corridors), scrapes (mark territorial boundaries), and trails connecting bedding areas to food sources. Trail cameras are invaluable — place them at trail intersections and field edges. For treestand placement, prioritize funnels: narrow strips of cover between two open areas that concentrate deer movement. Always hang stands with the prevailing wind in your favour — scent control is the #1 factor in mature buck success.'
                },
                {
                    title: 'Essential Fall Hunting Gear',
                    content: 'Base layer: Merino wool (not cotton) for temperature regulation. Mid layer: Fleece or down insulation. Outer layer: Quiet, wind-resistant hunting jacket in appropriate camouflage. Footwear: Insulated rubber boots (1000g+ Thinsulate for late season). Accessories: Quality binoculars (10x42 recommended), rangefinder, grunt call and rattling antlers for the rut. Safety: Blaze orange as required by law, first aid kit, satellite communicator for remote areas.'
                }
            ]
        },
        fr: {
            title: 'Guide de chasse automnale 2026 | Préparation pour le gros gibier',
            h1: 'Guide de chasse automnale: Canada',
            subtitle: 'Stratégies de rut, tactiques de repérage et renseignements saisonniers province par province pour les chasseurs canadiens.',
            intro: 'L\'automne au Canada signifie la saison du gros gibier. Des chevreuils en rut de l\'Ontario aux orignaux massifs de la Colombie-Britannique, l\'automne offre les meilleures opportunités de chasse au Canada.',
            sections: [
                { title: 'Chronologie du rut par région', content: 'Le rut du cerf de Virginie atteint son pic entre fin octobre et mi-novembre dans la plupart du Canada. Le nord de l\'Ontario et du Québec voit l\'activité de pré-rut commencer fin octobre, avec un pic de reproduction du 5 au 15 novembre.' },
                { title: 'Repérage et placement d\'affût', content: 'Commencez le repérage 4 à 6 semaines avant votre chasse. Concentrez-vous sur trois types de signes: les frottoirs, les grattages et les sentiers reliant les zones de repos aux sources de nourriture.' },
                { title: 'Équipement essentiel de chasse automnale', content: 'Couche de base: Laine mérinos pour la régulation de température. Couche intermédiaire: Polaire ou duvet. Couche extérieure: Veste de chasse silencieuse et coupe-vent. Chaussures: Bottes en caoutchouc isolées.' }
            ]
        },
        activity: 'hunting',
        spotFilter: s => s.season && s.season.includes('September')
    },
    {
        slug: 'summer-camping-guide',
        en: {
            title: 'Summer Camping Guide 2026 | Best Campsites Across Canada',
            h1: 'Summer Camping Guide: Canada',
            subtitle: 'Top campgrounds, reservation tips, gear essentials, and insider tricks for the perfect Canadian summer camping trip.',
            intro: 'Summer camping in Canada is a national tradition. With over 3,000 provincial and national park campgrounds, the options are endless — but the best sites book fast. This guide covers everything from reservation strategy to campsite selection and gear that actually works in Canadian conditions.',
            sections: [
                {
                    title: 'Reservation Strategy',
                    content: 'Parks Canada sites open for booking in January for the following summer — mark your calendar and be online at exactly 8:00 AM ET on opening day. Provincial parks vary: Ontario opens 5 months ahead, Quebec 4 months, BC 2 months. Pro tip: weekday arrivals (Tuesday-Thursday) have significantly higher availability. For popular parks like Banff, Algonquin, or Pacific Rim, have 2-3 backup dates ready. Walk-in campsites at backcountry locations are first-come-first-served — arrive by 10 AM on summer weekends.'
                },
                {
                    title: 'Choosing the Right Campsite',
                    content: 'Look for sites with natural wind protection (tree cover on the prevailing wind side), morning sun exposure (east-facing for warm mornings and dry tents), and proximity to water without being in a low-lying flood zone. Avoid sites near bathrooms (noise + odors) or at the end of dead-end roads (less traffic but harder to exit). For families, sites near playgrounds and beach access are ideal. For solitude seekers, target walk-in sites or the last loop in the campground.'
                },
                {
                    title: 'Summer Camping Essentials',
                    content: 'Shelter: 3-season tent rated for rain (test waterproofing before your trip). Sleep system: Sleeping bag rated to 5°C for mountain camping, 10°C for lowland. Cooking: Two-burner stove + fuel, cast iron pan, and a reliable cooler with block ice (lasts 3x longer than cubes). Bear safety: Bear canister or hang bag in bear country — never store food in your tent. Bug protection: Screened shelter or bug jacket for June-July blackfly season. Bring more firewood than you think you need.'
                }
            ]
        },
        fr: {
            title: 'Guide de camping estival 2026 | Meilleurs campings au Canada',
            h1: 'Guide de camping estival: Canada',
            subtitle: 'Meilleurs campings, conseils de réservation et équipement essentiel pour le camping estival au Canada.',
            intro: 'Le camping estival au Canada est une tradition nationale. Avec plus de 3 000 terrains de camping dans les parcs provinciaux et nationaux, les options sont infinies — mais les meilleurs sites se remplissent vite.',
            sections: [
                { title: 'Stratégie de réservation', content: 'Les sites de Parcs Canada ouvrent à la réservation en janvier pour l\'été suivant. Les parcs provinciaux varient: l\'Ontario ouvre 5 mois à l\'avance, le Québec 4 mois, la C.-B. 2 mois. Conseil: les arrivées en semaine ont une disponibilité nettement supérieure.' },
                { title: 'Choisir le bon emplacement', content: 'Recherchez les sites avec une protection naturelle contre le vent, une exposition au soleil du matin (orienté est) et une proximité de l\'eau sans être en zone inondable.' },
                { title: 'Essentiels du camping estival', content: 'Abri: Tente 3 saisons résistante à la pluie. Couchage: Sac de couchage coté à 5°C pour le camping en montagne. Cuisine: Réchaud à deux brûleurs et glacière fiable avec glace en bloc.' }
            ]
        },
        activity: 'camping',
        spotFilter: s => true
    },
    {
        slug: 'winter-skiing-guide',
        en: {
            title: 'Winter Skiing Guide 2026 | Best Ski Resorts in Canada',
            h1: 'Winter Skiing Guide: Canada',
            subtitle: 'Top resorts, snow conditions, pass comparisons, and expert tips for the Canadian ski season.',
            intro: 'Canada boasts some of the best skiing on Earth — from Whistler\'s massive vertical to Quebec\'s charming Eastern Townships resorts. Whether you\'re chasing powder in the Rockies or carving groomers in Ontario, this guide has the intel you need for the perfect ski trip.',
            sections: [
                {
                    title: 'Snow Conditions by Region',
                    content: 'British Columbia: Coastal mountains (Whistler, Sun Peaks) get heavy, wet snow early season transitioning to drier powder by January. Interior BC (Revelstoke, Kicking Horse) receives some of the deepest, driest powder in North America — 10-14 metres annually. Alberta: Rockies resorts (Lake Louise, Sunshine Village) benefit from cold temperatures preserving dry snow. Expect consistent coverage November through April. Quebec: Mont-Tremblant, Le Massif, and Stoneham receive 400-600cm annually. Eastern snow is often groomed best — Quebec resorts invest heavily in snowmaking. Ontario: Smaller hills but excellent for day trips. Blue Mountain is the flagship with reliable conditions December through March.'
                },
                {
                    title: 'Season Pass Strategy',
                    content: 'The Ikon Pass covers Tremblant, Revelstoke, and several BC resorts — best value for multi-resort skiers. The Epic Pass includes Whistler Blackcomb. For Quebec-focused skiers, the Totem Pass covers multiple Laurentian resorts. Buy passes in spring/summer for the biggest discounts (often 30-40% off). Single-day tickets now exceed $150 at major resorts, making passes worthwhile after just 4-5 days.'
                },
                {
                    title: 'Essential Ski Gear for Canadian Conditions',
                    content: 'Canadian temperatures can plunge below -25°C. Layering is critical: moisture-wicking base, insulating mid-layer, and a waterproof/breathable shell. Heated gloves or mitts are a game-changer for extreme cold days. Goggles: bring two lens options (low-light yellow/rose for flat light, dark for bluebird days). Helmet: non-negotiable in Canada — most resorts strongly recommend them. For backcountry: avalanche transceiver, probe, and shovel are mandatory — take an AST 1 course before heading out of bounds.'
                }
            ]
        },
        fr: {
            title: 'Guide de ski hivernal 2026 | Meilleures stations au Canada',
            h1: 'Guide de ski hivernal: Canada',
            subtitle: 'Meilleures stations, conditions de neige et conseils d\'experts pour la saison de ski au Canada.',
            intro: 'Le Canada possède certaines des meilleures conditions de ski au monde — de la verticale massive de Whistler aux charmantes stations des Cantons-de-l\'Est du Québec.',
            sections: [
                { title: 'Conditions de neige par région', content: 'Colombie-Britannique: Les montagnes côtières reçoivent une neige abondante et humide en début de saison. L\'intérieur de la C.-B. reçoit la poudreuse la plus profonde et la plus sèche en Amérique du Nord. Québec: Mont-Tremblant, Le Massif et Stoneham reçoivent 400-600 cm annuellement.' },
                { title: 'Stratégie de passes de saison', content: 'Le Ikon Pass couvre Tremblant, Revelstoke et plusieurs stations de C.-B. Le Epic Pass inclut Whistler Blackcomb. Achetez les passes au printemps/été pour les plus gros rabais.' },
                { title: 'Équipement essentiel pour le ski au Canada', content: 'Les températures canadiennes peuvent descendre sous -25°C. Les couches sont critiques: base évacuant l\'humidité, couche isolante et coquille imperméable/respirante.' }
            ]
        },
        activity: 'skiing',
        spotFilter: s => true
    }
];

function generateSeasonalPage(season, lang) {
    const data = season[lang];
    const spots = allSpots[season.activity] || [];
    const filtered = spots.filter(season.spotFilter).slice(0, 6);
    const cat = season.activity;

    const spotsHtml = filtered.map(s => {
        const species = s.primary_species || s.primary_game || s.features || [];
        return `
                    <a href="../${cat}/${s.slug}.html" class="group bg-white rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all border-b-4 border-[#c97c5e]" style="box-shadow: 0 4px 12px rgba(62,49,39,0.08)">
                        <div class="text-xs font-bold text-[#c97c5e] uppercase mb-1">${s.province} &bull; ${s.scout_level || ''}</div>
                        <h3 class="text-lg font-bold text-[#2d5a3d] mb-1 group-hover:text-[#c97c5e] transition-colors">${s.name}</h3>
                        <p class="text-sm text-[#6b6359] mb-2">${species.slice(0, 3).join(', ')}</p>
                        <span class="text-xs font-semibold text-[#c97c5e]">${lang === 'fr' ? 'Voir le profil' : 'View Profile'} &rarr;</span>
                    </a>`;
    }).join('');

    const sectionsHtml = data.sections.map((sec, i) => `
        <section class="py-12 px-6${i % 2 === 0 ? ' bg-white' : ''}">
            <div class="max-w-4xl mx-auto">
                <h2 class="text-2xl font-bold text-[#2d5a3d] mb-4">${sec.title}</h2>
                <div class="text-lg text-[#3e3127] leading-relaxed whitespace-pre-line">${sec.content}</div>
            </div>
        </section>`).join('');

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg?v=2">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png?v=2">
    <meta name="theme-color" content="#2d5a3d">
    <title>${data.title}</title>
    <meta name="description" content="${data.subtitle}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://outdoorintel.ca/${lang}/guides/${season.slug}.html">
    <link rel="alternate" hreflang="en" href="https://outdoorintel.ca/en/guides/${season.slug}.html">
    <link rel="alternate" hreflang="fr" href="https://outdoorintel.ca/fr/guides/${season.slug}.html">
    <meta property="og:title" content="${data.title}">
    <meta property="og:description" content="${data.subtitle}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Outdoor Intel">
    <script src="https://cdn.tailwindcss.com"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-QY8Q00962P"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-QY8Q00962P');</script>
    <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: data.h1,
        description: data.subtitle,
        author: { '@type': 'Organization', name: 'Outdoor Intel' },
        publisher: { '@type': 'Organization', name: 'Outdoor Intel', url: 'https://outdoorintel.ca' },
        datePublished: '2026-03-14',
        dateModified: '2026-03-14'
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
        </nav>
    </div>
    </header>

    <main>
        <section class="bg-[#2d5a3d] pt-32 pb-16 px-6">
            <div class="max-w-7xl mx-auto">
                <nav class="flex items-center text-sm mb-6 text-white/60" aria-label="Breadcrumb">
                    <a href="../../index.html" class="hover:text-white transition-colors">Home</a>
                    <svg class="w-3 h-3 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    <a href="index.html" class="hover:text-white transition-colors">${lang === 'fr' ? 'Guides' : 'Guides'}</a>
                    <svg class="w-3 h-3 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    <span class="text-white font-semibold">${data.h1}</span>
                </nav>
                <h1 class="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">${data.h1}</h1>
                <p class="text-xl text-white/80 max-w-2xl">${data.subtitle}</p>
            </div>
        </section>

        <section class="bg-white py-12 px-6">
            <div class="max-w-4xl mx-auto">
                <p class="text-lg text-[#3e3127] leading-relaxed">${data.intro}</p>
            </div>
        </section>

        ${sectionsHtml}

        <section class="bg-[#fef9f3] py-12 px-6">
            <div class="max-w-7xl mx-auto">
                <h2 class="text-2xl font-bold text-[#2d5a3d] mb-6">${lang === 'fr' ? 'Spots recommandés' : 'Recommended Spots'}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${spotsHtml}
                </div>
            </div>
        </section>

        <section class="bg-[#2d5a3d] py-12 px-6 text-white text-center">
            <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl font-bold mb-2">${lang === 'fr' ? 'Intel plein air chaque semaine' : 'Get Weekly Outdoor Intel'}</h2>
                <p class="text-white/80 mb-6">${lang === 'fr' ? 'Tactiques saisonnières et nouveaux spots — dans votre boîte chaque jeudi.' : 'Seasonal tactics, gear that works, and new spots — straight to your inbox every Thursday.'}</p>
                <form class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" action="YOUR_MAILCHIMP_FORM_ACTION_URL" method="POST" target="_blank">
                    <input type="email" name="EMAIL" required placeholder="${lang === 'fr' ? 'Votre courriel' : 'Your email'}" class="flex-1 px-4 py-3 rounded-lg text-[#3e3127] bg-white placeholder-[#6b6359] text-sm focus:outline-none focus:ring-2 focus:ring-[#c97c5e]">
                    <button type="submit" class="px-6 py-3 bg-[#c97c5e] text-white text-sm font-semibold rounded-lg hover:bg-white hover:text-[#2d5a3d] transition-colors">${lang === 'fr' ? "S'abonner" : 'Subscribe'}</button>
                </form>
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

// Create guides directories
['en/guides', 'fr/guides'].forEach(d => {
    const dir = path.join(__dirname, d);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let created = 0;
SEASONS.forEach(season => {
    ['en', 'fr'].forEach(lang => {
        const outFile = path.join(__dirname, lang, 'guides', `${season.slug}.html`);
        fs.writeFileSync(outFile, generateSeasonalPage(season, lang));
        created++;
    });
});

// Generate guides index
function generateGuidesIndex(lang) {
    const title = lang === 'fr' ? 'Guides saisonniers | Outdoor Intel' : 'Seasonal Guides | Outdoor Intel';
    const cards = SEASONS.map(s => {
        const d = s[lang];
        return `
                <a href="${s.slug}.html" class="group bg-white rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all" style="box-shadow: 0 4px 12px rgba(62,49,39,0.08)">
                    <h3 class="text-xl font-bold text-[#2d5a3d] mb-2 group-hover:text-[#c97c5e] transition-colors">${d.h1}</h3>
                    <p class="text-[#6b6359] text-sm mb-4">${d.subtitle}</p>
                    <span class="text-xs font-semibold text-[#c97c5e]">${lang === 'fr' ? 'Lire le guide' : 'Read Guide'} &rarr;</span>
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
    <meta name="description" content="${lang === 'fr' ? 'Guides saisonniers pour le plein air au Canada.' : 'Seasonal outdoor guides for Canada.'}">
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
    </div>
    </header>
    <main>
        <section class="bg-[#2d5a3d] pt-32 pb-16 px-6">
            <div class="max-w-7xl mx-auto">
                <h1 class="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">${lang === 'fr' ? 'Guides saisonniers' : 'Seasonal Guides'}</h1>
                <p class="text-xl text-white/80">${lang === 'fr' ? 'Stratégies et conseils pour chaque saison au Canada.' : 'Strategies and tips for every season in Canada.'}</p>
            </div>
        </section>
        <section class="py-12 px-6">
            <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                ${cards}
            </div>
        </section>
    </main>
    <footer class="bg-[#2d5a3d] text-white py-12 px-6 text-center">
        <p class="text-white/50 text-sm">OutdoorIntel.ca &mdash; 2026.</p>
    </footer>
</body>
</html>`;
}

fs.writeFileSync(path.join(__dirname, 'en', 'guides', 'index.html'), generateGuidesIndex('en'));
fs.writeFileSync(path.join(__dirname, 'fr', 'guides', 'index.html'), generateGuidesIndex('fr'));
created += 2;

console.log(`Generated ${created} seasonal guide pages.`);
