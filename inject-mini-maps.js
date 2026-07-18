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

const LEAFLET_CSS = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">';
const LEAFLET_JS = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>';

function buildMapSection(spot, lang) {
    const lat = spot.coordinates.lat;
    const lng = spot.coordinates.lng;
    const mapId = 'spot-mini-map';
    const title = lang === 'fr' ? 'Localisation' : 'Location Map';
    const viewLarger = lang === 'fr' ? 'Voir sur la carte complète' : 'View on full map';

    return `
        <section class="bg-white py-16 px-6" id="location-map">
            <div class="max-w-7xl mx-auto">
                <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-[#2d5a3d] rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                        </div>
                        <h2 class="text-3xl font-bold text-[#2d5a3d]">${title}</h2>
                    </div>
                    <a href="../map.html" class="text-sm font-semibold text-[#c97c5e] hover:text-[#2d5a3d] transition-colors">${viewLarger} &rarr;</a>
                </div>
                <div class="rounded-xl overflow-hidden border border-[#2d5a3d]/10" style="box-shadow: 0 4px 12px rgba(62,49,39,0.08)">
                    <div id="${mapId}" style="height:400px;width:100%;"></div>
                </div>
                <p class="text-sm text-[#6b6359] mt-3">GPS: ${lat}&deg;N, ${Math.abs(lng)}&deg;W</p>
            </div>
        </section>
        <script>
        (function(){
            var map = L.map('${mapId}', {scrollWheelZoom: false}).setView([${lat}, ${lng}], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(map);
            var marker = L.marker([${lat}, ${lng}]).addTo(map);
            marker.bindPopup('<strong>${spot.name.replace(/'/g, "\\'")}</strong><br>${spot.province}').openPopup();
            setTimeout(function(){ map.invalidateSize(); }, 200);
        })();
        </script>`;
}

const files = findSpotHtml(path.join(__dirname, 'en')).concat(findSpotHtml(path.join(__dirname, 'fr')));
let updated = 0;

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    if (html.includes('spot-mini-map')) return; // already has map

    const cat = getCategory(f);
    const slug = getSlug(f);
    if (!cat || !allSpots[cat] || !allSpots[cat][slug]) return;

    const spot = allSpots[cat][slug];
    if (!spot.coordinates || !spot.coordinates.lat || !spot.coordinates.lng) return;

    const lang = f.includes('/fr/') ? 'fr' : 'en';
    const mapHtml = buildMapSection(spot, lang);

    // Add Leaflet CSS/JS to head if not present
    if (!html.includes('leaflet.css')) {
        html = html.replace('</head>', `    ${LEAFLET_CSS}\n    ${LEAFLET_JS}\n</head>`);
    }

    // Insert map after the "About This Place" section (before terrain/getting_there grid)
    const insertPoint = html.indexOf('<section class="bg-[#f5f3f0] py-16 px-6">');
    if (insertPoint > -1) {
        html = html.slice(0, insertPoint) + mapHtml + '\n        ' + html.slice(insertPoint);
        fs.writeFileSync(f, html);
        updated++;
    }
});

console.log(`Mini-maps injected into ${updated} spot pages.`);
