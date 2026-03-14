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

function buildWeatherWidget(spot, lang) {
    const lat = spot.coordinates.lat;
    const lng = spot.coordinates.lng;
    const title = lang === 'fr' ? 'Météo actuelle' : 'Current Weather';
    const subtitle = lang === 'fr' ? 'Conditions en temps réel via Open-Meteo' : 'Live conditions via Open-Meteo';
    const loading = lang === 'fr' ? 'Chargement de la météo...' : 'Loading weather data...';
    const windLabel = lang === 'fr' ? 'Vent' : 'Wind';
    const humidityLabel = lang === 'fr' ? 'Humidité' : 'Humidity';
    const precipLabel = lang === 'fr' ? 'Précip.' : 'Precip.';
    const feelsLike = lang === 'fr' ? 'Ressenti' : 'Feels like';

    return `
        <section class="bg-[#f5f3f0] py-12 px-6" id="weather-widget">
            <div class="max-w-7xl mx-auto">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 bg-[#c97c5e] rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold text-[#2d5a3d]">${title}</h2>
                        <p class="text-xs text-[#6b6359]">${subtitle}</p>
                    </div>
                </div>
                <div id="weather-data" class="bg-white rounded-xl p-6" style="box-shadow: 0 4px 12px rgba(62,49,39,0.08)">
                    <p class="text-[#6b6359] text-sm">${loading}</p>
                </div>
            </div>
        </section>
        <script>
        (function(){
            var lat = ${lat}, lng = ${lng};
            var el = document.getElementById('weather-data');
            var WMO = {0:'Clear',1:'Mostly Clear',2:'Partly Cloudy',3:'Overcast',45:'Foggy',48:'Fog',51:'Light Drizzle',53:'Drizzle',55:'Heavy Drizzle',61:'Light Rain',63:'Rain',65:'Heavy Rain',71:'Light Snow',73:'Snow',75:'Heavy Snow',80:'Rain Showers',81:'Moderate Showers',82:'Heavy Showers',85:'Snow Showers',86:'Heavy Snow Showers',95:'Thunderstorm',96:'Thunderstorm + Hail',99:'Severe Thunderstorm'};
            var ICONS = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',85:'🌨️',86:'❄️',95:'⛈️',96:'⛈️',99:'⛈️'};
            fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lng+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto')
            .then(function(r){return r.json()})
            .then(function(d){
                if(!d.current){el.innerHTML='<p class="text-[#6b6359]">Weather data unavailable.</p>';return;}
                var c=d.current;
                var code=c.weather_code||0;
                var icon=ICONS[code]||'🌡️';
                var desc=WMO[code]||'Unknown';
                el.innerHTML=
                    '<div class="flex items-center gap-6 flex-wrap">'+
                    '<div class="flex items-center gap-3">'+
                    '<span class="text-5xl">'+icon+'</span>'+
                    '<div><div class="text-4xl font-bold text-[#2d5a3d]">'+Math.round(c.temperature_2m)+'°C</div>'+
                    '<div class="text-sm text-[#6b6359]">'+desc+'</div></div></div>'+
                    '<div class="flex gap-6 flex-wrap text-sm">'+
                    '<div><div class="text-[#6b6359] text-xs uppercase font-semibold">${feelsLike}</div><div class="font-bold text-[#2d5a3d]">'+Math.round(c.apparent_temperature)+'°C</div></div>'+
                    '<div><div class="text-[#6b6359] text-xs uppercase font-semibold">${windLabel}</div><div class="font-bold text-[#2d5a3d]">'+Math.round(c.wind_speed_10m)+' km/h</div></div>'+
                    '<div><div class="text-[#6b6359] text-xs uppercase font-semibold">${humidityLabel}</div><div class="font-bold text-[#2d5a3d]">'+c.relative_humidity_2m+'%</div></div>'+
                    '<div><div class="text-[#6b6359] text-xs uppercase font-semibold">${precipLabel}</div><div class="font-bold text-[#2d5a3d]">'+c.precipitation+' mm</div></div>'+
                    '</div></div>';
            })
            .catch(function(){el.innerHTML='<p class="text-[#6b6359]">Weather data unavailable. Check back later.</p>';});
        })();
        </script>`;
}

const files = findSpotHtml(path.join(__dirname, 'en')).concat(findSpotHtml(path.join(__dirname, 'fr')));
let updated = 0;

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    if (html.includes('weather-widget')) return;

    const cat = getCategory(f);
    const slug = getSlug(f);
    if (!cat || !allSpots[cat] || !allSpots[cat][slug]) return;

    const spot = allSpots[cat][slug];
    if (!spot.coordinates) return;

    const lang = f.includes('/fr/') ? 'fr' : 'en';
    const widget = buildWeatherWidget(spot, lang);

    // Insert before the "Best Time to Visit" section or before the regulations section
    const bestTimeIdx = html.indexOf('>Best Time to Visit<');
    const meilleureIdx = html.indexOf('>Meilleur moment pour visiter<');
    const targetIdx = bestTimeIdx > -1 ? bestTimeIdx : meilleureIdx;

    if (targetIdx > -1) {
        // Find the start of the section containing "Best Time"
        const sectionStart = html.lastIndexOf('<section', targetIdx);
        if (sectionStart > -1) {
            html = html.slice(0, sectionStart) + widget + '\n        ' + html.slice(sectionStart);
            fs.writeFileSync(f, html);
            updated++;
        }
    }
});

console.log(`Weather widget injected into ${updated} spot pages.`);
