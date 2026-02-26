const fs = require('fs');
const path = require('path');

const SW_SCRIPT = `<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js');}</script>`;

function findHtmlFiles(dir) {
    const results = [];
    for (const item of fs.readdirSync(dir)) {
        if (item === '.git' || item === 'node_modules') continue;
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            results.push(...findHtmlFiles(full));
        } else if (item.endsWith('.html')) {
            results.push(full);
        }
    }
    return results;
}

const files = findHtmlFiles('.');
let updated = 0;

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    if (html.includes('serviceWorker.register')) return;
    if (!html.includes('</body>')) return;

    html = html.replace('</body>', SW_SCRIPT + '\n</body>');
    fs.writeFileSync(f, html);
    updated++;
});

console.log(`Service worker registration injected into ${updated} pages.`);
