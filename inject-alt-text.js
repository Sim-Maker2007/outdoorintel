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

const files = findSpotHtml(path.join(__dirname, 'en')).concat(findSpotHtml(path.join(__dirname, 'fr')));
let updated = 0;

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    const cat = getCategory(f);
    const slug = getSlug(f);
    if (!cat || !allSpots[cat] || !allSpots[cat][slug]) return;

    const spot = allSpots[cat][slug];
    let changed = false;

    // Fix hero background image — add descriptive alt in og:image meta (already present, but improve)
    // Update the og:image alt via og:image:alt meta tag
    if (!html.includes('og:image:alt')) {
        const altText = `${spot.name} - ${cat} destination in ${spot.province}, Canada`;
        const ogImageAlt = `\n    <meta property="og:image:alt" content="${altText}">`;
        html = html.replace('</head>', ogImageAlt + '\n</head>');
        changed = true;
    }

    // Fix any generic alt="" on images
    const genericAlts = html.match(/alt=""/g);
    if (genericAlts) {
        let idx = 0;
        html = html.replace(/alt=""/g, () => {
            idx++;
            if (idx === 1) return `alt="${spot.name} - ${cat} in ${spot.province}"`;
            return `alt="${spot.name} outdoor scene"`;
        });
        changed = true;
    }

    // Fix scout-hero image references without descriptive alt text
    const heroRegex = /alt="scout-hero[^"]*"/g;
    if (heroRegex.test(html)) {
        html = html.replace(heroRegex, `alt="${spot.name} - ${cat} destination in ${spot.province}, Canada"`);
        changed = true;
    }

    // Ensure the meta description is rich and descriptive
    const speciesStr = spot.primary_species ? spot.primary_species.join(', ') :
                       spot.primary_game ? spot.primary_game.join(', ') : '';
    const currentDesc = html.match(/meta name="description" content="([^"]*)"/);
    if (currentDesc && currentDesc[1].length < 120 && speciesStr) {
        const betterDesc = `${spot.name} ${cat} guide - ${spot.province}, Canada. ${speciesStr}. Seasonal tips, regulations, gear checklist, and local intel for your next outdoor adventure.`;
        html = html.replace(currentDesc[0], `meta name="description" content="${betterDesc}"`);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(f, html);
        updated++;
    }
});

console.log(`Image alt text & meta descriptions optimized on ${updated} spot pages.`);
