const fs = require('fs');
const path = require('path');

// Load all spot data
const CATEGORIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const allSpots = {};

CATEGORIES.forEach(cat => {
    const dataFile = path.join(__dirname, 'data', `${cat}.json`);
    if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        allSpots[cat] = {};
        data.spots.forEach(s => { allSpots[cat][s.slug] = s; });
    }
});

function findSpotHtml(dir) {
    const results = [];
    for (const item of fs.readdirSync(dir)) {
        if (item === '.git' || item === 'node_modules' || item === 'data') continue;
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            results.push(...findSpotHtml(full));
        } else if (item.endsWith('.html') && !item.includes('directory') && !item.includes('blog')) {
            results.push(full);
        }
    }
    return results;
}

function getCategory(filePath) {
    for (const cat of CATEGORIES) {
        if (filePath.includes(`/${cat}/`) || filePath.includes(`\\${cat}\\`)) return cat;
    }
    return null;
}

function getSlug(filePath) {
    return path.basename(filePath, '.html');
}

function getActivityType(cat) {
    const types = {
        fishing: 'FishingTrip',
        hunting: 'SportsEvent',
        camping: 'Campground',
        kayaking: 'SportsActivityLocation',
        skiing: 'SkiResort',
        hiking: 'SportsActivityLocation'
    };
    return types[cat] || 'TouristAttraction';
}

function buildSchema(spot, cat, lang) {
    const baseUrl = 'https://outdoorintel.ca';
    const pagePath = `/${lang}/${cat}/${spot.slug}.html`;

    const schema = {
        '@context': 'https://schema.org',
        '@type': ['TouristAttraction', 'Place'],
        name: spot.name,
        description: spot.description ? spot.description.substring(0, 300) : `${spot.name} - ${cat} destination in ${spot.province}, Canada.`,
        url: baseUrl + pagePath,
        address: {
            '@type': 'PostalAddress',
            addressRegion: spot.province,
            addressCountry: 'CA'
        },
        isAccessibleForFree: true,
        publicAccess: true
    };

    if (spot.coordinates) {
        schema.geo = {
            '@type': 'GeoCoordinates',
            latitude: spot.coordinates.lat,
            longitude: spot.coordinates.lng
        };
    }

    if (spot.hero_image) {
        schema.image = `${baseUrl}/assets/heros/${spot.hero_image}`;
    }

    // Add activity-specific properties
    if (cat === 'fishing' && spot.primary_species) {
        schema.keywords = spot.primary_species.join(', ') + ', fishing, ' + spot.province;
    } else if (cat === 'hunting' && spot.primary_game) {
        schema.keywords = spot.primary_game.join(', ') + ', hunting, ' + spot.province;
    } else if (cat === 'camping' && spot.features) {
        schema.amenityFeature = spot.features.map(f => ({
            '@type': 'LocationFeatureSpecification',
            name: f
        }));
    }

    if (spot.scout_level) {
        schema.additionalProperty = {
            '@type': 'PropertyValue',
            name: 'Scout Level',
            value: spot.scout_level
        };
    }

    // Add breadcrumb schema
    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
            { '@type': 'ListItem', position: 2, name: cat.charAt(0).toUpperCase() + cat.slice(1), item: `${baseUrl}/${lang}/${cat}/directory.html` },
            { '@type': 'ListItem', position: 3, name: spot.name }
        ]
    };

    return `\n    <script type="application/ld+json">${JSON.stringify(schema)}</script>\n    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
}

const files = findSpotHtml(path.join(__dirname, 'en')).concat(findSpotHtml(path.join(__dirname, 'fr')));
let updated = 0;

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    if (html.includes('application/ld+json')) return; // already has schema

    const cat = getCategory(f);
    const slug = getSlug(f);
    if (!cat || !allSpots[cat] || !allSpots[cat][slug]) return;

    const spot = allSpots[cat][slug];
    const lang = f.includes('/fr/') ? 'fr' : 'en';
    const schemaMarkup = buildSchema(spot, cat, lang);

    if (html.includes('</head>')) {
        html = html.replace('</head>', schemaMarkup + '\n</head>');
        fs.writeFileSync(f, html);
        updated++;
    }
});

console.log(`Schema markup (JSON-LD) injected into ${updated} spot pages.`);
