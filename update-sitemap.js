const fs = require('fs');
const path = require('path');

const BASE = 'https://outdoorintel.ca';
const TODAY = '2026-03-14';

// Read existing sitemap
let sitemap = fs.readFileSync('sitemap.xml', 'utf8');

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
        const url = `${BASE}/${d}/${f}`;
        if (!sitemap.includes(url)) {
            const isIndex = f === 'index.html';
            const priority = isIndex ? '0.8' : '0.7';
            newEntries += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
        }
    });
});

if (newEntries) {
    sitemap = sitemap.replace('</urlset>', newEntries + '</urlset>');
    fs.writeFileSync('sitemap.xml', sitemap);
    console.log(`Added ${(newEntries.match(/<url>/g) || []).length} new URLs to sitemap.`);
} else {
    console.log('Sitemap already up to date.');
}
