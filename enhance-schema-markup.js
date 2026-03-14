const fs = require('fs');
const path = require('path');

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
        if (filePath.includes(`/${cat}/`)) return cat;
    }
    return null;
}

function getSlug(filePath) {
    return path.basename(filePath, '.html');
}

function buildEnhancedSchema(spot, cat, lang) {
    const baseUrl = 'https://outdoorintel.ca';
    const schema = {
        '@context': 'https://schema.org',
        '@type': ['TouristAttraction', 'Place'],
        name: spot.name,
        description: (spot.description || '').substring(0, 300),
        url: `${baseUrl}/${lang}/${cat}/${spot.slug}.html`,
        address: {
            '@type': 'PostalAddress',
            addressRegion: spot.province,
            addressCountry: 'CA'
        },
        isAccessibleForFree: true,
        publicAccess: true,
        touristType: cat.charAt(0).toUpperCase() + cat.slice(1)
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

    // Activity-specific enrichment
    const keywords = [];
    if (spot.primary_species) keywords.push(...spot.primary_species);
    if (spot.primary_game) keywords.push(...spot.primary_game);
    if (spot.features) keywords.push(...spot.features);
    keywords.push(cat, spot.province, 'Canada', 'outdoor');
    schema.keywords = keywords.join(', ');

    if (spot.scout_level) {
        schema.additionalProperty = [
            { '@type': 'PropertyValue', name: 'Scout Level', value: spot.scout_level },
            { '@type': 'PropertyValue', name: 'Intel Grade', value: spot.intel_grade || 'v2.2' }
        ];
    }

    if (spot.depth_max) {
        schema.maximumAttendeeCapacity = undefined; // not relevant
    }

    if (spot.website) {
        schema.sameAs = spot.website;
    }

    return JSON.stringify(schema);
}

const files = findSpotHtml(path.join(__dirname, 'en')).concat(findSpotHtml(path.join(__dirname, 'fr')));
let updated = 0;

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');

    const cat = getCategory(f);
    const slug = getSlug(f);
    if (!cat || !allSpots[cat] || !allSpots[cat][slug]) return;

    const spot = allSpots[cat][slug];
    const lang = f.includes('/fr/') ? 'fr' : 'en';

    // Replace existing basic Place schema with enhanced one
    const schemaRegex = /<script type="application\/ld\+json">\{"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"Place"[^<]*<\/script>/;
    if (schemaRegex.test(html)) {
        const enhanced = `<script type="application/ld+json">${buildEnhancedSchema(spot, cat, lang)}</script>`;
        html = html.replace(schemaRegex, enhanced);
        fs.writeFileSync(f, html);
        updated++;
    }
});

console.log(`Enhanced schema markup on ${updated} spot pages.`);
