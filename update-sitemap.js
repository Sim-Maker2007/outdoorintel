const fs = require('fs');
const path = require('path');

const BASE = 'https://outdoorintel.ca';
const TODAY = '2026-07-04';
const EXCLUDED_PATHS = new Set([
    'en/provinces/pei.html',
    'en/provinces/yukon-territory.html',
    'en/provinces/newfoundland--labrador.html',
    'fr/provinces/pei.html',
    'fr/provinces/yukon-territory.html',
    'fr/provinces/newfoundland--labrador.html'
]);

// Read existing sitemap
let sitemap = fs.readFileSync('sitemap.xml', 'utf8');
let changed = false;
const beforeCleanup = sitemap;
sitemap = sitemap.replace(/  <url>\n    <loc>https:\/\/outdoorintel\.ca\/(en|fr)\/provinces\/(?:pei|yukon-territory|newfoundland--labrador)<\/loc>\n    <lastmod>[^<]+<\/lastmod>\n    <changefreq>[^<]+<\/changefreq>\n    <priority>[^<]+<\/priority>\n  <\/url>\n/g, '');
sitemap = sitemap.replace(/  <url>\n    <loc>https:\/\/outdoorintel\.ca\/(?:en|fr)\/(?:provinces|guides)\/[^<]+\.html<\/loc>\n    <lastmod>[^<]+<\/lastmod>\n    <changefreq>[^<]+<\/changefreq>\n    <priority>[^<]+<\/priority>\n  <\/url>\n/g, '');
if (sitemap !== beforeCleanup) changed = true;

// Find new pages to add
function findNewPages(dir) {
    const results = [];
    for (const item of fs.readdirSync(dir)) {
        if (item === '.git' || item === 'node_modules' || item === 'data' || item === 'content' || item === 'assets') continue;
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            results.push(...findNewPages(full));
        } else if (item.endsWith('.html')) {
            results.push(full);
        }
    }
    return results;
}

const newDirs = ['en/provinces', 'fr/provinces', 'en/guides', 'fr/guides'];
let newEntries = '';

newDirs.forEach(d => {
    const dir = path.join(__dirname, d);
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
    files.forEach(f => {
        const relative = `${d}/${f}`;
        if (EXCLUDED_PATHS.has(relative)) return;
        const cleanPath = f === 'index.html' ? d : `${d}/${f.replace(/\.html$/, '')}`;
        const url = `${BASE}/${cleanPath}`;
        if (!sitemap.includes(url)) {
            const isIndex = f === 'index.html';
            const priority = isIndex ? '0.8' : '0.7';
            newEntries += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
        }
    });
});

if (newEntries) {
    sitemap = sitemap.replace('</urlset>', newEntries + '</urlset>');
    changed = true;
}

if (changed) {
    fs.writeFileSync('sitemap.xml', sitemap);
    const added = (newEntries.match(/<url>/g) || []).length;
    console.log(added ? `Added ${added} new URLs to sitemap.` : 'Cleaned stale URLs from sitemap.');
} else {
    console.log('Sitemap already up to date.');
}
